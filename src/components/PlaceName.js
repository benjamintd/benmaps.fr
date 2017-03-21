import React, { Component } from 'react';

class PlaceName extends Component {
  render() {
    var parts = this.props.location.place_name.split(', ');
    if (parts.length < 1) return;
    var main = parts[0];
    var rest = parts.slice(1).join(', ');

    var mainColor, restColor;
    if (this.props.colors === 'light') {
      mainColor = 'color-white';
      restColor = 'color-lighten50';
    } else {
      mainColor = 'color-black';
      restColor = 'color-darken50';
    }

    return (
      <div className='txt-truncate w-full'>
        {
          main === '__loading'
          ?
          <div className={'loading loading--s ' + (this.props.colors === 'light' ? 'loading--dark' : '')}></div>
          :
          <div className={'inline pr6 ' + mainColor}>{main}</div>
        }
        <div className={'inline txt-s ' +restColor}>{rest}</div>
      </div>
    );
  }
}

PlaceName.propTypes = {
  location: React.PropTypes.object,
  colors: React.PropTypes.string
}


export default PlaceName;
