import React, { Component } from 'react';
import {connect} from 'react-redux';
import Geocoder from './Geocoder';
import PlaceName from './PlaceName';
import CloseButton from './CloseButton';
import ModalityButtons from './ModalityButtons';
import MyLocation from './MyLocation';
import {triggerMapUpdate, setMode, setDirectionsLocation, setStateValue, setModality} from '../actions/index';

class Directions extends Component {
  render() {
    return (
      <div className={this.styles.directions}>
        <CloseButton
          large={true}
          color='color-white opacity50'
          onClick={() => this.exitDirections()}
        />
        <ModalityButtons
          modality={this.props.modality}
          onSetModality={this.props.setModality}
        />
        <div className={'mt72 ' + this.styles.row}>
          {
            this.props.directionsFrom
            ?
            <div className={this.styles.placeName}>
              <PlaceName location={this.props.directionsFrom} colors='light'/>
            </div>
            :
            <Geocoder
              onSelect={this.setDirectionsLocation('from')}
              searchString={this.props.directionsFromString}
              writeSearch={(value) => this.props.writeSearchFrom(value)}
              resultsClass={'mt72 ' + this.styles.results}
              inputClass={this.styles.input}
            />
          }
          <CloseButton
            onClick={() => this.resetSearch('from')}
          />
        </div>
        <div className={'directions-location-to ' + this.styles.row}>
          {
            this.props.directionsTo
            ?
            <div className={this.styles.placeName}>
              <PlaceName location={this.props.directionsTo} colors='light'/>
            </div>
            :
            <Geocoder
              onSelect={this.setDirectionsLocation('to')}
              searchString={this.props.directionsToString}
              writeSearch={(value) => this.props.writeSearchTo(value)}
              resultsClass={'mt24 ' + this.styles.results}
              inputClass={this.styles.input}
            />
          }
          <CloseButton
            onClick={() => this.resetSearch('to')}
          />
        </div>

        {
          this.showUserLocation()
          ?
          <MyLocation
            onClick={() => this.setUserLocationDirections()}
            userLocation={this.props.userLocation}
          />
          :
          <div/>
        }

      </div>
    );
  }

  setDirectionsLocation(kind) {
    return (location) => {
      this.props.setDirectionsLocation(kind, location);
      if (kind === 'to') this.props.writeSearchTo('');
      if (kind === 'from') this.props.writeSearchFrom('');
      this.props.triggerMapUpdate();
    }
  }

  setUserLocationDirections() {
    if (!this.props.directionsFrom) this.props.setDirectionsLocation('from', this.props.userLocation);
    else if (!this.props.directionsTo) this.props.setDirectionsLocation('to', this.props.userLocation);
    this.props.triggerMapUpdate();
  }

  resetSearch(kind) {
    if (kind === 'from') this.props.writeSearchFrom('');
    if (kind === 'to') this.props.writeSearchTo('');
    this.props.setDirectionsLocation(kind, null);
    this.props.triggerMapUpdate();
  }

  exitDirections() {
    this.props.setMode('search');
    this.props.setDirectionsLocation('from', null);
    this.props.setDirectionsLocation('to', null);
    this.props.writeSearchFrom('');
    this.props.writeSearchTo('');
    this.props.triggerMapUpdate();
  }

  showUserLocation() {
    return (
      !(this.props.directionsFrom && this.props.directionsTo)
      && (!this.props.directionsFromString)
      && (!this.props.directionsToString)
      && this.props.userLocation
    )
  }

  get styles() {
    return {
      directions: 'directions-panel absolute top m24 w420 h180 shadow-darken25 flex-parent flex-parent--column',
      input: 'input directions-input border--transparent color-white pl42 w420 h42',
      results: 'fixed bg-white shadow-darken5 border-darken10',
      placeName: 'txt-truncate color-white pl42 h42 flex-parent flex-parent--row flex-parent--center-cross',
      row: 'absolute pr48 w420 flex-parent flex-parent--row',
      userLocation: 'user-location-menu h36 flex-parent flex-parent--center-cross pr12 cursor-pointer w420'
    }
  }
}

Directions.propTypes = {
  directionsFromString: React.PropTypes.string,
  directionsFrom: React.PropTypes.object,
  directionsToString: React.PropTypes.string,
  directionsTo: React.PropTypes.object,
  setDirectionsLocation: React.PropTypes.func,
  triggerMapUpdate: React.PropTypes.func,
  setMode: React.PropTypes.func,
  setModality: React.PropTypes.func,
  writeSearchFrom: React.PropTypes.func,
  writeSearchTo: React.PropTypes.func,
  modality: React.PropTypes.string,
  userLocation: React.PropTypes.object
}

const mapStateToProps = (state) => {
  return {
    directionsFrom: state.directionsFrom,
    directionsTo: state.directionsTo,
    directionsFromString: state.directionsFromString,
    directionsToString: state.directionsToString,
    modality: state.modality,
    userLocation: state.userLocation
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setDirectionsLocation: (kind, location) => dispatch(setDirectionsLocation(kind, location)),
    triggerMapUpdate: () => dispatch(triggerMapUpdate()),
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
