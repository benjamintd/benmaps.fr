import React, { Component } from 'react';

class ModalityButtons extends Component {
  render() {
    return (
      <div className='directions-modality color-white h72 px42 p18 w420 flex-parent flex-parent--row flex-parent--center-main flex-parent--center-cross'>
        car | bike | walk
      </div>
    );
  }
}

ModalityButtons.propTypes = {
  modality: React.PropTypes.string,
  onSetModality: React.PropTypes.func
}

ModalityButtons.defaultProps = {
  modality: 'driving'
}

export default ModalityButtons;
