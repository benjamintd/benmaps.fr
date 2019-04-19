import PropTypes from "prop-types";
import React, { Component } from "react";
import _ from "lodash";

class ImageWithFallback extends Component {
  constructor(props) {
    super(props);

    this.state = {
      status: "primary"
    };
  }

  render() {
    const primary = _.get(this.props, "image.thumb");
    const secondary = _.get(this.props, "image.full");
    if (primary === "" && secondary === "") return null;

    if (this.state.status === "primary") {
      return (
        <img
          className={this.props.className}
          src={primary}
          onError={() => this.setState({ status: "secondary" })}
          alt={this.props.alt}
        />
      );
    } else if (this.state.status === "secondary") {
      return (
        <img
          className={this.props.className}
          src={secondary}
          onError={() => this.setState({ status: "error" })}
          alt={this.props.alt}
        />
      );
    } else return null;
  }
}

ImageWithFallback.propTypes = {
  alt: PropTypes.string,
  className: PropTypes.string,
  image: PropTypes.object
};

export default ImageWithFallback;
