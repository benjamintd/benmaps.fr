import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import ContextMenu from './ContextMenu';
import Map from './Map';
import Search from './Search';
import Directions from './Directions';
import StyleSwitch from './StyleSwitch';
import TrafficSwitch from './TrafficSwitch';

class App extends Component {
  render() {
    return (
      <div className='root'>
        <Map/>
        <div className='relative m12 m24-mm w420-mm flex-parent flex-parent--column'>
          {
            (this.props.mode === 'directions')
            ? <Directions/>
            : <Search/>
          }
        </div>
        {
          (window.innerWidth > 640)
          ? <div className='absolute bottom mb36 mx12 bg-white shadow-darken25 px3 py3'>
              <div className='relative'>
                <TrafficSwitch/>
              </div>
              <div className='style-switch'>
                <StyleSwitch/>
              </div>
            </div>
          : null
        }
        {
          (this.props.contextMenuActive === true)
          ? <ContextMenu/>
          : null
        }
      </div>
    );
  }
}

App.propTypes = {
  contextMenuActive: PropTypes.bool,
  mode: PropTypes.string,
  route: PropTypes.object,
  routeStatus: PropTypes.string,
};

const mapStateToProps = (state) => {
  return {
    contextMenuActive: state.contextMenuActive,
    mode: state.mode,
    route: state.route,
    routeStatus: state.routeStatus
  };
};

const mapDispatchToProps = () => {
  return {};
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App);
