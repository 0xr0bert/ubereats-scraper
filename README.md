# ue-scraper


This is now not very easy to use.

You must install fiddler classic for windows (only) and enable https decryption (use google for instructions).

You must visit ubereats.com and open the developer tools of your browser, then you must change the sorting info (e.g., to sort by rating).
You must then find the request to getFeedV1, look at then headers and find the Cookie header, copy the cookie jwt-session=xxxx and update it in the code.
Then run yarn build and yarn locations.
When you see loads of forbidden errors in the logs you need to get a new cookie by visiting the site again.