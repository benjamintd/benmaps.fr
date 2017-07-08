import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import mapboxgl from 'mapbox-gl/dist/mapbox-gl';
import turfBbox from '@turf/bbox';
import turfBboxPolygon from '@turf/bbox-polygon';
import turfBuffer from '@turf/buffer';
import turfDistance from '@turf/distance';
import {push} from 'react-router-redux';
import {
  setStateValue,
  setUserLocation,
  triggerMapUpdate,
  getRoute,
  getReverseGeocode,
  setContextMenu,
  resetContextMenu,
  resetStateKeys
} from '../actions/index';

import style from '../styles/style.json';
// Set the sprite URL in the style. It has to be a full, absolute URL.
let spriteUrl;
if (process.env.NODE_ENV === 'production') {
  spriteUrl = process.env.PUBLIC_URL + '/sprite';
} else { // Dev server runs on port 3000
  spriteUrl = 'http://localhost:3000/sprite';
}
style.sprite = spriteUrl;

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
      style: style,
      center: this.props.center,
      zoom: this.props.zoom,
      minZoom: 2,
      maxZoom: 21
    });

    this.map = map;

    map.on('load', () => {
      this.onLoad();
    });
  }

  componentDidUpdate() {
    if (!this.props.needMapUpdate) return;

    // This is where we update the layers and map bbox
    if (this.props.userLocation && this.props.userLocation.geometry) {
      this.map.getSource('geolocation').setData(this.props.userLocation.geometry);
    }

    // Search mode
    if (this.props.mode === 'search') {
      if (this.props.searchLocation) {
        if (this.props.searchLocation.geometry) this.map.getSource('marker').setData(this.props.searchLocation.geometry);
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
        if (this.props.routeStatus !== 'error' && this.props.routeStatus !== 'paused') {
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

    if (this.props.needMapRestyle) {
      this.updateStyle(this.props.mapStyle);
    } else {
      // No need to re-update until the state says so
      this.props.setStateValue('needMapUpdate', false);
      this.props.setStateValue('needMapRepan', false);
    }

    this.props.setStateValue('needMapRestyle', false);
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
    this.map.once('mousemove', (e) => this.onceMove(e));
    this.map.once('mouseup', (e) => this.onUp(e));
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
  }

  onceMove(e, status = 'paused') {
    var coords = [e.lngLat.lng, e.lngLat.lat];
    const geometry = {
      type: 'Point',
      coordinates: coords
    };

    const layerId = this.state.draggedLayer;
    this.props.resetStateKeys(['placeInfo', 'searchLocation', 'route', 'routeStatus']);
    this.props.setStateValue('routeStatus', status); // pause route updates
    this.props.setStateValue(this.layerToKey(layerId), {
      'place_name': '__loading',
      'geometry': geometry
    });
    this.props.triggerMapUpdate();
  }

  onUp(e) {
    if (!this.state.isDragging) return;

    this.map.getCanvas().style.cursor = '';

    // Unbind mouse events
    this.map.off('mousemove', this.state.mouseMoveFn);

    this.props.getReverseGeocode(
      this.layerToKey(this.state.draggedLayer),
      this.state.draggedCoords,
      this.props.accessToken
    );

    this.onceMove(e, 'idle');
    this.setState({isDragging: false, draggedLayer: '', draggedCoords: null});
  }

  onClick(e) {
    var features = this.map.queryRenderedFeatures(e.point, {layers: this.selectableLayers});

    if (!features.length) {
      // No feature is selected, reset the search location on click on the map
      if (this.props.mode === 'search' && !this.props.contextMenuActive) {
        this.props.resetStateKeys(['placeInfo', 'searchString', 'searchLocation']);
        this.props.triggerMapUpdate();
      }
      return;
    }

    // We have a selected feature
    var feature = features[0];

    let key;
    if (this.props.mode === 'search') {
      this.props.resetStateKeys(['placeInfo']);
      key = 'searchLocation';
    } else if (!this.props.directionsFrom) {
      key = 'directionsFrom';
    } else {
      this.props.resetStateKeys(['route', 'searchLocation']);
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

  onContextMenu(e) {
    let coordinates = [e.lngLat.lng, e.lngLat.lat];
    let location = [e.point.x, e.point.y];
    this.props.getReverseGeocode(
      'contextMenuPlace',
      coordinates,
      this.props.accessToken
    );
    this.props.setContextMenu(coordinates, location);

    this.map
      .once('move', () => this.props.resetContextMenu())
      .once('click', () => this.props.resetContextMenu());
  }

  onLoad() {
    // helper to set geolocation
    const setGeolocation = (data) => {
      const geometry = {type: 'Point', coordinates: [data.coords.longitude, data.coords.latitude]};
      this.map.getSource('geolocation').setData(geometry);
      this.props.setUserLocation(geometry.coordinates);
      if (this.props.moveOnLoad) this.moveTo(geometry, 13);
    };

    // Create scale control
    const scaleControl = new mapboxgl.ScaleControl({
      maxWidth: 80,
      unit: 'metric'
    });
    this.map.addControl(scaleControl, 'bottom-right');

    // Create geolocation control
    const geolocateControl = new mapboxgl.GeolocateControl();
    geolocateControl.on('geolocate', setGeolocation);
    this.map.addControl(geolocateControl, 'bottom-right');

    // Initial ask for location and display on the map
    if (this.props.userLocation) {
      this.map.getSource('geolocation').setData(this.props.userLocation.geometry);
      if (this.props.moveOnLoad) this.moveTo(this.props.userLocation, 13);
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

    this.map.on('click', (e) => this.onClick(e));

    this.map.on('contextmenu', (e) => this.onContextMenu(e));

    this.map.on('mousemove', (e) => {
      var features = this.map.queryRenderedFeatures(e.point, {layers: this.movableLayers.concat(this.selectableLayers)});

      if (features.length) {
        this.map.getCanvas().style.cursor = 'pointer';
        if (this.movableLayers.indexOf(features[0].layer.id) > -1) {
          this.setState({isCursorOverPoint: true});
          this.map.dragPan.disable();
        }
      } else {
        this.map.getCanvas().style.cursor = '';
        this.setState({isCursorOverPoint: false});
        this.map.dragPan.enable();
      }
    });

    this.map.on('mousedown', (e) => this.mouseDown(e));

    this.map.on('moveend', () => {
      const center = this.map.getCenter();
      const zoom = this.map.getZoom();
      this.props.setStateValue('mapCoords', [center.lng, center.lat, zoom]);
    });

    // Update the style if needed
    this.updateStyle(this.props.mapStyle);

    // Final update if the original state has some data
    this.props.triggerMapUpdate();
  }

  updateStyle(styleString) {
    if (styleString.indexOf('traffic') > -1) {
      this.map.getStyle().layers.forEach(layer => {
        if (layer.source === 'traffic') this.map.setLayoutProperty(layer.id, 'visibility', 'visible');
        // TODO here, change the color of motorways and trunks to white
      });
    } else {
      this.map.getStyle().layers.forEach(layer => {
        if (layer.source === 'traffic') this.map.setLayoutProperty(layer.id, 'visibility', 'none');
        // TODO here, change the color of motorways and trunks back to orange/yellow (look in the `style` variable?)
      });
    }

    if (styleString.indexOf('satellite') > -1) {
      this.map.setLayoutProperty('satellite', 'visibility', 'visible');
      // TODO add labels and stuff?
      // timeout to have a smooth transition, no flash
      setTimeout(() => {
        this.map.getStyle().layers.forEach(layer => {
          if (layer.source === 'composite') this.map.setLayoutProperty(layer.id, 'visibility', 'none');
        });
      }, 300);
    } else {
      this.map.getStyle().layers.forEach(layer => {
        if (layer.source === 'composite') this.map.setLayoutProperty(layer.id, 'visibility', 'visible');
      });
      this.map.setLayoutProperty('satellite', 'visibility', 'none');
    }

    return styleString;
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
      'poi-scalerank4',
      'poi-parks-scalerank4',
    ];
  }

  get movableLayers() {
    return ['marker', 'fromMarker'];
  }
}

MapComponent.propTypes = {
  accessToken: PropTypes.string,
  center: PropTypes.array,
  contextMenuActive: PropTypes.bool,
  directionsFrom: PropTypes.object,
  directionsTo: PropTypes.object,
  getReverseGeocode: PropTypes.func,
  getRoute: PropTypes.func,
  map: PropTypes.object,
  mapStyle: PropTypes.string,
  modality: PropTypes.string,
  mode: PropTypes.string,
  moveOnLoad: PropTypes.bool,
  needMapRepan: PropTypes.bool,
  needMapRestyle: PropTypes.bool,
  needMapUpdate: PropTypes.bool,
  pushHistory: PropTypes.func,
  resetContextMenu: PropTypes.func,
  resetStateKeys: PropTypes.func,
  route: PropTypes.object,
  routeStatus: PropTypes.string,
  searchLocation: PropTypes.object,
  setContextMenu: PropTypes.func,
  setStateValue: PropTypes.func,
  setUserLocation: PropTypes.func,
  triggerMapUpdate: PropTypes.func,
  userLocation: PropTypes.object,
  zoom: PropTypes.number,
};

const mapStateToProps = (state) => {
  return {
    accessToken: state.app.mapboxAccessToken,
    center: state.app.mapCoords.slice(0, 2),
    contextMenuActive: state.app.contextMenuActive,
    directionsFrom: state.app.directionsFrom,
    directionsTo: state.app.directionsTo,
    mapStyle: state.app.mapStyle,
    modality: state.app.modality,
    mode: state.app.mode,
    needMapRepan: state.app.needMapRepan,
    needMapRestyle: state.app.needMapRestyle,
    needMapUpdate: state.app.needMapUpdate,
    route: state.app.route,
    routeStatus: state.app.routeStatus,
    searchLocation: state.app.searchLocation,
    userLocation: state.app.userLocation,
    zoom: state.app.mapCoords[2],
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getReverseGeocode: (key, coordinates, accessToken) => dispatch(getReverseGeocode(key, coordinates, accessToken)),
    getRoute: (directionsFrom, directionsTo, modality, accessToken) => dispatch(getRoute(directionsFrom, directionsTo, modality, accessToken)),
    pushHistory: (url) => dispatch(push(url)),
    resetContextMenu: () => dispatch(resetContextMenu()),
    setContextMenu: (coordinates, location) => dispatch(setContextMenu(coordinates, location)),
    setStateValue: (key, value) => dispatch(setStateValue(key, value)),
    setUserLocation: (coordinates) => dispatch(setUserLocation(coordinates)),
    triggerMapUpdate: (repan) => dispatch(triggerMapUpdate(repan)),
    resetStateKeys: (keys) => dispatch(resetStateKeys(keys))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MapComponent);
