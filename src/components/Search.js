import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import Geocoder from './Geocoder';
import PlaceName from './PlaceName';
import CloseButton from './CloseButton';
import PlaceInfo from './PlaceInfo';
import directionsIcon from '../assets/directions.svg';
import {triggerMapUpdate, setDirectionsLocation, getPlaceInfo, resetStateKeys, setStateValue} from '../actions/index';

class Search extends Component {
  render() {
    let SearchBar;

    if (this.props.searchLocation === null) { // no place was selected yet
      SearchBar = (
        <Geocoder
          onSelect={(data) => this.onSelect(data)}
          searchString={this.props.searchString}
          writeSearch={(value) => {
            this.props.triggerMapUpdate();
            this.props.writeSearch(value);
          }}
          resultsClass={this.styles.results}
          inputClass={this.styles.input}
          focusOnMount={true}
        />
      );

    } else { // There is a selected place
      SearchBar = (
        <div className={this.styles.input + ' flex-parent flex-parent--center-cross flex-parent--center-main'}>
          <div className='w-full w420-mm pr42 txt-truncate'>
            <PlaceName
              location={this.props.searchLocation}
              onClick={() => {
                this.props.writeSearch(this.props.searchLocation.place_name);
                this.props.resetStateKeys(['searchLocation', 'placeInfo']);
              }}
            />
          </div>
          <div
            id='search-directions'
            className={'mr30 cursor-pointer right ' + this.styles.icon}
            onClick={() => this.clickDirections()}
          >
            <img src={directionsIcon} alt='directions'/>
          </div>
        </div>
      );

    }

    return (
      <div className={this.styles.main}>
        <div className={this.styles.icon}>
          <svg className='icon color-gray'><use xlinkHref='#icon-search'></use></svg>
        </div>
        {SearchBar}
        <CloseButton
          show={(this.props.searchString !== '' || this.props.searchLocation !== null)}
          onClick={() => this.closeSearch()}
        />

        {
          (this.props.searchLocation && this.props.placeInfo)
          ? <PlaceInfo info={this.props.placeInfo} clickDirections={() => this.clickDirections()}/>
          : null
        }
      </div>
    );
  }

  onSelect(data) {
    this.props.writeSearch(data.place_name);
    this.props.setSearchLocation(data);
    this.props.triggerMapUpdate('repan');
    if (data.properties.wikidata) this.props.getPlaceInfo(data.properties.wikidata);
  }

  closeSearch() {
    this.props.resetStateKeys(['searchString', 'searchLocation', 'placeInfo']);
    this.props.triggerMapUpdate();
  }

  clickDirections() {
    this.props.setMode('directions');
    this.props.writeSearch(this.props.searchLocation.place_name);
    this.props.setDirectionsLocation('to', this.props.searchLocation);
  }

  get styles() {
    return {
      main: 'absolute h42 w-full w420-mm bg-white shadow-darken25 flex-parent flex-parent--row flex-parent--space-between-main',
      icon: 'absolute flex-parent flex-parent--center-cross flex-parent--center-main w42 h42',
      input: 'input px42 h42 border--transparent',
      results: 'results bg-white shadow-darken25 mt6 border-darken10'
    };
  }
}

Search.propTypes = {
  getPlaceInfo: PropTypes.func,
  placeInfo: PropTypes.object,
  resetStateKeys: PropTypes.func,
  searchLocation: PropTypes.object,
  searchString: PropTypes.string,
  setDirectionsLocation: PropTypes.func,
  setMode: PropTypes.func,
  setPlaceInfo: PropTypes.func,
  setSearchLocation: PropTypes.func,
  triggerMapUpdate: PropTypes.func,
  writeSearch: PropTypes.func,
};

const mapStateToProps = (state) => {
  return {
    placeInfo: state.placeInfo,
    searchLocation: state.searchLocation,
    searchString: state.searchString,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getPlaceInfo: (id) => dispatch(getPlaceInfo(id)),
    resetStateKeys: (keys) => dispatch(resetStateKeys(keys)),
    setDirectionsLocation: (kind, location) => dispatch(setDirectionsLocation(kind, location)),
    setMode: (mode) => dispatch(setStateValue('mode', mode)),
    setPlaceInfo: (info) => dispatch(setStateValue('placeInfo', info)),
    setSearchLocation: (location) => dispatch(setStateValue('searchLocation', location)),
    triggerMapUpdate: (repan) => dispatch(triggerMapUpdate(repan)),
    writeSearch: (input) => dispatch(setStateValue('searchString', input)),
  };
};

export {Search};
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Search);
