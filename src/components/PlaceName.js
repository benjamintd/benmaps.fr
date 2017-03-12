import React, { Component } from 'react';

class PlaceName extends Component {
  render() {
    var parts = this.props.location.place_name.split(', ');
    if (parts.length < 1) return;
    var main = parts[0];
    var rest = parts.slice(1).join(', ');
    return (
      <div>
        <div className='inline pr6'>{main}</div>
        <div className='inline txt-s color-darken50'>{rest}</div>
      </div>
    );
  }
}

PlaceName.propTypes = {
  location: React.PropTypes.object
}


export default PlaceName;
