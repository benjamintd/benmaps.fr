import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import Geocoder from './Geocoder';
import PlaceName from './PlaceName';
import CloseButton from './CloseButton';
import RoutePanel from './RoutePanel';
import ModalityButtons from './ModalityButtons';
import MyLocation from './MyLocation';
import swapDirectionsIcon from '../assets/swapDirections.svg';
import {triggerMapUpdate, setDirectionsLocation, setStateValue, resetStateKeys} from '../actions/index';

class Directions extends Component {
  render() {
    return (
      <div id='directions'>

        <div className={this.styles.directions}>

          <CloseButton
            large={true}
            color='color-lighten50'
            onClick={() => this.exitDirections()}
          />
          <ModalityButtons
            modality={this.props.modality}
            onSetModality={(modality) => {
              this.props.setModality(modality);
              this.props.resetStateKeys(['route', 'routeStatus']);
              this.props.triggerMapUpdate();
            }}
          />

          <div id='directionsFromTo' className='flex-parent flex-parent--row flex-parent--center-cross'>

            <div
              className='flex-child absolute left pl12 w42 h-full flex-parent flex-parent--center-cross flex-parent--center-main'
              onClick={() => this.swapDirections()}
            >
              <img src={swapDirectionsIcon} alt='swap directions'/>
            </div>

            <div className='flex-child w-full h-full'>
              <div className={this.styles.row}>
                {
                  this.props.directionsFrom
                  ? <div className={this.styles.placeName}>
                    <PlaceName
                      location={this.props.directionsFrom}
                      colors='light'
                      onClick={() => {
                        this.props.writeSearchFrom(this.props.directionsFrom.place_name);
                        this.props.setDirectionsLocation('from', null);
                        this.props.setRoute(null);
                        this.props.setStateValue('routeStatus', 'idle');
                      }}
                    />
                  </div>
                  : <Geocoder
                    onSelect={this.setDirectionsLocation('from')}
                    searchString={this.props.directionsFromString}
                    writeSearch={(value) => {
                      this.props.writeSearchFrom(value);
                      this.props.triggerMapUpdate();
                    }}
                    resultsClass={'mt48 ' + this.styles.results}
                    inputClass={this.styles.input}
                    inputPlaceholder='Choose starting point...'
                    focusOnMount={true}
                  />
                }
              </div>

              <div className={this.styles.row}>
                {
                  this.props.directionsTo
                  ? <div className={this.styles.placeName}>
                    <PlaceName
                      location={this.props.directionsTo}
                      colors='light'
                      onClick={() => {
                        this.props.writeSearchTo(this.props.directionsTo.place_name);
                        this.props.resetStateKeys(['route', 'searchLocation', 'searchString', 'routeStatus', 'directionsTo']);
                      }}
                    />
                  </div>
                  : <Geocoder
                    onSelect={this.setDirectionsLocation('to')}
                    searchString={this.props.directionsToString}
                    writeSearch={(value) => {
                      this.props.writeSearchTo(value);
                      this.props.triggerMapUpdate();
                    }}
                    resultsClass={'mt6 ' + this.styles.results}
                    inputClass={this.styles.input}
                    inputPlaceholder='Choose destination...'
                  />
                }
              </div>

            </div>
          </div>
        </div>

        {
          this.showUserLocation()
          ? <MyLocation
            onClick={() => this.setUserLocationDirections()}
            userLocation={this.props.userLocation}
          />
          : null
        }

        {
          (this.props.route || this.props.routeStatus === 'pending' || this.props.routeStatus === 'error')
          ? <RoutePanel/>
          : null
        }
      </div>
    );
  }

  setDirectionsLocation(kind) {
    return (location) => {
      this.props.setDirectionsLocation(kind, location);
      if (kind === 'to') this.props.writeSearchTo(location.place_name);
      if (kind === 'from') this.props.writeSearchFrom(location.place_name);
      this.props.triggerMapUpdate('repan');
    };
  }

  setUserLocationDirections() {
    if (!this.props.directionsFrom) this.props.setDirectionsLocation('from', this.props.userLocation);
    else if (!this.props.directionsTo) this.props.setDirectionsLocation('to', this.props.userLocation);
    this.props.triggerMapUpdate('repan');
  }

  resetSearch(kind) {
    if (kind === 'from') this.props.writeSearchFrom('');
    if (kind === 'to') this.props.writeSearchTo('');
    this.props.setDirectionsLocation(kind, null);
    this.props.resetStateKeys(['route', 'routeStatus', 'searchLocation']);
    this.props.triggerMapUpdate();
  }

  exitDirections() {
    this.props.setMode('search');
    this.props.resetStateKeys(['route', 'routeStatus', 'directionsFromString', 'directionsToString', 'directionsFrom', 'directionsTo']);
    this.props.triggerMapUpdate();
  }

  showUserLocation() {
    return (
      (
        (!this.props.directionsFrom && !this.props.directionsTo)
        || (!this.props.directionsTo && this.props.directionsFrom && this.props.directionsFrom.place_name !== 'My Location')
        || (!this.props.directionsFrom && this.props.directionsTo && this.props.directionsTo.place_name !== 'My Location')
      )
      && (!this.props.directionsFromString)
      && (!this.props.directionsToString)
      && this.props.userLocation
    );
  }

  swapDirections() {
    this.props.setDirectionsLocation('from', this.props.directionsTo);
    this.props.setDirectionsLocation('to', this.props.directionsFrom);
    this.props.setRoute(null);
    this.props.setStateValue('routeStatus', 'idle');
    this.props.triggerMapUpdate('repan');
  }

  get styles() {
    return {
      directions: 'relative bg-blue w-full w420-mm shadow-darken25 flex-parent flex-parent--column',
      input: 'input directions-input border--transparent color-white px48 h42 w-full',
      placeName: 'txt-truncate w-full color-white px48 h42 flex-parent flex-parent--row flex-parent--center-cross',
      results: 'absolute w-full bg-white shadow-darken5 border-darken10',
      row: 'flex-child hmin42 w-full w420-mm flex-parent flex-parent--row',
      userLocation: 'relative bg-white h42 flex-parent flex-parent--center-cross pr12 cursor-pointer w-full w420-mm'
    };
  }
}

Directions.propTypes = {
  directionsFrom: PropTypes.object,
  directionsFromString: PropTypes.string,
  directionsTo: PropTypes.object,
  directionsToString: PropTypes.string,
  modality: PropTypes.string,
  resetStateKeys: PropTypes.func,
  route: PropTypes.object,
  routeStatus: PropTypes.string,
  setDirectionsLocation: PropTypes.func,
  setModality: PropTypes.func,
  setMode: PropTypes.func,
  setRoute: PropTypes.func,
  setStateValue: PropTypes.func,
  triggerMapUpdate: PropTypes.func,
  userLocation: PropTypes.object,
  writeSearchFrom: PropTypes.func,
  writeSearchTo: PropTypes.func,
};

const mapStateToProps = (state) => {
  return {
    directionsFrom: state.app.directionsFrom,
    directionsFromString: state.app.directionsFromString,
    directionsTo: state.app.directionsTo,
    directionsToString: state.app.directionsToString,
    modality: state.app.modality,
    route: state.app.route,
    routeStatus: state.app.routeStatus,
    userLocation: state.app.userLocation,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    resetStateKeys: (keys) => dispatch(resetStateKeys(keys)),
    setDirectionsLocation: (kind, location) => dispatch(setDirectionsLocation(kind, location)),
    setModality: (modality) => dispatch(setStateValue('modality', modality)),
    setMode: (mode) => dispatch(setStateValue('mode', mode)),
    setRoute: (route) => dispatch(setStateValue('route', route)),
    setStateValue: (k, v) => dispatch(setStateValue(k, v)),
    triggerMapUpdate: (repan) => dispatch(triggerMapUpdate(repan)),
    writeSearchFrom: (value) => dispatch(setStateValue('directionsFromString', value)),
    writeSearchTo: (value) => dispatch(setStateValue('directionsToString', value)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Directions);
