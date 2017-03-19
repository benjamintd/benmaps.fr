import React, { Component } from 'react';
import md5 from 'blueimp-md5';

class PlaceInfo extends Component {
  render() {
    return (
      <div className={this.styles.placeInfo}>
        <img
          className='place-image w-full h120'
          src={this.getImageUrl().thumb}
          alt={this.props.info.description}
        />
        <div className='my-bg-blue flex-parent flex-parent--row'>
          <div className={this.styles.mainInfo}>
            <div className='color-white pl42 pr12 txt-h4 txt-bold'>{this.props.info.label}</div>
            <div className='color-lighten75 pl42 pr12 txt-s'>{this.props.info.description}</div>
          </div>
          <div onClick={this.props.clickDirections} className={this.styles.directionsIcon}>
            <img src='/directions.svg' alt='directions'/>
          </div>
        </div>
        {this.getAddress()}
        {this.getPhoneNumber()}
        {this.getWebsite()}
      </div>
    );
  }

  getImageUrl() {
    const claim = this.props.info.claims['P18'];
    if (claim && claim.length > 0) {
      // see https://commons.wikimedia.org/wiki/Commons:FAQ for how images are stored
      const imageName = claim[0].replace(/ /g, '_');
      const baseUrl = 'https://upload.wikimedia.org/wikipedia/commons/';
      const hash = md5(imageName);
      const thumb = baseUrl + 'thumb/' + hash[0] + '/' + hash.slice(0, 2) + '/' + imageName + '/640px-' + imageName;
      const image = baseUrl + hash[0] + '/' + hash.slice(0, 2) + '/' + imageName; // TODO fallback to this if thumb does not exist
      return {
        thumb,
        image
      }
    }
  }

  getPhoneNumber() {
    const claim = this.props.info.claims['P1329'];
    if (claim && claim.length > 0) {
      return (
        <div className={this.styles.infoRow}>
          <div className={this.styles.icon}>
            <svg className='icon my-blue'><use xlinkHref='#icon-info'></use></svg>
          </div>
          <span className='txt-truncate'>{claim[0]}</span>
        </div>
      )
    } else return null;
  }

  getAddress() {
    const claim = this.props.info.claims['P969'];
    if (claim && claim.length > 0) {
      return (
        <div className={this.styles.infoRow}>
          <div className={this.styles.icon}>
            <svg className='icon my-blue'><use xlinkHref='#icon-marker'></use></svg>
          </div>
          <span className='txt-truncate'>{claim[0]}</span>
        </div>
      )
    } else return null;
  }

  getWebsite() {
    const claim = this.props.info.claims['P856'];
    if (claim && claim.length > 0) {
      return (
        <div className={this.styles.infoRow}>
          <div className={this.styles.icon}>
            <svg className='icon my-blue'><use xlinkHref='#icon-globe'></use></svg>
          </div>
          <a href={claim[0]} target='_blank' className='txt-truncate'>{claim[0]}</a>
        </div>
      )
    } else return null;
  }

  get styles() {
    return {
      placeInfo: 'place-info absolute top bg-white w420 shadow-darken25 flex-parent flex-parent--column',
      infoRow: 'h36 py6 pr12 flex-parent flex-parent--row flex-parent--center-cross',
      icon: 'flex-parent flex-parent--center-cross flex-parent--center-main w42 h42',
      mainInfo: 'w300 p6 flex-child flex-child--grow flex-parent flex-parent--column flex-parent--center-main',
      directionsIcon: 'bg-white h48 w48 m12 round-full shadow-darken10 cursor-pointer flex-parent flex-parent--center-main flex-parent--center-cross'
    }
  }
}

PlaceInfo.propTypes = {
  info: React.PropTypes.object,
  clickDirections: React.PropTypes.func
}

export default PlaceInfo;
