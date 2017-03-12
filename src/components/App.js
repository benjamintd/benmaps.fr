import React, { Component } from 'react';
import MapComponent from './Map';
import Search from './Search';

class App extends Component {
  render() {
    return (
      <div>
        <MapComponent/>
        <Search/>
      </div>
    );
  }
}

export default App;
