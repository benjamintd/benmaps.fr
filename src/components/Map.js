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

    map.on('load', () => {
      map.addSource('single-point', {
          type: 'geojson',
          data: {
              type: 'FeatureCollection',
              features: []
          }
      });

      map.addLayer({
          id: 'point',
          source: 'single-point',
          type: 'circle',
          paint: {
              'circle-radius': 10,
              'circle-color': '#007cbf'
          }
      });
    })

    this.map = map;
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
      this.map.getSource('single-point').setData(this.props.searchLocation.geometry);
    } else if (this.props.searchLocation === null && this.props.needMapUpdate) { // Remove search location
      this.map.getSource('single-point').setData({
          type: 'FeatureCollection',
          features: []
      });
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
