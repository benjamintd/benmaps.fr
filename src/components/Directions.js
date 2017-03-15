import React, { Component } from 'react';
import {connect} from 'react-redux';
import Geocoder from './Geocoder';
import PlaceName from './PlaceName';
import CloseButton from './CloseButton';
import ModalityButtons from './ModalityButtons';
import {setMapUpdated, setMode, setDirectionsLocation, setStateValue, setModality} from '../actions/index';

class Directions extends Component {
  render() {
    return (
      <div className='directions-panel absolute top m24 w420 h180 shadow-darken25 flex-parent flex-parent--column'>
        <CloseButton
          large={true}
          color='color-white opacity50'
          onClick={() => this.exitDirections()}
        />
        <ModalityButtons
          modality={this.props.modality}
          onSetModality={this.props.setModality}
        />
        <div className='absolute mt72 pr48 w420 flex-parent flex-parent--row'>
          {
            this.props.directionsFrom
            ?
            <div className='txt-truncate color-white pl42 h42 flex-parent flex-parent--row flex-parent--center-cross'>
              <PlaceName location={this.props.directionsFrom} colors='light'/>
            </div>
            :
            <Geocoder
              onSelect={(location) => {
                this.props.setDirectionsLocation('from', location);
                this.props.setMapUpdated(false);
              }}
              searchString={this.props.directionsFromString}
              writeSearch={(value) => this.props.writeSearchFrom(value)}
              resultsClass='fixed bg-white shadow-darken5 mt72 border-darken10'
              inputClass='input directions-input border--transparent color-white pl42 w420 h42'
            />
          }
          <CloseButton
            onClick={() => this.resetSearch('from')}
          />
        </div>
        <div className='directions-location-to absolute pr48 w420 flex-parent flex-parent--row'>
          {
            this.props.directionsTo
            ?
            <div className='txt-truncate color-white pl42 h42 flex-parent flex-parent--row flex-parent--center-cross'>
              <PlaceName location={this.props.directionsTo} colors='light'/>
            </div>
            :
            <Geocoder
              onSelect={(location) => {
                this.props.setDirectionsLocation('to', location);
                this.props.setMapUpdated(false);
              }}
              searchString={this.props.directionsToString}
              writeSearch={(value) => this.props.writeSearchTo(value)}
              resultsClass='fixed bg-white shadow-darken5 mt24 border-darken10'
              inputClass='input directions-input border--transparent color-white pl42 w420 h42'
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

  exitDirections() {
    this.props.setMode('search');
    this.props.setDirectionsLocation('from', null);
    this.props.setDirectionsLocation('to', null);
    this.props.writeSearchFrom('');
    this.props.writeSearchTo('');
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
  setModality: React.PropTypes.func,
  writeSearchFrom: React.PropTypes.func,
  writeSearchTo: React.PropTypes.func,
  modality: React.PropTypes.string
}

const mapStateToProps = (state) => {
  return {
    directionsFrom: state.directionsFrom,
    directionsTo: state.directionsTo,
    directionsFromString: state.directionsFromString,
    directionsToString: state.directionsToString,
    modality: state.modality
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setDirectionsLocation: (kind, location) => dispatch(setDirectionsLocation(kind, location)),
    setMapUpdated: (bool) => dispatch(setMapUpdated(bool)),
    setMode: (mode) => dispatch(setMode(mode)),
    setModality: (modality) => dispatch(setModality(modality)),
    writeSearchFrom: (value) => dispatch(setStateValue('directionsFromString', value)),
    writeSearchTo: (value) => dispatch(setStateValue('directionsToString', value))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Directions);
