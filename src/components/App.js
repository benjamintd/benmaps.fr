import React, {Component} from 'react';
import {connect} from 'react-redux';
import MapComponent from './Map';
import Search from './Search';
import Directions from './Directions';
import StyleSwitch from './StyleSwitch';

class App extends Component {
  render() {
    return (
      <div className='root'>
        <MapComponent/>
        <div className='relative m12 m24-mm w420-mm flex-parent flex-parent--column'>
          {
            this.props.mode === 'directions'
            ? <Directions/>
            : <Search/>
          }
        </div>
        {
          (window.innerWidth > 640)
          ? <div className='style-switch absolute bottom mb36 mx12 border border--2 border--white shadow-darken25'>
            <StyleSwitch/>
          </div>
          : null
        }
      </div>
    );
  }
}

App.propTypes = {
  mode: React.PropTypes.string,
  route: React.PropTypes.object,
  routeStatus: React.PropTypes.string
};

const mapStateToProps = (state) => {
  return {
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
