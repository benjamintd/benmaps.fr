import React, { Component } from 'react';
import {connect} from 'react-redux';
import mapboxgl from 'mapbox-gl/dist/mapbox-gl';
import {setZoom, setCenter, setMapUpdated} from '../actions/index'

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
        zoom: this.props.zoom
    });

    map.on('moveend', () => {
      const center = map.getCenter();
      this.props.setCenter([center.lng, center.lat]);
      this.props.setZoom(map.getZoom());
    });

    const markerElement = document.createElement('div');
    markerElement.className = 'marker flex-parent flex-parent--center-cross flex-parent--center-main w42 h42';
    markerElement.innerHTML = '<svg class="icon icon--l color-red-dark"><use href="#icon-marker"></use></svg>';

    const marker = new mapboxgl.Marker(markerElement);

    const geolocationElement = document.createElement('div');
    geolocationElement.className = 'geolocation flex-parent flex-parent--center-cross flex-parent--center-main w42 h42';
    geolocationElement.innerHTML = '<img src="./geolocation.svg"/>';

    const geolocation = new mapboxgl.Marker(geolocationElement);

    const geolocateControl = new mapboxgl.GeolocateControl();

    geolocateControl.on('geolocate', (data) => {
      geolocation.setLngLat([data.coords.longitude, data.coords.latitude]).addTo(map);
    });
    map.addControl(geolocateControl, 'bottom-right');

    this.map = map;
    this.marker = marker;
  }

  componentDidUpdate() {
    // We just got a new search location
    if (this.props.searchLocation && this.props.needMapUpdate) {
      if (this.props.searchLocation.bbox) { // We have a bbox to fit to
        this.map.fitBounds(this.props.searchLocation.bbox, {linear: true});
      } else { // We just have a point
        this.map.easeTo({
          center: this.props.searchLocation.geometry.coordinates,
          zoom: 16
        })
      }
      this.marker.setLngLat(this.props.searchLocation.geometry.coordinates).addTo(this.map);
    } else if (this.props.searchLocation === null && this.props.needMapUpdate) { // Remove search location
      this.marker.remove();
    }
    this.props.setMapUpdated(true);
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
  needMapUpdate: React.PropTypes.bool,
  setMapUpdated: React.PropTypes.func
}

const mapStateToProps = (state) => {
  return {
    accessToken: state.mapboxAccessToken,
    style: state.mapStyle,
    center: state.mapCenter,
    zoom: state.mapZoom,
    searchLocation: state.searchLocation,
    needMapUpdate: state.needMapUpdate
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setCenter: (coordinates) => dispatch(setCenter(coordinates)),
    setZoom: (zoom) => dispatch(setZoom(zoom)),
    setMapUpdated: (bool) => dispatch(setMapUpdated(bool))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MapComponent);
