import React, { Component } from 'react';
import md5 from 'blueimp-md5';

class PlaceInfo extends Component {
  render() {
    return (
      <div className='place-info absolute top bg-white w420 h300 shadow-darken25 flex-parent flex-parent--column'>
        <img className='place-image w-full h120' src={this.getImageUrl()} alt={this.props.info.description}/>
        <div className='my-bg-blue flex-parent flex-parent--row'>
          <div className='h72 w300 flex-child flex-child--grow flex-parent flex-parent--column flex-parent--center-main'>
            <div className='color-white pl42 pr12 txt-h4 txt-bold'>{this.props.info.label}</div>
            <div className='color-lighten75 pl42 pr12 txt-s'>{this.props.info.description}</div>
          </div>
          <div className='bg-white h48 w48 m12 round-full flex-parent flex-parent--center-main flex-parent--center-cross'>
            <img src='/directions.svg' alt='directions'/>
          </div>
        </div>
         {this.props.info.tel}
      </div>
    );
  }

  getImageUrl() {
    const claim = this.props.info.claims['P18'];
    if (claim && claim.length > 0) {
      const imageName = claim[0];
      const baseUrl = 'https://upload.wikimedia.org/wikipedia/commons/';
      const hash = md5(imageName);
      return baseUrl + hash[0] + '/' + hash.slice(0, 2) + '/' + imageName;
    }
  }
}

PlaceInfo.propTypes = {
  info: React.PropTypes.object,
}

export default PlaceInfo;
