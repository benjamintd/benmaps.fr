import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import PlaceName from './PlaceName';
import {setStateValues, triggerMapUpdate, resetContextMenu, getReverseGeocode} from '../actions/index';

class ContextMenu extends Component {
  render() {
    let style = {
      left: Math.min(window.innerWidth - 240, this.props.position[0]) + 'px',
      top: Math.min(window.innerHeight - 240, this.props.position[1]) + 'px'
    };

    return (
      <div className='absolute bg-white w240 hmax300 shadow-darken25 border--gray' style={style}>
        <div className='px12 py12 bg-darken10-on-hover cursor-pointer align-center border-b border--darken10'>
          <PlaceName
            location={this.props.place}
            className='w-full cursor-pointer'
            colors='dark'
            onClick={() => this.search()}
          />
          <p>{this.formatCoordinates()}</p>
          <p className="txt-xs color-darken50 select-none">
            lon<span className='inline-block w48'></span>lat
          </p>
        </div>
        <div onClick={() => this.setDirections('directionsFrom')} className='px12 py6 bg-darken10-on-hover cursor-pointer'>
          directions from this place
        </div>
        <div onClick={() => this.setDirections('directionsTo')} className='px12 py6 bg-darken10-on-hover cursor-pointer'>
          directions to this place
        </div>
      </div>
    );
  }

  formatCoordinates() {
    return this.props.coordinates
      .map(e => e.toFixed(6))
      .join(',');
  }

  search() {
    this.props.setStateValues({
      mode: 'search',
      searchLocation: this.props.place
    });
    this.props.triggerMapUpdate();
    this.props.resetContextMenu();
  }

  setDirections(k) {
    var newState = {
      mode: 'directions'
    };
    newState[k] = this.props.place;
    this.props.setStateValues(newState);

    // If the place is still loading, we delegate to the directions to get the
    // geocode. This will trigger a second request but we don't have cancel
    // actions yet. This is better than a spinner forever spinning.
    if (this.props.place.place_name === '__loading') {
      this.props.getReverseGeocode(
        k,
        this.props.coordinates.slice(),
        this.props.accessToken
      );
    }
    this.props.triggerMapUpdate();
    this.props.resetContextMenu();
  }
}

ContextMenu.propTypes = {
  accessToken: PropTypes.string,
  active: PropTypes.bool,
  coordinates: PropTypes.array,
  getReverseGeocode: PropTypes.func,
  position: PropTypes.array,
  place: PropTypes.object,
  resetContextMenu: PropTypes.func,
  setStateValues: PropTypes.func,
  triggerMapUpdate: PropTypes.func
};

const mapStateToProps = (state) => {
  return {
    accessToken: state.app.mapboxAccessToken,
    active: state.app.contextMenuActive,
    coordinates: state.app.contextMenuCoordinates,
    position: state.app.contextMenuPosition,
    place: state.app.contextMenuPlace,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getReverseGeocode: (key, coordinates, token) => dispatch(getReverseGeocode(key, coordinates, token)),
    resetContextMenu: () => dispatch(resetContextMenu()),
    setStateValues: (obj) => dispatch(setStateValues(obj)),
    triggerMapUpdate: (needMapRepan) => dispatch(triggerMapUpdate(needMapRepan))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ContextMenu);
