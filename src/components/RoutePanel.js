import React, { Component } from 'react';
import {connect} from 'react-redux';

class RoutePanel extends Component {
  render() {
    return (
      <div className='route-panel absolute top bg-white m24 w420 h72 shadow-darken25 flex-parent flex-parent--column'>
        <div className='flex-parent flex-parent--row flex-parent--center-cross h72 py18 w-full'>
          <div className='w48 h48 flex-parent flex-parent--center-main flex-parent--center-cross'>
            <svg className='icon'><use xlinkHref={'#icon-' + this.props.modality}></use></svg>
          </div>
          <div className='bottom txt-h4 pr12'>
            {this.secondsToMinutes(this.props.route.duration)} minutes
          </div>
          <div className='bottom color-gray'>
            {(this.props.route.distance / 1000).toFixed(1)} km
          </div>
        </div>
      </div>
    );
  }

  secondsToMinutes(duration) {
    return Math.max(1, Math.round(duration / 60));
  }


}

RoutePanel.propTypes = {
  route: React.PropTypes.object.isRequired,
  modality: React.PropTypes.string
}

const mapStateToProps = (state) => {
  return {
    route: state.route,
    modality: state.modality
  };
};

export default connect(mapStateToProps)(RoutePanel);
