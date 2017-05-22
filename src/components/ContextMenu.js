import React, {Component} from 'react';
import {connect} from 'react-redux';
import PlaceName from './PlaceName';
import {setStateValue} from '../actions/index';

class ContextMenu extends Component {
  render() {
    let style = {
      left: Math.min(window.innerWidth - 240, this.props.location[0]) + 'px',
      top: Math.min(window.innerHeight - 240, this.props.location[1]) + 'px'
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
    console.log('search ' + this.props.coordinates);
  }

  directionsTo() {
    console.log('directions to ' + this.props.coordinates);
  }

  directionsFrom() {
    console.log('directions from ' + this.props.coordinates);
  }

  reset() {

  }
}

ContextMenu.propTypes = {
  active: React.PropTypes.bool,
  coordinates: React.PropTypes.array,
  location: React.PropTypes.array,
  place: React.PropTypes.object,
};

const mapStateToProps = (state) => {
  return {
    active: state.contextMenuActive,
    coordinates: state.contextMenuCoordinates,
    location: state.contextMenuLocation,
    place: state.contextMenuPlace,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setStateValue: (key, value) => dispatch(setStateValue(key, value))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ContextMenu);
