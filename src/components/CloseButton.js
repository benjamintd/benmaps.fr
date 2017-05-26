import PropTypes from 'prop-types';
import React, {Component} from 'react';

class CloseButton extends Component {
  render() {
    return (
      this.props.show
      ? <div
        className='absolute right flex-parent flex-parent--center-cross flex-parent--center-main w42 h42 cursor-pointer'
        onClick={this.props.onClick}
      >
        <svg className={'icon ' + (this.props.large ? 'icon--l ' : ' ') + this.props.color}><use xlinkHref='#icon-close'></use></svg>
      </div>
      : null
    );
  }
}

CloseButton.propTypes = {
  color: PropTypes.string,
  large: PropTypes.bool,
  onClick: PropTypes.func,
  show: PropTypes.bool,
};

CloseButton.defaultProps = {
  color: 'color-gray',
  large: false,
  onClick: () => {},
  show: true,
};

export default CloseButton;
