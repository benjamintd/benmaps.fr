import React, { Component } from 'react';
import {connect} from 'react-redux';
import mapboxgl from 'mapbox-gl/dist/mapbox-gl';
import turfBbox from '@turf/bbox';
import turfBboxPolygon from '@turf/bbox-polygon';
import turfBuffer from '@turf/buffer';
import turfDistance from '@turf/distance';
import {setZoom, setCenter, setStateValue, setUserLocation} from '../actions/index'

class MapComponent extends Component {
  render() {
    return (
      <div id='map' className='relative viewport-full'>
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
        minZoom: 2
    });

    map.on('moveend', () => {
      const center = map.getCenter();
      this.props.setCenter([center.lng, center.lat]);
      this.props.setZoom(map.getZoom());
    });

    // Create marker for geolocation
    const geolocationElement = document.createElement('div');
    geolocationElement.className = 'geolocation flex-parent flex-parent--center-cross flex-parent--center-main w42 h42';
    geolocationElement.innerHTML = '<img src="./geolocation.svg"/>';

    const geolocation = new mapboxgl.Marker(geolocationElement);

    // helper to set geolocation
    const setGeolocation = (data) => {
      const coords = [data.coords.longitude, data.coords.latitude]
      geolocation.setLngLat(coords).addTo(map);
      this.props.setUserLocation(coords);
    }

    // Create geolocation control
    const geolocateControl = new mapboxgl.GeolocateControl();
    geolocateControl.on('geolocate', setGeolocation);
    map.addControl(geolocateControl, 'bottom-right');

    // Initial ask for location and display on the map
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(setGeolocation);
    }

    // Create marker for search results
    const markerElement = document.createElement('div');
    markerElement.className = 'marker flex-parent flex-parent--center-cross flex-parent--center-main w42 h42';
    markerElement.innerHTML = '<svg class="icon icon--l color-red-dark"><use xlink:href="#icon-marker"></use></svg>';

    const marker = new mapboxgl.Marker(markerElement);

    // Create marker for From location
    const fromElement = document.createElement('div');
    fromElement.className = 'geolocation flex-parent flex-parent--center-cross flex-parent--center-main w42 h42';
    fromElement.innerHTML = '<img src="./fromLocation.svg"/>';

    const fromMarker = new mapboxgl.Marker(fromElement);

    // store variables at the MapComponent level
    this.map = map;
    this.marker = marker;
    this.fromMarker = fromMarker
  }

  componentDidUpdate() {
    if (!this.props.needMapUpdate) return;

    if (this.props.searchLocation && !this.marker._map) { // We have a new search location (=> and no directions)
      this.moveTo(this.props.searchLocation);
      this.marker.setLngLat(this.props.searchLocation.geometry.coordinates).addTo(this.map);
    }

    if (this.props.directionsTo && !this.marker._map) { // We have a new destination
      this.moveTo(this.props.directionsTo);
      this.marker.setLngLat(this.props.directionsTo.geometry.coordinates).addTo(this.map);
    }

    if (this.props.directionsFrom && !this.fromMarker._map) { // We have a new origin
      this.moveTo(this.props.directionsFrom);
      this.fromMarker.setLngLat(this.props.directionsFrom.geometry.coordinates).addTo(this.map);
    }

    if (this.props.directionsFrom && this.props.directionsTo) { // We have origin and destination
      const bbox = turfBbox({
        type: 'FeatureCollection',
        features: [this.props.directionsFrom, this.props.directionsTo]
      });

      this.moveTo({bbox: bbox});
    }

    if (!this.props.searchLocation && !this.props.directionsTo) { // Remove search location
      this.marker.remove();
    }

    if (!this.props.directionsFrom) { // Remove search location
      this.fromMarker.remove();
    }

    this.props.setStateValue('needMapUpdate', false);
  }

  moveTo(location) {
    if (location.bbox) { // We have a bbox to fit to
      const distance = turfDistance([location.bbox[0], location.bbox[1]], [location.bbox[2], location.bbox[3]]);
      const buffered = turfBuffer(turfBboxPolygon(location.bbox), distance, 'kilometers');
      const bbox = turfBbox(buffered);
      this.map.fitBounds(bbox, {linear: true});
    } else { // We just have a point
      this.map.easeTo({
        center: location.geometry.coordinates,
        zoom: 16
      })
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
  searchLocation: React.PropTypes.object,
  directionsFrom: React.PropTypes.object,
  directionsTo: React.PropTypes.object,
  needMapUpdate: React.PropTypes.bool,
  setStateValue: React.PropTypes.func,
  setUserLocation: React.PropTypes.func
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
    needMapUpdate: state.needMapUpdate
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setCenter: (coordinates) => dispatch(setCenter(coordinates)),
    setZoom: (zoom) => dispatch(setZoom(zoom)),
    setStateValue: (key, value) => dispatch(setStateValue(key, value)),
    setUserLocation: (coordinates) => dispatch(setUserLocation(coordinates))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MapComponent);
