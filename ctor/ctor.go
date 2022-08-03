package ctor

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gocolly/colly"
	"github.com/gocolly/colly/proxy"
	_ "github.com/lib/pq"
	log "github.com/sirupsen/logrus"
)

func Scrape() {
	db, err := sql.Open("postgres", "user=robert dbname=ubereats-scraping sslmode=disable")

	if err != nil {
		panic(err)
	}

	var wg sync.WaitGroup
	resultChan := make(chan dbStruct, 1000)

	wg.Add(1)
	go func(db *sql.DB, resultChan chan dbStruct) {
		insertToDB(db, resultChan)
		wg.Done()
	}(db, resultChan)

	// Create collector
	c := colly.NewCollector(
		colly.Async(true),
	)
	c.Limit(&colly.LimitRule{DomainGlob: "*", Parallelism: 2, RandomDelay: 500 * time.Millisecond})

	rp, err := proxy.RoundRobinProxySwitcher(
		"https://robertgreener%40protonmail.ch:Repose5-Defrost-Engraving-Gander@uk2150.nordvpn.com:89",
		"https://robertgreener%40protonmail.ch:Repose5-Defrost-Engraving-Gander@uk1784.nordvpn.com:89",
		"https://robertgreener%40protonmail.ch:Repose5-Defrost-Engraving-Gander@uk1894.nordvpn.com:89",
	)

	if err != nil {
		panic(err)
	}
	c.SetProxyFunc(rp)

	c.OnRequest(func(r *colly.Request) {
		log.WithField("url", r.URL.String()).Debug("Visiting")
	})

	c.OnError(func(r *colly.Response, err error) {
		log.WithFields(log.Fields{
			"url":      r.Request.URL.String(),
			"response": r,
			"err":      err,
		}).Error("Failed")
	})

	c.OnResponse(func(r *colly.Response) {
		//log.Debug(string(r.Body))
		var resp Response
		err := json.Unmarshal(r.Body, &resp)

		if err != nil {
			panic(err)
		}

		if resp.Status != "success" {
			log.WithFields(log.Fields{
				"postcode": r.Ctx.Get("postcode"),
				"status":   resp.Status,
			}).Fatal()
		}

		for _, item := range resp.Data.FeedItems {
			log.WithField("uuid", item.Store.StoreUUID).Debug("Found restaurant")
			resultChan <- dbStruct{
				customer_id:   r.Ctx.Get("postcode"),
				restaurant_id: item.Store.StoreUUID,
			}
		}

		if resp.Meta.HasMore {
			c.Request(
				"POST",
				"https://www.ubereats.com/api/getFeedV1?localeCode=gb",
				strings.NewReader(`{"pageInfo": {"offset":`+fmt.Sprint(resp.Meta.Offset)+`, "pageSize":80}}`),
				r.Ctx,
				*r.Headers,
			)
		}
	})

	rows, err := db.Query("select postcode, latitude, longitude from customers")
	if err != nil {
		panic(err)
	}

	var postcode string
	var lat float64
	var lon float64

	for rows.Next() {
		err := rows.Scan(&postcode, &lat, &lon)

		if err != nil {
			panic(err)
		}

		ctx := colly.NewContext()
		ctx.Put("postcode", postcode)

		hdr := make(http.Header)
		hdr.Add("x-csrf-token", "x")
		hdr.Add("Content-Type", "application/json")
		hdr.Add("Cookie", "uev2.loc=%7B%22latitude%22%3A"+fmt.Sprintf("%f", lat)+"%2C%22longitude%22%3A"+fmt.Sprintf("%f", lon)+"%7D")

		c.Request(
			"POST",
			"https://www.ubereats.com/api/getFeedV1?localeCode=gb",
			nil,
			ctx,
			hdr,
		)
	}

	c.Wait()

	close(resultChan)
	wg.Wait()
	db.Close()
}

type dbStruct struct {
	customer_id   string
	restaurant_id string
}

func insertToDB(db *sql.DB, c <-chan dbStruct) {
	stmt, err := db.Prepare("insert into customers_to_restaurants(customer_id, restaurant_id) values ($1, $2)")

	if err != nil {
		panic(err)
	}

	for entry := range c {
		_, err = stmt.Exec(entry.customer_id, entry.restaurant_id)
		if err != nil {
			panic(err)
		}
	}

	stmt.Close()
}

type Response struct {
	Status string `json:"success"`
	Data   struct {
		FeedItems []struct {
			Store struct {
				StoreUUID string `json:"storeUuid"`
			} `json:"store"`
		} `json:"feedItems"`
	} `json:"data"`
	Meta struct {
		Offset  int  `json:"offset"`
		HasMore bool `json:"hasMore"`
	} `json:"meta"`
}
