import React, { Component } from 'react';

class ModalityButtons extends Component {
  render() {
    return (
      <div className='directions-modality color-white h72 px42 p18 w420 flex-parent flex-parent--row flex-parent--center-main flex-parent--center-cross'>

        <div
          className={'w42 h42 m6 round-full flex-parent flex-parent--center-main flex-parent--center-cross ' + (this.props.modality === 'driving' ? 'bg-darken10' : '')}
          onClick={() => this.props.onSetModality('driving')}
        >
          <svg className={'icon ' + (this.props.modality === 'driving' ? 'color-white' : 'color-lighten50')}><use xlinkHref='#icon-car'></use></svg>
        </div>

        <div
          className={'w42 h42 m6 round-full flex-parent flex-parent--center-main flex-parent--center-cross ' + (this.props.modality === 'biking' ? 'bg-darken10' : '')}
          onClick={() => this.props.onSetModality('biking')}
        >
          <svg className={'icon ' + (this.props.modality === 'biking' ? 'color-white' : 'color-lighten50')}><use xlinkHref='#icon-bike'></use></svg>
        </div>

        <div
          className={'w42 h42 m6 round-full flex-parent flex-parent--center-main flex-parent--center-cross ' + (this.props.modality === 'walking' ? 'bg-darken10' : '')}
          onClick={() => this.props.onSetModality('walking')}
        >
          <svg className={'icon ' + (this.props.modality === 'walking' ? 'color-white' : 'color-lighten50')}><use xlinkHref='#icon-walk'></use></svg>
        </div>

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
