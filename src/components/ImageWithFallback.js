import React from 'react';

var ImageWithFallback = React.createClass({
  getInitialState() {
    return {
      status: 'primary'
    }
  },

  render() {
    if (this.state.status === 'primary') {
      return <img
        className={this.props.className}
        src={this.props.primary}
        onError={() => this.setState({status: 'secondary'})}
        alt={this.props.alt}
      />
    } else if (this.state.status === 'secondary') {
      return <img
        className={this.props.className}
        src={this.props.secondary}
        onError={() => this.setState({status: 'error'})}
        alt={this.props.alt}
      />
    } else return null;
  },

  propTypes: {
    className: React.PropTypes.string,
    primary: React.PropTypes.string,
    secondary: React.PropTypes.string,
    alt: React.PropTypes.string
  }
});

export default ImageWithFallback;
