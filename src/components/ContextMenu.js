import React, {Component} from 'react';
import {connect} from 'react-redux';

class ContextMenu extends Component {
  render() {
    let style = {
      left: Math.min(window.innerWidth - 300, this.props.contextMenuLocation[0]) + 'px',
      top: Math.min(window.innerHeight - 340, this.props.contextMenuLocation[1]) + 'px'
    };

    return (
      <div className='absolute bg-white w240 h300 txt-s' style={style}>

        {JSON.stringify(this.props.contextMenuActive)}<br/>
        {JSON.stringify(this.props.contextMenuCoordinates)}<br/>
        {JSON.stringify(this.props.contextMenuLocation)}<br/>
        {JSON.stringify(this.props.contextMenuPlace)}<br/>
      </div>
    );
  }
}

// TODO if place is null, loading
// TODO "directions from", "directions to"

ContextMenu.propTypes = {
  contextMenuActive: React.PropTypes.bool,
  contextMenuCoordinates: React.PropTypes.array,
  contextMenuLocation: React.PropTypes.array,
  contextMenuPlace: React.PropTypes.object,
};

const mapStateToProps = (state) => {
  return {
    contextMenuActive: state.contextMenuActive,
    contextMenuCoordinates: state.contextMenuCoordinates,
    contextMenuLocation: state.contextMenuLocation,
    contextMenuPlace: state.contextMenuPlace,
  };
};

const mapDispatchToProps = () => {
  return {};
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ContextMenu);
