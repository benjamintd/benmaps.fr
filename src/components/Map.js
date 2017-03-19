import React, { Component } from 'react';
import {connect} from 'react-redux';
import mapboxgl from 'mapbox-gl/dist/mapbox-gl';
import turfBbox from '@turf/bbox';
import turfBboxPolygon from '@turf/bbox-polygon';
import turfBuffer from '@turf/buffer';
import turfDistance from '@turf/distance';
import geolocationIcon from '../assets/geolocation.svg';
import fromLocationIcon from '../assets/fromLocation.svg'
import {setZoom, setCenter, setStateValue, setUserLocation, getRoute} from '../actions/index'

class MapComponent extends Component {
  render() {
    return (
      <div id='map' className='viewport-full'>
      </div>
    );
  }

  componentDidMount() {
    mapboxgl.accessToken = this.props.accessToken;

    const map = new mapboxgl.Map({
        container: 'map',
        style: this.props.style,
        center: this.props.center,
        zoom: this.props.zoom,
        minZoom: 2,
        maxZoom: 21
    });

    this.map = map;

    map.on('moveend', () => {
      const center = map.getCenter();
      this.props.setCenter([center.lng, center.lat]);
      this.props.setZoom(map.getZoom());
    });

    // Create marker for geolocation
    const geolocationElement = document.createElement('div');
    geolocationElement.className = 'geolocation flex-parent flex-parent--center-cross flex-parent--center-main w42 h42';
    geolocationElement.innerHTML = '<img src="' + geolocationIcon + '"/>';
    const geolocation = new mapboxgl.Marker(geolocationElement);


    // Create marker for search results
    const markerElement = document.createElement('div');
    markerElement.className = 'marker flex-parent flex-parent--center-cross flex-parent--center-main w42 h42';
    markerElement.innerHTML = '<svg class="icon icon--l color-red-dark"><use xlink:href="#icon-marker"></use></svg>';
    const marker = new mapboxgl.Marker(markerElement);

    // Create marker for From location
    const fromElement = document.createElement('div');
    fromElement.className = 'geolocation flex-parent flex-parent--center-cross flex-parent--center-main w42 h42';
    fromElement.innerHTML = '<img src="' + fromLocationIcon + '"/>';
    const fromMarker = new mapboxgl.Marker(fromElement);


    // helper to set geolocation
    const setGeolocation = (data) => {
      const coords = [data.coords.longitude, data.coords.latitude];
      geolocation.setLngLat(coords).addTo(map);
      this.props.setUserLocation(coords);
      this.moveTo({type: 'Feature', geometry: {type: 'Point', coordinates: coords}, properties: {}}, 13);
    }

    // Create geolocation control
    const geolocateControl = new mapboxgl.GeolocateControl();
    geolocateControl.on('geolocate', setGeolocation);
    map.addControl(geolocateControl, 'bottom-right');

    // Initial ask for location and display on the map
    if (this.props.userLocation) {
      const coords = this.props.userLocation.geometry.coordinates;
      geolocation.setLngLat(coords).addTo(map);
      this.moveTo(this.props.userLocation, 13);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(setGeolocation);
    }

    // Regularly poll the user location and update the map
    setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((data) => {
          const coords = [data.coords.longitude, data.coords.latitude];
          geolocation.setLngLat(coords).addTo(map);
          this.props.setUserLocation(coords);
        });
      }
    }, 10000);

    // Create geojson source for the route
    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
        });

        map.addLayer({
          'id': 'route',
          'source': 'route',
          'type': 'line',
          'paint': {
            'line-color': '#2abaf7',
            'line-width': 5.5
          },
          'layout': {
            'line-join': 'round',
            'line-cap': 'round'
          },
        }, 'bridge-oneway-arrows-white');

        map.addLayer({
          'id': 'route-casing',
          'source': 'route',
          'type': 'line',
          'paint': {
            'line-color': '#2779b5',
            'line-width': 6.5
          },
          'layout': {
            'line-join': 'round',
            'line-cap': 'round'
          },
        }, 'route');

    });

    // store variables at the MapComponent level
    this.marker = marker;
    this.fromMarker = fromMarker
  }

  componentDidUpdate() {
    if (!this.props.needMapUpdate) return;

    // Search mode
    if (this.props.mode === 'search') {
      if (this.props.searchLocation) {
        this.marker.setLngLat(this.props.searchLocation.geometry.coordinates).addTo(this.map);
      } else {
        this.marker.remove();
      }
    }

    // Directions mode
    if (this.props.mode === 'directions') {
      if (this.props.directionsFrom) {
        this.fromMarker.setLngLat(this.props.directionsFrom.geometry.coordinates).addTo(this.map);
      } else {
        this.fromMarker.remove();
      }

      if (this.props.directionsTo) {
        this.marker.setLngLat(this.props.directionsTo.geometry.coordinates).addTo(this.map);
      } else {
        this.marker.remove();
      }

      if (this.props.route) {
        this.map.getSource('route').setData(this.props.route.geometry);
      } else {
        this.map.getSource('route').setData({
          type: 'FeatureCollection',
          features: []
        });
      }

      // We have origin and destination but no route yet
      if (this.props.directionsFrom && this.props.directionsTo && !this.props.route) {
        // Do not retry when the previous request errored
        if (this.props.routeStatus !== 'error') {
          // Trigger the API call to directions
          this.props.getRoute(
            this.props.directionsFrom,
            this.props.directionsTo,
            this.props.modality,
            this.props.accessToken
          );
        }
      }
    }

    if (this.props.needMapRepan) {
      // Search mode
      if (this.props.mode === 'search') {
        this.moveTo(this.props.searchLocation);
      }

      // Directions mode
      if (this.props.mode === 'directions') {
        if (this.props.route) {
          const bbox = turfBbox(this.props.route.geometry);
          this.moveTo({bbox: bbox});

        } else if (this.props.directionsTo && this.props.directionsFrom) {
          const bbox = turfBbox({
            type: 'FeatureCollection',
            features: [this.props.directionsFrom, this.props.directionsTo]
          });
          this.moveTo({bbox: bbox});

        } else {
          // Whichever exists
          this.moveTo(this.props.directionsTo);
          this.moveTo(this.props.directionsFrom);
        }
      }
    }

    this.props.setStateValue('needMapUpdate', false);
    this.props.setStateValue('needMapRepan', false);
  }

  moveTo(location, zoom) {
    if (!location) return;
    if (location.bbox) { // We have a bbox to fit to
      const distance = turfDistance([location.bbox[0], location.bbox[1]], [location.bbox[2], location.bbox[3]]);
      const buffered = turfBuffer(turfBboxPolygon(location.bbox), distance / 2, 'kilometers');
      const bbox = turfBbox(buffered);
      try {
        this.map.fitBounds(bbox, {linear: true});
      } catch (e) {
        this.map.fitBounds(location.bbox, {linear: true});
      }
    } else { // We just have a point
      this.map.easeTo({
        center: location.geometry.coordinates,
        zoom: zoom || 16
      });
    }
  }
}

MapComponent.propTypes = {
  accessToken: React.PropTypes.string,
  style: React.PropTypes.string,
  center: React.PropTypes.array,
  zoom: React.PropTypes.number,
  setCenter: React.PropTypes.func,
  setZoom: React.PropTypes.func,
  map: React.PropTypes.object,
  mode: React.PropTypes.string,
  route: React.PropTypes.object,
  userLocation: React.PropTypes.object,
  routeStatus: React.PropTypes.string,
  searchLocation: React.PropTypes.object,
  directionsFrom: React.PropTypes.object,
  directionsTo: React.PropTypes.object,
  modality: React.PropTypes.string,
  needMapUpdate: React.PropTypes.bool,
  needMapRepan: React.PropTypes.bool,
  setStateValue: React.PropTypes.func,
  setUserLocation: React.PropTypes.func,
  getRoute: React.PropTypes.func
}

const mapStateToProps = (state) => {
  return {
    accessToken: state.mapboxAccessToken,
    style: state.mapStyle,
    center: state.mapCenter,
    zoom: state.mapZoom,
    searchLocation: state.searchLocation,
    directionsFrom: state.directionsFrom,
    directionsTo: state.directionsTo,
    userLocation: state.userLocation,
    modality: state.modality,
    mode: state.mode,
    needMapUpdate: state.needMapUpdate,
    needMapRepan: state.needMapRepan,
    route: state.route,
    routeStatus: state.routeStatus
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setCenter: (coordinates) => dispatch(setCenter(coordinates)),
    setZoom: (zoom) => dispatch(setZoom(zoom)),
    setStateValue: (key, value) => dispatch(setStateValue(key, value)),
    setUserLocation: (coordinates) => dispatch(setUserLocation(coordinates)),
    getRoute: (directionsFrom, directionsTo, modality, accessToken) => dispatch(getRoute(directionsFrom, directionsTo, modality, accessToken))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MapComponent);
