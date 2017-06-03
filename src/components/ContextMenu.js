import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import PlaceName from './PlaceName';
import {setStateValues, triggerMapUpdate, resetContextMenu} from '../actions/index';

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
        </div>
        <div onClick={() => this.directionsFrom()} className='px12 py6 bg-darken10-on-hover cursor-pointer'>
          directions from this place
        </div>
        <div onClick={() => this.directionsTo()} className='px12 py6 bg-darken10-on-hover cursor-pointer'>
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

  directionsTo() {
    this.props.setStateValues({
      mode: 'directions',
      directionsTo: this.props.place
    });
    this.props.triggerMapUpdate();
    this.props.resetContextMenu();
  }

  directionsFrom() {
    this.props.setStateValues({
      mode: 'directions',
      directionsFrom: this.props.place
    });
    this.props.triggerMapUpdate();
    this.props.resetContextMenu();
  }

  reset() {

  }
}

ContextMenu.propTypes = {
  active: PropTypes.bool,
  coordinates: PropTypes.array,
  position: PropTypes.array,
  place: PropTypes.object,
  resetContextMenu: PropTypes.func,
  setStateValues: PropTypes.func,
  triggerMapUpdate: PropTypes.func
};

const mapStateToProps = (state) => {
  return {
    active: state.contextMenuActive,
    coordinates: state.contextMenuCoordinates,
    position: state.contextMenuPosition,
    place: state.contextMenuPlace,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    resetContextMenu: () => dispatch(resetContextMenu()),
    setStateValues: (obj) => dispatch(setStateValues(obj)),
    triggerMapUpdate: (needMapRepan) => dispatch(triggerMapUpdate(needMapRepan))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ContextMenu);
