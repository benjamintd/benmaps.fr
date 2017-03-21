import React, {Component} from 'react';
import {connect} from 'react-redux';

class RoutePanel extends Component {
  render() {
    return (
      <div className='relative mt6 bg-white w-full w420-mm h42 h48-mm py18 shadow-darken25 flex-parent flex-parent--column flex-parent--center-main'>
        {this.routeInfo()}
      </div>
    );
  }

  routeInfo() {
    if (this.props.route) {
      return (
        <div className='flex-parent flex-parent--row flex-parent--center-cross'>
          <div className='w48 h48 flex-parent flex-parent--center-main flex-parent--center-cross'>
            <svg className='icon color-gray'><use xlinkHref={'#icon-' + this.props.modality}></use></svg>
          </div>
          <div className='bottom pr12'>
            {this.secondsToReadableTime(this.props.route.duration)}
            {this.props.modality === 'car' ? ' with current traffic' : ''}
          </div>
          <div className='bottom color-gray'>
            {(this.props.route.distance / 1000).toFixed(1)} km
          </div>
        </div>
      );
    } else if (this.props.routeStatus === 'pending') {
      return <div className='loading loading--s'/>;
    } else if (this.props.routeStatus === 'error') {
      return <div className='txt-s txt-m-mm animation-subtle-shake px18'>Sorry, no route found for these locations.</div>;
    } else return null;
  }



  secondsToReadableTime(duration) {
    var minutes = Math.max(1, Math.round(duration / 60));

    var hours = Math.floor(minutes / 60);
    minutes -= 60 * hours;

    var days = Math.floor(hours / 24);
    hours -= 24 * days;

    var daysString = (days > 0) ? `${days} day${days > 1 ? 's,' : ','} ` : '';
    var hoursString = (hours > 0) ? `${hours} hour${hours > 1 ? 's and' : ' and'} ` : '';
    var minutesString = `${minutes} minute${minutes > 1 ? 's' : ''} `;
    return daysString + hoursString + minutesString;
  }
}

RoutePanel.propTypes = {
  modality: React.PropTypes.string,
  route: React.PropTypes.object,
  routeStatus: React.PropTypes.string.isRequired,
};

const mapStateToProps = (state) => {
  return {
    modality: state.modality,
    route: state.route,
    routeStatus: state.routeStatus,
  };
};

export default connect(mapStateToProps)(RoutePanel);
