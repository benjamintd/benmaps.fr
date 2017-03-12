import React, { Component } from 'react';
import Map from './Map';
import Search from './Search';

class App extends Component {
  render() {
    return (
      <div>
        <Map/>
        <Search/>
      </div>
    );
  }
}

export default App;
