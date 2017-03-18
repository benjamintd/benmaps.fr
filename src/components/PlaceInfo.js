import React, { Component } from 'react';

class PlaceInfo extends Component {
  render() {
    return (
      <div className='place-info absolute top bg-white w420 h72 shadow-darken25 flex-parent flex-parent--column'>
      <div className='my-by-blue w-full h36 px36 flex-parent flex-parent--column flex-parent--center-main'>
        {this.props.info.name}
      </div>
         {this.props.info.tel}
      </div>
    );
  }
}

PlaceInfo.propTypes = {
  info: React.PropTypes.object,
}

export default PlaceInfo;
