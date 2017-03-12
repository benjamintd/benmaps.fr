import React, { Component } from 'react';
import {connect} from 'react-redux';
import Geocoder from './Geocoder';
import {writeSearch} from '../actions/index';

class Search extends Component {
  render() {
    return (
      <div className='absolute top m24 w420 flex-parent flex-parent--row'>
        <div className='absolute flex-parent flex-parent--center-cross flex-parent--center-main w42 h42'>
          <svg className='icon color-darken25'><use href='#icon-search'></use></svg>
        </div>
        <Geocoder
          onSelect={function(res) { console.log(res); }} // TODO move that in Geocoder props
        />

        {
          this.props.searchString !== ''
          ?
          <div
            className='absolute right flex-parent flex-parent--center-cross flex-parent--center-main w42 h42 cursor-pointer'
            onClick={() => this.props.writeSearch('')}
          >
            <svg className='icon color-darken25'><use href='#icon-close'></use></svg>
          </div>
          :
          <div/>
        }


      </div>
    );
  }
}

Search.propTypes = {
  searchString: React.PropTypes.string
}

const mapStateToProps = (state) => {
  return {
    searchString: state.searchString
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
