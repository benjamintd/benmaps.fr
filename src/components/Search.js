import React, { Component } from 'react';
import {connect} from 'react-redux';
import Geocoder from './Geocoder';
import PlaceName from './PlaceName';
import CloseButton from './CloseButton';
import {writeSearch, setSearchLocation, setMapUpdated, setMode, setDirectionsLocation} from '../actions/index';

class Search extends Component {
  closeSearch() {
    this.props.writeSearch('');
    this.props.setSearchLocation(null);
    this.props.setMapUpdated(false);
  }

  clickDirections() {
    this.props.writeSearch('');
    this.props.setMode('directions');
    this.props.setDirectionsLocation('to', this.props.searchLocation);
    this.props.setSearchLocation(null);
  }

  render() {
    return (
      <div className='absolute top m24 w420 flex-parent flex-parent--row'>
        <div className='absolute flex-parent flex-parent--center-cross flex-parent--center-main w42 h42'>
          <svg className='icon color-darken25'><use xlinkHref='#icon-search'></use></svg>
        </div>
        {
          (this.props.searchLocation === null) // no place was selected yet
          ?
          <Geocoder
            onSelect={this.props.setSearchLocation}
            searchString={this.props.searchString}
            writeSearch={(value) => this.props.writeSearch(value)}
          />
          :
          <div className='input input--border-darken5 unround pl36 w420 h42 bg-white shadow-darken5 flex-parent flex-parent--center-cross flex-parent--center-main'>
            <div className='w420 pr48 txt-truncate'>
              <PlaceName location={this.props.searchLocation}/>
            </div>
            <div
              className='absolute right flex-parent flex-parent--center-cross flex-parent--center-main w42 h42 mr30 cursor-pointer'
              onClick={() => this.clickDirections()}
            >
              <img src='/directions.svg' alt='directions'/>
            </div>
          </div>
        }
        <CloseButton
          show={(this.props.searchString !== '' || this.props.searchLocation !== null)}
          onClick={() => this.closeSearch()}
        />
      </div>
    );
  }
}

Search.propTypes = {
  searchString: React.PropTypes.string,
  searchLocation: React.PropTypes.object,
  writeSearch: React.PropTypes.func,
  setSearchLocation: React.PropTypes.func,
  setMapUpdated: React.PropTypes.func,
  setMode: React.PropTypes.func,
  setDirectionsLocation: React.PropTypes.func
}

const mapStateToProps = (state) => {
  return {
    searchString: state.searchString,
    searchLocation: state.searchLocation
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    writeSearch: (input) => dispatch(writeSearch(input)),
    setSearchLocation: (location) => dispatch(setSearchLocation(location)),
    setMapUpdated: (bool) => dispatch(setMapUpdated(bool)),
    setMode: (mode) => dispatch(setMode(mode)),
    setDirectionsLocation: (kind, location) => dispatch(setDirectionsLocation(kind, location))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Search);
