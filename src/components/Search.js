import React, { Component } from 'react';
import {connect} from 'react-redux';
import Geocoder from './Geocoder';
import {writeSearch} from '../actions/index';

class Search extends Component {
  render() {
    return (
      <div className='absolute top m24'>
        <div className='absolute flex-parent flex-parent--center-cross flex-parent--center-main w42 h42'>
          <svg className='icon color-darken25'><use href='#icon-search'></use></svg>
        </div>
        <Geocoder
          accessToken={this.props.accessToken}
          onSelect={function(res) {console.log(res);}}
          proximity={this.props.proximity}
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    accessToken: state.mapboxAccessToken,
    proximity: state.mapCenter.join(',')
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
