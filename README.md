[![Build Status](https://travis-ci.org/benjamintd/ben-maps.svg?branch=master)](https://travis-ci.org/benjamintd/ben-maps)

# Ben Maps

[Web maps that don't track you](https://maps.benjamintd.com)

## ![Screen shot](https://repository-images.githubusercontent.com/84752763/d3f2bc00-62d4-11e9-9c1a-d95bc8156386)

### Why this project?

My day job involves maps. Lots of them. Yet I still open Google Maps on the web whenever I look for a place or need traffic directions. My goal was to create a web interface with enough features to be able to switch my personal usage to it completely, using Mapbox APIs. I wanted to show that it's possible to build a great map experience assembling Mapbox legos, in the open, without any tracking.

### Tech

- [React](https://facebook.github.io/react/)
- [Redux](http://redux.js.org/)
- [Mapbox GL JS](https://www.mapbox.com/mapbox-gl-js/api/)
- [Assembly.css](https://www.mapbox.com/assembly/)
- [Mapbox Geocoding API](https://www.mapbox.com/api-documentation/#geocoding)
- [Mapbox Directions API](https://www.mapbox.com/api-documentation/#directions)
- [Wikidata SDK](https://github.com/maxlath/wikidata-sdk)

This project was bootstrapped with [`create-react-app`](https://github.com/facebookincubator/create-react-app).

I'm using [Redux](http://redux.js.org/) to manage the state, with a middleware component (the [`api-caller`](https://github.com/benjamintd/mapbox-maps/tree/master/src/api-caller)) responsible for all the asynchronous calls.

I use [Assembly.css](https://www.mapbox.com/assembly/) for styling, which shrinks the main CSS code below 60 lines.

The search bar is a fork from [`react-geocoder`](https://github.com/mapbox/react-geocoder), with minor tweaks to be better integrated in the app. When available, additional POI information is retrieved from Wikidata (images, phone numbers, websites, etc.).

The directions are powered by the [Directions Traffic API](https://www.mapbox.com/api-documentation/#directions). It leverages anonymous data from millions of users to provide the freshest live traffic information, in order to route you around traffic and give you the best ETAs.

### Deployment

This app is deployed with [Now](https://zeit.co/now).

### Map Style and sprites

The sprites and glyphs are hosted on the Mapbox infrastructure.

### What's next?

- Adding tests, I've been lazy
- More traffic-related features
- Turn-by-turn directions
- Ads (just kidding)
