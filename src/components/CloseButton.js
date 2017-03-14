import React, { Component } from 'react';

class CloseButton extends Component {
  render() {
    return (
      this.props.show
      ?
      <div
        className='absolute right flex-parent flex-parent--center-cross flex-parent--center-main w42 h42 cursor-pointer'
        onClick={this.props.onClick}
      >
        <svg className={'icon ' + this.props.color}><use xlinkHref='#icon-close'></use></svg>
      </div>
      :
      <div/>
    );
  }
}

CloseButton.propTypes = {
  show: React.PropTypes.bool,
  onClick: React.PropTypes.func,
  color: React.PropTypes.string
}

CloseButton.defaultProps = {
  show: true,
  onClick: () => {},
  color: 'color-darken25'
}

export default CloseButton;
