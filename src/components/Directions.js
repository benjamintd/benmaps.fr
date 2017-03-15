import React, { Component } from 'react';
import {connect} from 'react-redux';
import Geocoder from './Geocoder';
import PlaceName from './PlaceName';
import CloseButton from './CloseButton';
import {setMapUpdated, setMode, setDirectionsLocation, setStateValue} from '../actions/index';

class Directions extends Component {
  render() {
    return (
      <div className='directions-panel absolute top m24 pt24 w420 h240 shadow-darken25 flex-parent flex-parent--column'>
        <div className='directions-modality color-white px42 p6 w420'>
        car | bike | walk
        </div>
        <div className='fixed mt42 pr48 w420 flex-parent flex-parent--row'>
          {
            this.props.directionsFrom
            ?
            <div className='txt-truncate color-white pl42 h42 flex-parent flex-parent--row flex-parent--center-cross'>
              <PlaceName location={this.props.directionsFrom} colors='light'/>
            </div>
            :
            <Geocoder
              onSelect={(location) => this.props.setDirectionsLocation('from', location)}
              searchString={this.props.directionsFromString}
              writeSearch={(value) => this.props.writeSearchFrom(value)}
            />
          }
          <CloseButton
            onClick={() => this.resetSearch('from')}
          />
        </div>
        <div className='directions-location-to fixed pr48 w420 flex-parent flex-parent--row'>
          {
            this.props.directionsTo
            ?
            <div className='txt-truncate color-white pl42 h42 flex-parent flex-parent--row flex-parent--center-cross'>
              <PlaceName location={this.props.directionsTo} colors='light'/>
            </div>
            :
            <Geocoder
              onSelect={(location) => this.props.setDirectionsLocation('to', location)}
              searchString={this.props.directionsToString}
              writeSearch={(value) => this.props.writeSearchTo(value)}
            />
          }
          <CloseButton
            onClick={() => this.resetSearch('to')}
          />
        </div>

      </div>
    );
  }

  resetSearch(kind) {
    if (kind === 'from') this.props.writeSearchFrom('');
    if (kind === 'to') this.props.writeSearchTo('');
    this.props.setDirectionsLocation(kind, null);
    this.props.setMapUpdated(false);
  }
}

Directions.propTypes = {
  directionsFromString: React.PropTypes.string,
  directionsFrom: React.PropTypes.object,
  directionsToString: React.PropTypes.string,
  directionsTo: React.PropTypes.object,
  setDirectionsLocation: React.PropTypes.func,
  setMapUpdated: React.PropTypes.func,
  setMode: React.PropTypes.func,
  writeSearchFrom: React.PropTypes.func,
  writeSearchTo: React.PropTypes.func,
}

const mapStateToProps = (state) => {
  return {
    directionsFrom: state.directionsFrom,
    directionsTo: state.directionsTo,
    directionsFromString: state.directionsFromString,
    directionsToString: state.directionsToString
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setDirectionsLocation: (kind, location) => dispatch(setDirectionsLocation(kind, location)),
    setMapUpdated: (bool) => dispatch(setMapUpdated(bool)),
    setMode: (mode) => dispatch(setMode(mode)),
    writeSearchFrom: (value) => dispatch(setStateValue('directionsFromString', value)),
    writeSearchTo: (value) => dispatch(setStateValue('directionsToString', value))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Directions);
