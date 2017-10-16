# viaxchtest

This is a test harness for the viabtc exchange backend (https://github.com/viabtc/viabtc_exchange_server). It allows one to somewhat easily test the JSON-RPC interface to the accesshttp server.

## Requirements

* npm
* browserify ("npm install browserify -g")

## Installation

* clone this repository
* run "npm install" to install all the javascript dependencies
* run "npm run build" to generate the javascript in "build/app.js"
* open index.html (you will need to switch off [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) enforcement in your browser
