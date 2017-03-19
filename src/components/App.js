import React, { Component } from 'react';
import {connect} from 'react-redux';
import MapComponent from './Map';
import Search from './Search';
import Directions from './Directions';

class App extends Component {
  render() {
    return (
      <div className='root'>
        <MapComponent/>
        <div className='relative m12 m24-mm flex-parent flex-parent--column'>
          {
            this.props.mode === 'directions'
            ?
            <Directions/>
            :
            <Search/>
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
