import React, { Component } from 'react';
import {connect} from 'react-redux';
import Geocoder from './Geocoder';
import {writeSearch} from '../actions/index';

class Search extends Component {
  render() {
    return (
      <div className='absolute top m24'>
        <div className='absolute flex-parent flex-parent--center-cross flex-parent--center-main w36 h36'>
          <svg className='icon'><use href='#icon-search'></use></svg>
        </div>
        <Geocoder
          inputClass='input input--border-darken5 unround pl36 w300 bg-white shadow-darken5'
          resultsClass='bg-white shadow-darken5 mt12 border-darken10'
          resultClass='bg-darken5-on-hover h36 flex-parent flex-parent--center-cross'
          accessToken={this.props.accessToken}
          onSelect={function() {}}
          proximity=''
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    accessToken: state.mapboxAccessToken,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    writeSearch: (input) => dispatch(writeSearch(input)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Search);
