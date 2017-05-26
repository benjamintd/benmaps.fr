import PropTypes from 'prop-types';
import React, {Component} from 'react';

class ModalityButtons extends Component {
  render() {
    return (
      <div className='flex-child color-white px42 hmin48 w-full flex-parent flex-parent--row flex-parent--center-main flex-parent--center-cross'>
      {
        ['car', 'bike', 'walk'].map((modality) =>
          <div
            className={'relative w42 h42 m6 round-full flex-parent flex-parent--center-main flex-parent--center-cross ' + (this.props.modality === modality ? 'bg-darken10' : '')}
            onClick={() => this.props.onSetModality(modality)}
            key={modality}
          >
            <svg className={'icon ' + (this.props.modality === modality ? 'color-white' : 'color-lighten50')}><use xlinkHref={'#icon-' + modality}></use></svg>
          </div>
        )
      }
      </div>
    );
  }
}

ModalityButtons.propTypes = {
  modality: PropTypes.string,
  onSetModality: PropTypes.func
};

ModalityButtons.defaultProps = {
  modality: 'car'
};

export default ModalityButtons;
