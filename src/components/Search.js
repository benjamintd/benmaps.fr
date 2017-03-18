import React, { Component } from 'react';
import {connect} from 'react-redux';
import Geocoder from './Geocoder';
import PlaceName from './PlaceName';
import CloseButton from './CloseButton';
import {writeSearch, setSearchLocation, triggerMapUpdate, setMode, setDirectionsLocation} from '../actions/index';

class Search extends Component {
  closeSearch() {
    this.props.writeSearch('');
    this.props.setSearchLocation(null);
    this.props.triggerMapUpdate();
  }

  clickDirections() {
    this.props.setMode('directions');
    this.props.writeSearch('');
    this.props.setDirectionsLocation('to', this.props.searchLocation);
  }

  render() {
    return (
      <div className='absolute top m24 w420 flex-parent flex-parent--row'>
        <div className={this.styles.icon}>
          <svg className='icon color-gray'><use xlinkHref='#icon-search'></use></svg>
        </div>
        {
          (this.props.searchLocation === null) // no place was selected yet
          ?
          <Geocoder
            onSelect={this.props.setSearchLocation}
            searchString={this.props.searchString}
            writeSearch={(value) => this.props.writeSearch(value)}
            resultsClass={this.styles.results}
            inputClass={this.styles.input}
          />
          :
          <div className={this.styles.input + ' flex-parent flex-parent--center-cross flex-parent--center-main'}>
            <div className='w420 pr48 txt-truncate'>
              <PlaceName location={this.props.searchLocation}/>
            </div>
            <div
              className={'mr30 cursor-pointer right ' + this.styles.icon}
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

  get styles() {
    return {
      icon: 'absolute flex-parent flex-parent--center-cross flex-parent--center-main w42 h42',
      input: 'input input--border-darken5 unround pl36 w420 h42 bg-white shadow-darken5',
      results: 'bg-white shadow-darken5 mt12 border-darken10'
    }
  }
}

Search.propTypes = {
  searchString: React.PropTypes.string,
  searchLocation: React.PropTypes.object,
  writeSearch: React.PropTypes.func,
  setSearchLocation: React.PropTypes.func,
  triggerMapUpdate: React.PropTypes.func,
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
    triggerMapUpdate: () => dispatch(triggerMapUpdate()),
    setMode: (mode) => dispatch(setMode(mode)),
    setDirectionsLocation: (kind, location) => dispatch(setDirectionsLocation(kind, location))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Search);
