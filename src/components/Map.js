import React, {Component} from 'react';
import {connect} from 'react-redux';
import mapboxgl from 'mapbox-gl/dist/mapbox-gl';
import turfBbox from '@turf/bbox';
import turfBboxPolygon from '@turf/bbox-polygon';
import turfBuffer from '@turf/buffer';
import turfDistance from '@turf/distance';
import {setStateValue, setUserLocation, triggerMapUpdate, getRoute, getReverseGeocode} from '../actions/index';

class MapComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDragging: false,
      isCursorOverPoint: false,
      draggedLayer: '',
      draggedCoords: null
    };
  }

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

    map.on('load', () => {

      // Add sources

      map.addSource('route', {
        type: 'geojson',
        data: this.emptyData
      });

      map.addSource('marker', {
        type: 'geojson',
        data: this.emptyData
      });

      map.addSource('geolocation', {
        type: 'geojson',
        data: this.emptyData
      });

      map.addSource('fromMarker', {
        type: 'geojson',
        data: this.emptyData
      });


      // Add and style layers

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

      map.addLayer({
        'id': 'marker',
        'source': 'marker',
        'type': 'symbol',
        'layout': {
          'icon-image': 'pin',
          'icon-offset': [0, -20]
        },
      });

      map.addLayer({
        'id': 'fromMarker',
        'source': 'fromMarker',
        'type': 'symbol',
        'layout': {
          'icon-image': 'fromLocation'
        },
      }, 'marker');

      map.addLayer({
        'id': 'geolocation',
        'source': 'geolocation',
        'type': 'symbol',
        'layout': {
          'icon-image': 'geolocation'
        },
      }, 'fromMarker');

      // helper to set geolocation
      const setGeolocation = (data) => {
        const geometry = {type: 'Point', coordinates: [data.coords.longitude, data.coords.latitude]};
        this.map.getSource('geolocation').setData(geometry);
        this.props.setUserLocation(geometry.coordinates);
        this.moveTo(geometry, 13);
      };

      // Create geolocation control
      const geolocateControl = new mapboxgl.GeolocateControl();
      geolocateControl.on('geolocate', setGeolocation);
      map.addControl(geolocateControl, 'bottom-right');

      // Initial ask for location and display on the map
      if (this.props.userLocation) {
        this.map.getSource('geolocation').setData(this.props.userLocation.geometry);
        this.moveTo(this.props.userLocation, 13);
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(setGeolocation);
      }

      // Regularly poll the user location and update the map
      window.setInterval(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((data) => {
            const geometry = {type: 'Point', coordinates: [data.coords.longitude, data.coords.latitude]};
            this.map.getSource('geolocation').setData(geometry);
            this.props.setUserLocation(geometry.coordinates);
          });
        }
      }, 10000);

      // Set event listeners

      map.on('click', (e) => this.onClick(e));

      map.on('mousemove', (e) => {
        var features = map.queryRenderedFeatures(e.point, {layers: this.movableLayers.concat(this.selectableLayers)});

        if (features.length) {
          map.getCanvas().style.cursor = 'pointer';
          if (this.movableLayers.indexOf(features[0].layer.id) > -1) {
            this.setState({isCursorOverPoint: true});
            this.map.dragPan.disable();
          }
        } else {
          map.getCanvas().style.cursor = '';
          this.setState({isCursorOverPoint: false});
          map.dragPan.enable();
        }
      });

      map.on('mousedown', (e) => this.mouseDown(e), true);

      map.on('moveend', () => {
        const center = map.getCenter();
        this.props.setStateValue('mapCenter', [center.lng, center.lat]);
        this.props.setStateValue('mapZoom', map.getZoom());
      });
    });
  }

  componentDidUpdate() {
    if (!this.props.needMapUpdate) return;

    // This is where we update the layers and map bbox

    // Search mode
    if (this.props.mode === 'search') {
      if (this.props.searchLocation) {
        this.map.getSource('marker').setData(this.props.searchLocation.geometry);
      } else {
        this.map.getSource('marker').setData(this.emptyData);
      }

      // remove items specific to directions mode
      this.map.getSource('fromMarker').setData(this.emptyData);
      this.map.getSource('route').setData(this.emptyData);
    }

    // Directions mode
    if (this.props.mode === 'directions') {
      if (this.props.directionsFrom) {
        this.map.getSource('fromMarker').setData(this.props.directionsFrom.geometry);
      } else {
        this.map.getSource('fromMarker').setData(this.emptyData);
      }

      if (this.props.directionsTo) {
        this.map.getSource('marker').setData(this.props.directionsTo.geometry);
      } else {
        this.map.getSource('marker').setData(this.emptyData);
      }

      if (this.props.route) {
        this.map.getSource('route').setData(this.props.route.geometry);
      } else {
        this.map.getSource('route').setData(this.emptyData);
      }

      // We have origin and destination but no route yet
      if (this.props.directionsFrom && this.props.directionsTo && this.props.route === null) {
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

    // No need to re-update until the state says so
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

  mouseDown(e) {
    if (!this.state.isDragging && !this.state.isCursorOverPoint) return;

    var features = this.map.queryRenderedFeatures(e.point, {layers: this.movableLayers});
    if (!features.length) return;


    // Set a cursor indicator
    this.map.getCanvas().style.cursor = 'grab';

    const mouseMoveFn = (e) => this.onMove(e);

    this.setState({isDragging: true, draggedLayer: features[0].layer.id, mouseMoveFn: mouseMoveFn});

    // Mouse events
    this.map.on('mousemove', mouseMoveFn);
    this.map.once('mouseup', () => this.onUp());
  }

  onMove(e) {
    if (!this.state.isDragging) return;

    const layerId = this.state.draggedLayer;
    if (this.movableLayers.indexOf(layerId) < 0) return;

    var coords = [e.lngLat.lng, e.lngLat.lat];
    this.setState({draggedCoords: coords});

    // Set a UI indicator for dragging.
    this.map.getCanvas().style.cursor = 'grabbing';

    const geometry = {
      type: 'Point',
      coordinates: coords
    };

    this.map.getSource(layerId).setData(geometry);

    this.props.setStateValue('placeInfo', null);
    this.props.setStateValue('searchLocation', null);
    this.props.setStateValue(this.layerToKey(layerId), {
      'place_name': '__loading',
      'geometry': geometry
    });
    this.props.setStateValue('route', undefined); // Will make the route disappear without triggering a call to the API
    this.props.setStateValue('routeStatus', 'idle');
    this.props.triggerMapUpdate();
  }

  onUp() {
    if (!this.state.isDragging) return;

    this.map.getCanvas().style.cursor = '';

    // Unbind mouse events
    this.map.off('mousemove', this.state.mouseMoveFn);

    this.props.getReverseGeocode(
      this.layerToKey(this.state.draggedLayer),
      this.state.draggedCoords,
      this.props.accessToken
    );

    this.setState({isDragging: false, draggedLayer: '', draggedCoords: null});

    this.props.setStateValue('route', null); // retrigger API call
    this.props.triggerMapUpdate();
  }

  onClick(e) {
    var features = this.map.queryRenderedFeatures(e.point, {layers: this.selectableLayers});
    if (!features.length) {
      return;
    }

    var feature = features[0];

    let key;
    if (this.props.mode === 'search') key = 'searchLocation';
    else if (!this.props.directionsFrom) key = 'directionsFrom';
    else {
      this.props.setStateValue('route', null);
      this.props.setStateValue('searchLocation', null);
      key = 'directionsTo';
    }

    if (key) {
      this.props.setStateValue(key, {
        'type': 'Feature',
        'place_name': feature.properties.name,
        'properties': {},
        'geometry': feature.geometry
      });
      this.props.triggerMapUpdate();
    }
  }

  layerToKey(layer) {
    if (this.props.mode === 'search' && layer === 'marker') return 'searchLocation';
    else if (this.props.mode === 'directions' && layer === 'marker') return 'directionsTo';
    else if (this.props.mode === 'directions' && layer === 'fromMarker') return 'directionsFrom';
    else return '';
  }

  get emptyData() {
    return {
      type: 'FeatureCollection',
      features: []
    };
  }

  get selectableLayers() {
    return [
      'rail-label',
      'poi-scalerank1',
      'poi-parks-scalerank1',
      'poi-scalerank2',
      'poi-parks-scalerank2',
      'poi-scalerank3',
      'poi-parks-scalerank3',
      'poi-scalerank4-l1',
      'poi-scalerank4-l15',
      'poi-parks_scalerank4',
    ];
  }

  get movableLayers() {
    return ['marker', 'fromMarker'];
  }
}

MapComponent.propTypes = {
  accessToken: React.PropTypes.string,
  center: React.PropTypes.array,
  directionsFrom: React.PropTypes.object,
  directionsTo: React.PropTypes.object,
  getReverseGeocode: React.PropTypes.func,
  getRoute: React.PropTypes.func,
  map: React.PropTypes.object,
  modality: React.PropTypes.string,
  mode: React.PropTypes.string,
  needMapRepan: React.PropTypes.bool,
  needMapUpdate: React.PropTypes.bool,
  route: React.PropTypes.object,
  routeStatus: React.PropTypes.string,
  searchLocation: React.PropTypes.object,
  setStateValue: React.PropTypes.func,
  setUserLocation: React.PropTypes.func,
  style: React.PropTypes.string,
  triggerMapUpdate: React.PropTypes.func,
  userLocation: React.PropTypes.object,
  zoom: React.PropTypes.number,
};

const mapStateToProps = (state) => {
  return {
    accessToken: state.mapboxAccessToken,
    center: state.mapCenter,
    directionsFrom: state.directionsFrom,
    directionsTo: state.directionsTo,
    modality: state.modality,
    mode: state.mode,
    needMapRepan: state.needMapRepan,
    needMapUpdate: state.needMapUpdate,
    route: state.route,
    routeStatus: state.routeStatus,
    searchLocation: state.searchLocation,
    style: state.mapStyle,
    userLocation: state.userLocation,
    zoom: state.mapZoom,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getReverseGeocode: (key, coordinates, accessToken) => dispatch(getReverseGeocode(key, coordinates, accessToken)),
    getRoute: (directionsFrom, directionsTo, modality, accessToken) => dispatch(getRoute(directionsFrom, directionsTo, modality, accessToken)),
    setStateValue: (key, value) => dispatch(setStateValue(key, value)),
    setUserLocation: (coordinates) => dispatch(setUserLocation(coordinates)),
    triggerMapUpdate: (repan) => dispatch(triggerMapUpdate(repan)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MapComponent);
