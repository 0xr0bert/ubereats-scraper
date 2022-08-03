package restaurants

import (
	"bytes"
	"database/sql"
	"encoding/json"
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

	var wg sync.WaitGroup
	sem := make(chan int, 100)

	c.OnResponse(func(r *colly.Response) {
		wg.Add(1)
		sem <- 1

		go func(db *sql.DB, r *colly.Response) {
			defer wg.Done()
			processResponse(db, r)
			<-sem
		}(db, r)
	})

	rows, err := db.Query(
		"select distinct restaurant_id from customers_to_restaurants t1 " +
			"left join restaurants t2 " +
			"on t1.restaurant_id = t2.id " +
			"where t2.id is null",
	)
	if err != nil {
		panic(err)
	}

	var restaurant_id string

	for rows.Next() {
		err := rows.Scan(&restaurant_id)

		if err != nil {
			panic(err)
		}

		ctx := colly.NewContext()
		ctx.Put("restaurant_id", restaurant_id)

		hdr := make(http.Header)
		hdr.Add("x-csrf-token", "x")
		hdr.Add("Content-Type", "application/json")

		c.Request(
			"POST",
			"https://www.ubereats.com/api/getStoreV1?localeCode=en-GB",
			strings.NewReader(`{"storeUuid": "`+restaurant_id+`"}`),
			ctx,
			hdr,
		)
	}

	c.Wait()

	wg.Wait()

	db.Close()
}

func processResponse(db *sql.DB, r *colly.Response) {
	var response Response

	err := json.Unmarshal(r.Body, &response)

	if err != nil {
		panic(err)
	}

	if response.Status != "success" {
		log.WithFields(log.Fields{
			"status": response.Status,
			"body":   string(r.Body),
		}).Error()
		return
	}

	var metaJSON MetaJSON

	err = json.Unmarshal([]byte(response.Data.MetaJSON), &metaJSON)

	if err != nil {
		panic(err)
	}

	stmt, err := db.Prepare(
		"insert into restaurants(id, name, url, address__street, address__locality," +
			"address__region, address__country, address__postcode, latitude, longitude," +
			"telephone, rating_value, review_count, price_range, delivery_available," +
			"collection_available, is_delivery_bandwagon, is_delivery_over_the_top," +
			"is_delivery_third_party) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10," +
			"$11, $12, $13, $14, $15, $16, $17, $18, $19)",
	)

	if err != nil {
		panic(err)
	}

	deliveryAvailable := false
	collectionAvailable := false

	for _, elem := range response.Data.SupportedDiningModes {
		switch elem.Mode {
		case "DELIVERY":
			deliveryAvailable = elem.IsAvailable
		case "PICKUP":
			collectionAvailable = elem.IsAvailable
		}
	}

	_, err = stmt.Exec(
		response.Data.UUID,
		response.Data.Title,
		metaJSON.URL,
		response.Data.Location.StreetAddress,
		response.Data.Location.City,
		response.Data.Location.Region,
		response.Data.Location.Country,
		response.Data.Location.PostalCode,
		response.Data.Location.Latitude,
		response.Data.Location.Longitude,
		response.Data.PhoneNumber,
		response.Data.Rating.RatingValue,
		response.Data.Rating.ReviewCount,
		response.Data.PriceBucket,
		deliveryAvailable,
		collectionAvailable,
		response.Data.IsDeliveryBandwagon,
		response.Data.IsDeliveryOverTheTop,
		response.Data.IsDeliveryThirdParty,
	)

	if err != nil {
		panic(err)
	}

	stmt.Close()

	stmt, err = db.Prepare(
		"insert into restaurant_opening_hours(day, opening_time, closing_time, restaurant_id)" +
			"values ($1, $2, $3, $4)",
	)

	if err != nil {
		panic(err)
	}

	for _, elem := range metaJSON.OpeningHoursSpecification {
		// layout := "15:4"
		// opening, err := time.Parse(layout, elem.Opens)

		// if err != nil {
		// 	panic(err)
		// }

		// closing, err := time.Parse(layout, elem.Closes)

		// if err != nil {
		// 	panic(err)
		// }

		if bytes.HasPrefix(bytes.TrimSpace(elem.DayOfWeek), []byte{'['}) {
			var daysOfWeek []string
			if err := json.Unmarshal(elem.DayOfWeek, &daysOfWeek); err != nil {
				panic(err)
			}

			for _, dayOfWeek := range daysOfWeek {

				_, err = stmt.Exec(dayOfWeek, elem.Opens, elem.Closes, response.Data.UUID)

				if err != nil {
					panic(err)
				}
			}
		} else {
			var dayOfWeek string
			if err := json.Unmarshal(elem.DayOfWeek, &dayOfWeek); err != nil {
				panic(err)
			}

			if _, err = stmt.Exec(dayOfWeek, elem.Opens, elem.Closes, response.Data.UUID); err != nil {
				panic(err)
			}
		}
	}

	stmt.Close()

	stmt1, err := db.Prepare("insert into menu_categories (id, name, restaurant_id) values ($1, $2, $3)")

	if err != nil {
		panic(err)
	}

	stmt2, err := db.Prepare(
		"insert into items_to_menu_categories (item_id, restaurant_id, menu_category_id)" +
			"values ($1, $2, $3)",
	)

	if err != nil {
		panic(err)
	}

	for _, menuCategory := range response.Data.SubsectionsMap {
		_, err = stmt1.Exec(
			menuCategory.UUID,
			menuCategory.Title,
			response.Data.UUID,
		)

		if err != nil {
			panic(err)
		}

		for _, itemUUID := range menuCategory.ItemUUIDs {
			_, err = stmt2.Exec(
				itemUUID,
				response.Data.UUID,
				menuCategory.UUID,
			)

			if err != nil {
				panic(err)
			}
		}
	}

	stmt1.Close()
	stmt2.Close()

	stmt, err = db.Prepare(
		"insert into items(id, restaurant_id, name, price, description, image_url) values ($1, $2, $3, $4, $5, $6) on conflict do nothing",
	)

	if err != nil {
		panic(err)
	}

	for _, outer := range response.Data.SectionEntitiesMap {
		for _, item := range outer {
			_, err = stmt.Exec(
				item.UUID,
				response.Data.UUID,
				item.Title,
				item.Price/100,
				item.Description,
				item.ImageURL,
			)

			if err != nil {
				panic(err)
			}
		}
	}

	stmt.Close()

	stmt1, err = db.Prepare("insert into cuisines(name) values ($1) on conflict do nothing")

	if err != nil {
		panic(err)
	}

	stmt2, err = db.Prepare("insert into cuisines_to_restaurants(cuisine_id, restaurant_id) values ($1, $2) on conflict do nothing")

	if err != nil {
		panic(err)
	}

	for _, cuisine := range response.Data.CuisineList {
		_, err = stmt1.Exec(cuisine)

		if err != nil {
			panic(err)
		}

		_, err = stmt2.Exec(cuisine, response.Data.UUID)

		if err != nil {
			panic(err)
		}
	}

	stmt1.Close()
	stmt2.Close()
}

type Response struct {
	Status string `json:"status"`
	Data   struct {
		UUID     string `json:"uuid"`
		Title    string `json:"title"`
		MetaJSON string `json:"metaJson"`
		Location struct {
			Address       string  `json:"address"`
			StreetAddress string  `json:"streetAddress"`
			City          string  `json:"city"`
			Country       string  `json:"country"`
			PostalCode    string  `json:"postalCode"`
			Region        string  `json:"region"`
			Latitude      float64 `json:"latitude"`
			Longitude     float64 `json:"longitude"`
		} `json:"location"`
		PhoneNumber string `json:"phoneNumber"`
		Rating      struct {
			RatingValue float64 `json:"ratingValue"`
			ReviewCount string  `json:"reviewCount"`
		} `json:"rating"`
		PriceBucket          string `json:"priceBucket"`
		SupportedDiningModes []struct {
			Mode        string `json:"mode"`
			Title       string `json:"title"`
			IsAvailable bool   `json:"isAvailable"`
		} `json:"supportedDiningModes"`
		IsDeliveryBandwagon  bool     `json:"isDeliveryBandwagon"`
		IsDeliveryOverTheTop bool     `json:"isDeliveryOverTheTop"`
		IsDeliveryThirdParty bool     `json:"isDeliveryThirdParty"`
		CuisineList          []string `json:"cuisineList"`
		SubsectionsMap       map[string]struct {
			UUID      string   `json:"uuid"`
			Title     string   `json:"title"`
			ItemUUIDs []string `json:"itemUuids"`
		} `json:"subsectionsMap"`
		SectionEntitiesMap map[string]map[string]struct {
			UUID        string  `json:"uuid"`
			Title       string  `json:"title"`
			Price       float64 `json:"price"`
			Description string  `json:"description"`
			ImageURL    string  `json:"imageUrl"`
		} `json:"sectionEntitiesMap"`
	} `json:"data"`
}

type MetaJSON struct {
	URL                       string `json:"@id"`
	OpeningHoursSpecification []struct {
		DayOfWeek json.RawMessage `json:"dayOfWeek"`
		Opens     string          `json:"opens"`
		Closes    string          `json:"closes"`
	} `json:"openingHoursSpecification"`
}
