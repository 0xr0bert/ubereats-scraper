package main

import (
	"os"

	"github.com/ragreener1/scraping/ubereats/coords"
	"github.com/ragreener1/scraping/ubereats/ctor"
	"github.com/ragreener1/scraping/ubereats/restaurants"
	log "github.com/sirupsen/logrus"
)

func init() {
	log.SetFormatter(&log.JSONFormatter{})
	log.SetLevel(log.DebugLevel)
}

func main() {
	arg := os.Args[1]

	switch arg {
	case "coords":
		coords.Scrape()
	case "ctor":
		ctor.Scrape()
	case "restaurants":
		restaurants.Scrape()
	}
}
