import wdk from "wikidata-sdk/dist/wikidata-sdk.js";
import _ from "lodash";
import md5 from "blueimp-md5";

const apiCaller = store => next => action => {
  // eslint-disable-line

  switch (action.type) {
    case "GET_ROUTE": {
      getRoute(action, next);
      break;
    }

    case "GET_PLACE_INFO": {
      next({
        type: "SET_STATE_VALUE",
        key: "placeInfo",
        value: {
          description: _.get(action, "feature.properties.type"),
          label: _.get(action, "feature.properties.name"),
          image: { thumb: "", full: "" }
        }
      });
      if (action.feature.properties.wikidata) {
        getWikidataPlaceInfo(action, next);
        break;
      } else {
        getMapillaryPlaceInfo(action, next);
        break;
      }
    }

    case "GET_REVERSE_GEOCODE": {
      getReverseGeocode(action, next);
      break;
    }

    default:
      next(action); // let through as default
      break;
  }

  return;
};

export default apiCaller;

function getRoute(action, next) {
  next({
    type: "SET_STATE_VALUE",
    key: "routeStatus",
    value: "pending"
  });

  const baseUrl = "https://api.mapbox.com/directions/v5/mapbox/";

  let profile = "driving-traffic"; // default
  let annotationsParam = "";
  if (action.modality === "car") {
    profile = "driving-traffic";
    annotationsParam = "&annotations=congestion";
  }
  if (action.modality === "bike") profile = "cycling";
  if (action.modality === "walk") profile = "walking";

  const fromCoordinates = action.directionsFrom.geometry.coordinates.join(",");
  const toCoordinates = action.directionsTo.geometry.coordinates.join(",");

  const url =
    baseUrl +
    profile +
    "/" +
    fromCoordinates +
    ";" +
    toCoordinates +
    "?access_token=" +
    action.accessToken +
    "&overview=full" +
    annotationsParam;

  // Fetch
  fetch(url, { method: "get" })
    .then(res => {
      if (res.ok) {
        return res.json();
      } else {
        // 4xx or 5xx response
        var err = new Error(res.statusText);
        return Promise.reject(err);
      }
    })
    .then(data => {
      if (data.code !== "Ok") return Promise.reject();
      else {
        // Success
        next({
          type: "SET_ROUTE",
          data: data
        });
        next({
          type: "SET_STATE_VALUE",
          key: "routeStatus",
          value: "idle"
        });
        next({
          type: "TRIGGER_MAP_UPDATE",
          latestMapRepan: Date.now()
        });

        return Promise.resolve();
      }
    })
    .catch(() =>
      next({
        type: "SET_STATE_VALUE",
        key: "routeStatus",
        value: "error"
      })
    );
}

function getWikidataPlaceInfo(action, next) {
  const id = action.feature.properties.wikidata;
  const url = wdk.getEntities({
    ids: id,
    languages: ["en"]
  });

  fetch(url, { method: "get" })
    .then(res => {
      if (res.ok) {
        return res.json();
      } else {
        // 4xx or 5xx response
        var err = new Error(res.statusText);
        return Promise.reject(err);
      }
    })
    .then(data => {
      // Success
      const entity = data.entities[id];
      const claims = wdk.simplifyClaims(entity.claims);
      const description = entity.descriptions.en.value;
      const label = entity.labels.en.value;
      next({
        type: "SET_STATE_VALUE",
        key: "placeInfo",
        value: {
          description,
          label,
          image: getWikiMediaImageUrl(_.get(claims, "P18[0]")),
          phoneNumber: _.get(claims, "P1329[0]"),
          website: _.get(claims, "P856[0]"),
          address: _.get(claims, "P969[0]"),
          wikidata: id
        }
      });
    })
    .catch(() => {});
}

async function getMapillaryPlaceInfo(action, next) {
  const coordinates = action.feature.geometry.coordinates;

  const url = `https://a.mapillary.com/v3/images?client_id=${
    process.env.REACT_APP_MAPILLARY_CLIENT_ID
  }&closeto=${coordinates.join(",")}&lookat=${coordinates.join(
    ","
  )}&pano=false&per_page=5`;

  try {
    const res = await fetch(url, { method: "get" });
    if (res.ok) {
      const fc = await res.json();
      let key = fc.features[0].properties.key;
      next({
        type: "SET_STATE_VALUE",
        key: "placeInfo",
        value: {
          description: action.feature.properties.type,
          label: action.feature.properties.name,
          image: {
            thumb: `https://images.mapillary.com/${key}/thumb-640.jpg`,
            full: `https://images.mapillary.com/${key}/thumb-1024.jpg`
          }
        }
      });
    } else throw new Error(res.statusText);
  } catch (error) {}
}

function getReverseGeocode(action, next) {
  if (!action.coordinates) {
    return;
  }

  const url =
    "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
    action.coordinates.join(",") +
    ".json" +
    "?access_token=" +
    action.accessToken;

  next({
    type: "SET_STATE_VALUE",
    key: action.key,
    value: {
      place_name: "__loading",
      geometry: {
        type: "Point",
        coordinates: action.coordinates
      }
    }
  });

  fetch(url, { method: "get" })
    .then(res => {
      if (res.ok) {
        return res.json();
      } else {
        // 4xx or 5xx response
        var err = new Error(res.statusText);
        return Promise.reject(err);
      }
    })
    .then(data => {
      // Success
      if (data.features && data.features.length > 0) {
        console.log(data.features[0]);
        return next({
          type: "SET_STATE_VALUE",
          key: action.key,
          value: {
            place_name: data.features[0].place_name,
            geometry: {
              type: "Point",
              coordinates: action.coordinates
            },
            type: "Feature",
            properties: {
              name: data.features[0].text
            }
          }
        });
      } else return Promise.reject();
    })
    .catch(() => {
      next({
        type: "SET_STATE_VALUE",
        key: action.key,
        value: {
          place_name: "Dropped pin",
          geometry: {
            type: "Point",
            coordinates: action.coordinates
          }
        }
      });
    });
}

function getWikiMediaImageUrl(claim) {
  // see https://commons.wikimedia.org/wiki/Commons:FAQ for how images are stored
  if (claim) {
    const imageName = claim.replace(/ /g, "_");
    const baseUrl = "https://upload.wikimedia.org/wikipedia/commons/";
    const hash = md5(imageName);
    const thumb =
      baseUrl +
      "thumb/" +
      hash[0] +
      "/" +
      hash.slice(0, 2) +
      "/" +
      imageName +
      "/640px-" +
      imageName;
    const full = baseUrl + hash[0] + "/" + hash.slice(0, 2) + "/" + imageName;
    return {
      thumb,
      full
    };
  } else
    return {
      thumb: "",
      full: ""
    };
}
