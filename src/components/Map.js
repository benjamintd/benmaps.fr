import React, { Component } from 'react';
import {connect} from 'react-redux';
import mapboxgl from 'mapbox-gl/dist/mapbox-gl';

mapboxgl.accessToken = 'pk.eyJ1IjoiYmVuamFtaW50ZCIsImEiOiJjaW83enIwNjYwMnB1dmlsejN6cDBzbm93In0.0ZOGwSLp8OjW6vCaEKYFng';

class Map extends Component {
  render() {
    return (
      <div id='map' className='viewport-full'>
      </div>
    );
  }

  componentDidMount() {
    const map = new mapboxgl.Map({
        container: 'map',
        style: this.props.style,
        center: this.props.center,
        zoom: this.props.zoom
    });
  }
}

const mapStateToProps = (state) => {
  return {
    style: state.mapStyle,
    center: state.mapCenter,
    zoom: state.mapZoom
  };
};

const mapDispatchToProps = (dispatch) => {
  return {};
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Map);
