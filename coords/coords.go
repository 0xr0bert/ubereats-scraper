package coords

import (
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gocolly/colly"
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
	c.OnRequest(func(r *colly.Request) {
		log.WithField("url", r.URL.String()).Debug("Visiting")
	})

	c.OnResponse(func(r *colly.Response) {
		response := strings.Split(strings.Split(string(r.Body), "\n")[0], "	")

		lat, err := strconv.ParseFloat(response[1], 64)

		if err != nil {
			panic(err)
		}

		lon, err := strconv.ParseFloat(response[2], 64)

		if err != nil {
			panic(err)
		}

		_, err = db.Exec("update customers set latitude = $1, longitude = $2 where postcode = $3", lat, lon, response[0])

		if err != nil {
			panic(err)
		}

		log.Debug(fmt.Sprintf("%s, %v, %v", response[0], response[1], response[2]))
	})

	rows, err := db.Query("select postcode from customers")
	if err != nil {
		panic(err)
	}

	var postcode string

	for rows.Next() {
		err = rows.Scan(&postcode)

		if err != nil {
			panic(err)
		}

		c.Visit(fmt.Sprintf("https://www.doogal.co.uk/GetPostcode.ashx?postcode=%s", postcode))

	}

	c.Wait()
}
