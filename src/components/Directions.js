import React, { Component } from 'react';
import {connect} from 'react-redux';
import Geocoder from './Geocoder';
import PlaceName from './PlaceName';
import CloseButton from './CloseButton';
import {writeSearch, setMapUpdated, setMode, setDirectionsLocation} from '../actions/index';

class Directions extends Component {
  render() {
    return (
      <div className='directions-panel absolute top m24 w420 h240 shadow-darken25 flex-parent flex-parent--column'>
        <div className='directions-location pl24 pr48 w420 flex-parent flex-parent--row flex-parent--center-cross'>
          {
            this.props.directionsFrom
            ?
            <div className='txt-truncate color-white'>
              <PlaceName location={this.props.directionsFrom} colors='light'/>
            </div>
            :
            <Geocoder
              onSelect={(location) => this.props.setDirectionsLocation('from', location)}
              searchString={this.props.searchString}
            />
          }
          <CloseButton/>
        </div>
        <div className='directions-location pl24 pr48 w420 flex-parent flex-parent--row flex-parent--center-cross'>
          {
            this.props.directionsTo
            ?
            <div className='txt-truncate color-white'>
              <PlaceName location={this.props.directionsTo} colors='light'/>
            </div>
            :
            <Geocoder
              onSelect={(location) => this.props.setDirectionsLocation('to', location)}
              searchString={this.props.searchString}
            />
          }
          <CloseButton/>
        </div>

      </div>
    );
  }
}

Directions.propTypes = {
  searchString: React.PropTypes.string,
  directionsFrom: React.PropTypes.object,
  directionsTo: React.PropTypes.object,
  writeSearch: React.PropTypes.func,
  setDirectionsLocation: React.PropTypes.func,
  setMapUpdated: React.PropTypes.func,
  setMode: React.PropTypes.func
}

const mapStateToProps = (state) => {
  return {
    searchString: state.searchString,
    directionsFrom: state.directionsFrom,
    directionsTo: state.directionsTo
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    writeSearch: (input) => dispatch(writeSearch(input)),
    setDirectionsLocation: (kind, location) => dispatch(setDirectionsLocation(kind, location)),
    setMapUpdated: (bool) => dispatch(setMapUpdated(bool)),
    setMode: (mode) => dispatch(setMode(mode))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Directions);
