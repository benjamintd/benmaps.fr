import PropTypes from 'prop-types';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import ContextMenu from './ContextMenu';
import Map from './Map';
import Search from './Search';
import Directions from './Directions';
import StyleSwitch from './StyleSwitch';
import TrafficSwitch from './TrafficSwitch';
import {setStateFromURL} from '../actions/index';

class App extends Component {

  componentWillMount() {
    this.props.setStateFromURL();
  }

  render() {
    var moveOnLoad = this.props.url
      .split('/')
      .map(e => !e.startsWith('+'))
      .reduce((a, b) => (a && b), true);

    return (
      <div className='root'>
        <Map moveOnLoad={moveOnLoad}/>
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
  setStateFromURL: PropTypes.func,
  url: PropTypes.string
};

const mapStateToProps = (state) => {
  return {
    contextMenuActive: state.app.contextMenuActive,
    mode: state.app.mode,
    route: state.app.route,
    routeStatus: state.app.routeStatus,
    url: state.router.location.pathname
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setStateFromURL: () => dispatch(setStateFromURL())
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App);
