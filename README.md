[![Build Status](https://travis-ci.org/benjamintd/mapbox-maps.svg?branch=master)](https://travis-ci.org/benjamintd/mapbox-maps)

# Mapbox Maps

[A user-friendly interface for Mapbox maps](https://maps.benjamintd.com)

![screen shot 2017-03-29 at 5 11 20 pm](https://cloud.githubusercontent.com/assets/11202803/24481982/098cf8f8-14a3-11e7-8f91-c4f8061aece8.png)
------

## Building a map interface from scratch

**tl;dr** Working at a mapping company, I was tired of still opening Google Maps when looking for a place or directions. So I built an minimal, open version of a web map interface. It uses open-source libraries and Mapbox services.

### Why this project?

My day job involves maps. Lots of them. Yet I still open Google Maps on the web whenever I look for a place or need traffic directions. At Mapbox, we have all the building blocks that allow to build this ourselves. My goal was to create a web interface with enough features to be able to switch my personal usage to it completely.

It was also a great way to learn React and Redux, the new Assembly CSS framework, and finally be on the consumer side of the APIs I build at work.

I wanted to show that it's possible to build a great map experience assembling Mapbox legos, in the open, without any tracking.

### Tech

The summary:
- [React](https://facebook.github.io/react/)
- [Redux](http://redux.js.org/)
- [Mapbox GL JS](https://www.mapbox.com/mapbox-gl-js/api/)
- [Assembly.css](https://www.mapbox.com/assembly/)
- [Mapbox Geocoding API](https://www.mapbox.com/api-documentation/#geocoding)
- [Mapbox Directions API](https://www.mapbox.com/api-documentation/#directions)
- [Wikidata SDK](https://github.com/maxlath/wikidata-sdk)

This project was bootstrapped with [`create-react-app`](https://github.com/facebookincubator/create-react-app), which configures all the boring Webpack, Babel, polyfills, etc. for you. Our needs don't require any special configuration, especially because the app that we're building is static - all it does is call Mapbox's and Wikidata's APIs.

I'm using [Redux](http://redux.js.org/) to manage the state, with a middleware component (the [`api-caller`](https://github.com/benjamintd/mapbox-maps/tree/master/src/api-caller)) responsible for all the asynchronous calls.

I used our own [Assembly.css](https://www.mapbox.com/assembly/) framework, which shrinks the main CSS code below 60 lines. I usually don't like CSS, [but I kinda enjoyed using this](http://images.gibertjoseph.com/media/catalog/product/cache/1/image/9df78eab33525d08d6e5fb8d27136e95/i/225/0886919929225_1_75.jpg). It delivers on its promise of making the hard parts of web design easy.

The search bar is a fork from [`react-geocoder`](https://github.com/mapbox/react-geocoder), with minor tweaks to be better integrated in the app. When available, additional POI information is retrieved from Wikidata (images, phone numbers, websites, etc.).

The directions are powered by the [Directions Traffic API](https://www.mapbox.com/api-documentation/#directions) (powered by data pipelines I'm fortunate to build every day). It leverages anonymous data from millions of users to provide the freshest live traffic information, in order to route you around traffic and give you the best ETAs.

### Do it yourself!

This is open-source and MIT licensed. All you need to get this working is a [Mapbox access token](https://www.mapbox.com/help/create-api-access-token/):

```sh
git clone git@github.com:benjamintd/mapbox-maps.git
cd mapbox-maps
npm install
```
Then you should create a `.env` file at the root that contains the following variables:

```sh
REACT_APP_MAPBOX_TOKEN=<your access token>
PUBLIC_URL=https://<your base url>
```

If you deploy to github pages, the url should look something like `https://benjamintd.github.io/mapbox-maps`.

Then you can start the development server with:

```sh
npm start
```

The server will start on port 3000.

Feel free to fork and contribute, or open issues if you notice a bug or missing feature.

### Icons and sprites

The style uses [sprites](https://www.mapbox.com/help/define-sprite/) for icons on the map. The spritesheet is generated automatically from the `styles/icons` directory with the module `@mapbox/spritezero-cli`. If you want to generate a new spritesheet from the icons stored in that directory, run the following commands:

```sh
$ npm run build-sprites
```

The spritesheet is generated automatically when building the project in whole (`npm run build` or `npm run deploy`).

### What's next?

- Adding tests, I've been lazy
- More traffic-related features
- Turn-by-turn directions
- Ads (just kidding)
