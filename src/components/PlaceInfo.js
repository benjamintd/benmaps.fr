import PropTypes from 'prop-types';
import React, {Component} from 'react';
import ImageWithFallback from './ImageWithFallback';
import directionsIcon from '../assets/directions.svg';
import md5 from 'blueimp-md5';

class PlaceInfo extends Component {
  render() {
    if (window.innerHeight < 500) return null;
    return (
      <div className={this.styles.placeInfo}>
        <ImageWithFallback
          className='cover w-full h72 h120-mm'
          primary={this.getImageUrl().thumb}
          secondary={this.getImageUrl().full}
          alt={this.props.info.description}
        />
        <div className='bg-blue flex-parent flex-parent--row'>
          <div className={this.styles.mainInfo}>
            <div className='color-white pl42 pr12 txt-h4 txt-bold'>{this.props.info.label}</div>
            <div className={'color-lighten75 pl42 pr12 txt-s ' + (window.innerWidth < 640 ? 'hide-visually' : '')}>{this.props.info.description}</div>
          </div>
          <div onClick={this.props.clickDirections} className={this.styles.directionsIcon}>
            <img src={directionsIcon} alt='directions'/>
          </div>
        </div>
        {this.getAddress()}
        {this.getPhoneNumber()}
        {this.getWebsite()}
      </div>
    );
  }

  getImageUrl() {
    // see https://commons.wikimedia.org/wiki/Commons:FAQ for how images are stored
    const claim = this.props.info.claims['P18'];
    if (claim && claim.length > 0) {
      const imageName = claim[0].replace(/ /g, '_');
      const baseUrl = 'https://upload.wikimedia.org/wikipedia/commons/';
      const hash = md5(imageName);
      const thumb = baseUrl + 'thumb/' + hash[0] + '/' + hash.slice(0, 2) + '/' + imageName + '/640px-' + imageName;
      const full = baseUrl + hash[0] + '/' + hash.slice(0, 2) + '/' + imageName;
      return {
        thumb,
        full
      };
    } else return {
      thumb: '',
      full: ''
    };
  }

  getPhoneNumber() {
    const claim = this.props.info.claims['P1329'];
    if (claim && claim.length > 0) {
      return (
        <div className={this.styles.infoRow}>
          <div className={this.styles.icon}>
            <svg className='icon my-blue'><use xlinkHref='#icon-info'></use></svg>
          </div>
          <span>{claim[0]}</span>
        </div>
      );
    } else return null;
  }

  getAddress() {
    const claim = this.props.info.claims['P969'];
    if (claim && claim.length > 0 && window.innerWidth > 640) {
      return (
        <div className={this.styles.infoRow}>
          <div className={this.styles.icon}>
            <svg className='icon my-blue'><use xlinkHref='#icon-marker'></use></svg>
          </div>
          <span className='txt-truncate'>{claim[0]}</span>
        </div>
      );
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
      );
    } else return null;
  }

  get styles() {
    return {
      directionsIcon: 'bg-white hmin42 wmin42 hmin48-mm wmin48-mm hmax42 wmax42 hmax48-mm wmax48-mm m6 m12-mm round-full shadow-darken10 cursor-pointer flex-parent flex-parent--center-main flex-parent--center-cross',
      icon: 'flex-parent flex-parent--center-cross flex-parent--center-main w42 h42',
      infoRow: 'h24 h36-mm py6 pr12 flex-parent flex-parent--row flex-parent--center-cross',
      mainInfo: 'p6 flex-child flex-child--grow flex-parent flex-parent--column flex-parent--center-main',
      placeInfo: 'place-info absolute top bg-white w-full w420-mm shadow-darken25 flex-parent flex-parent--column',
    };
  }
}

PlaceInfo.propTypes = {
  clickDirections: PropTypes.func,
  info: PropTypes.object,
};

export default PlaceInfo;
