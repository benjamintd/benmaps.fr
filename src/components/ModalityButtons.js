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
  clickCar: React.PropTypes.func,
  clickBike: React.PropTypes.func,
  clickWalk: React.PropTypes.func,
  selected: React.PropTypes.string
}

ModalityButtons.defaultProps = {
  selected: 'car'
}

export default ModalityButtons;
