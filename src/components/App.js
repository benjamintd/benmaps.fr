import React, { Component } from 'react';
import {connect} from 'react-redux';
import MapComponent from './Map';
import Search from './Search';
import RoutePanel from './RoutePanel';
import Directions from './Directions';

class App extends Component {
  render() {
    return (
      <div>
        <MapComponent/>
        <div className='flex-parent flex-parent--column'>
          {
            this.props.mode === 'directions'
            ?
            <Directions/>
            :
            <Search/>
          }
          {
            (this.props.route || this.props.routeStatus === 'error')
            ?
            <RoutePanel/>
            :
            null
          }
        </div>
      </div>
    );
  }
}

App.propTypes = {
  mode: React.PropTypes.string,
  route: React.PropTypes.object,
  routeStatus: React.PropTypes.string
}

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
