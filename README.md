# Mapbox Maps

[A Google-like interface for Mapbox maps](https://benjamintd.github.io/mapbox-maps/)

[<img width="600" alt="Mapbox Maps" src="https://cloud.githubusercontent.com/assets/11202803/24183171/ef155710-0e83-11e7-8f43-4eaa0a890c7f.png">](https://benjamintd.github.io/mapbox-maps/)

------

## Weekend project: building Google Maps from scratch

**tl;dr** Working at a mapping company, I was tired of still opening Google maps when looking for a place or directions. So I built an minimal, open version of Google Maps web. It uses open-source libraries and Mapbox services.

### Why this project?

My day job involves maps. Lots of them. Yet I still open Google Maps on the web whenever I look for a place or need traffic directions. At Mapbox, we have all the building blocks that allow to build this ourselves, so I decided to go for it. My goal was to create a web application as close to Google's as possible, with enough features to be able to switch my personal usage to it completely.

It was also a great way to learn React and Redux, the new Assembly CSS framework, and finally be on the consumer side of the APIs I build at work.

The cartography, colors, markers, and overall design has been intentionally chosen to match Google's. Although I'm probably infringing on a few [design patents](http://pdfpiw.uspto.gov/50/209/D06/1.pdf), this is intended as a tribute more than anything.

I think Google Maps is one of the most transformative and best designed tech around - both on web and mobile. I wanted to show that it's possible to build a similar experience assembling Mapbox legos, from scratch, in a few days.

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

The directions are powered by the [Directions Traffic API](https://www.mapbox.com/api-documentation/#directions) (which I'm very proud to be working on day to day). It leverages anonymous data from millions of users to provide the freshest live traffic information, in order to route you around traffic and give you the best ETAs.

### Do it yourself!

This is open-source and MIT licensed. All you need to get this working is a [Mapbox token](https://www.mapbox.com/help/create-api-access-token/).

```sh
git clone git@github.com:benjamintd/mapbox-maps.git
cd mapbox-maps
echo "export REACT_APP_MAPBOX_TOKEN=<your access token>" > .env
npm install
npm start
```

Feel free to fork and contribute, or open issues if you notice a bug of missing feature.

### What's next?

- Adding tests, I've been lazy
- More traffic-related features
- Ads (just kidding)
