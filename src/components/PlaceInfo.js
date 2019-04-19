import PropTypes from "prop-types";
import React, { Component } from "react";
import ImageWithFallback from "./ImageWithFallback";
import directionsIcon from "../assets/directions.svg";

class PlaceInfo extends Component {
  render() {
    if (window.innerHeight < 500) return null;
    return (
      <div className={styles.placeInfo}>
        <ImageWithFallback
          className="cover w-full h72 h120-mm"
          primary={this.props.info.image.thumb}
          secondary={this.props.info.image.full}
          alt={this.props.info.description}
        />
        <div className="bg-blue flex-parent flex-parent--row">
          <div className={styles.mainInfo}>
            <div className="color-white pl42 pr12 txt-h4 txt-bold">
              {this.props.info.label}
            </div>
            <div
              className={
                "color-lighten75 pl42 pr12 txt-s " +
                (window.innerWidth < 640 ? "hide-visually" : "")
              }
            >
              {this.props.info.description}
            </div>
          </div>
          <div
            onClick={this.props.clickDirections}
            className={styles.directionsIcon}
          >
            <img src={directionsIcon} alt="directions" />
          </div>
        </div>
        <Address address={this.props.info.address} />
        <PhoneNumber number={this.props.info.phoneNumber} />
        <Website url={this.props.info.website} />
      </div>
    );
  }

  getCopyLinkUrl() {
    // TODO copy the url when available
  }
}

const PhoneNumber = ({ number }) => {
  if (number) {
    return (
      <div className={styles.infoRow}>
        <div className={styles.icon}>
          <svg className="icon my-blue">
            <use xlinkHref="#icon-info" />
          </svg>
        </div>
        <span>{number}</span>
      </div>
    );
  } else return null;
};

const Address = ({ address }) => {
  if (address && window.innerWidth > 640) {
    return (
      <div className={styles.infoRow}>
        <div className={styles.icon}>
          <svg className="icon my-blue">
            <use xlinkHref="#icon-marker" />
          </svg>
        </div>
        <span className="txt-truncate">{address}</span>
      </div>
    );
  } else return null;
};

const Website = ({ url }) => {
  if (url) {
    return (
      <div className={styles.infoRow}>
        <div className={styles.icon}>
          <svg className="icon my-blue">
            <use xlinkHref="#icon-globe" />
          </svg>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="txt-truncate"
        >
          {url}
        </a>
      </div>
    );
  } else return null;
};

const styles = {
  directionsIcon:
    "bg-white hmin42 wmin42 hmin48-mm wmin48-mm hmax42 wmax42 hmax48-mm wmax48-mm m6 m12-mm round-full shadow-darken10 cursor-pointer flex-parent flex-parent--center-main flex-parent--center-cross",
  icon:
    "flex-parent flex-parent--center-cross flex-parent--center-main w42 h42",
  infoRow:
    "h24 h36-mm py6 pr12 flex-parent flex-parent--row flex-parent--center-cross",
  mainInfo:
    "p6 flex-child flex-child--grow flex-parent flex-parent--column flex-parent--center-main",
  placeInfo:
    "place-info absolute top bg-white w-full w420-mm shadow-darken25 flex-parent flex-parent--column"
};

PlaceInfo.propTypes = {
  clickDirections: PropTypes.func,
  info: PropTypes.object
};

export default PlaceInfo;
