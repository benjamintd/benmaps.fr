// forked from https://github.com/mapbox/react-geocoder

import React from 'react';
import ReactDOM from 'react-dom';
import {connect} from 'react-redux';
import PlaceName from './PlaceName';
import xhr from 'xhr';

/**
 * Geocoder component: connects to Mapbox.com Geocoding API
 * and provides an autocompleting interface for finding locations.
 */
var Geocoder = React.createClass({
  getDefaultProps() {
    return {
      endpoint: 'https://api.tiles.mapbox.com',
      inputPosition: 'top',
      inputPlaceholder: 'Search',
      source: 'mapbox.places',
      bbox: '',
      types: '',
      onSuggest: function() {}
    };
  },
  getInitialState() {
    return {
      results: [],
      focus: null,
      loading: false,
      searchTime: new Date()
    };
  },
  propTypes: {
    endpoint: React.PropTypes.string,
    source: React.PropTypes.string,
    inputPosition: React.PropTypes.string,
    inputPlaceholder: React.PropTypes.string,
    inputClass: React.PropTypes.string,
    resultsClass: React.PropTypes.string,
    onSelect: React.PropTypes.func.isRequired,
    onSuggest: React.PropTypes.func,
    accessToken: React.PropTypes.string.isRequired,
    proximity: React.PropTypes.string,
    bbox: React.PropTypes.string,
    focusOnMount: React.PropTypes.bool,
    types: React.PropTypes.string,
    searchString: React.PropTypes.string,
    writeSearch: React.PropTypes.func
  },
  onInput(e) {
    this.setState({loading:true});
    var value = e.target.value;
    if (value === '') {
      this.setState({
        results: [],
        focus: null,
        loading:false
      });
    } else {
      search(
        this.props.endpoint,
        this.props.source,
        this.props.accessToken,
        this.props.proximity,
        this.props.bbox,
        this.props.types,
        value,
        this.onResult);
    }
    this.props.writeSearch(value);
  },
  moveFocus(dir) {
    if(this.state.loading) return;
    this.setState({
      focus: this.state.focus === null ?
        0 : Math.max(0,
          Math.min(
            this.state.results.length - 1,
            this.state.focus + dir))
    });
  },
  acceptFocus() {
    if (this.state.focus !== null) {
      this.props.onSelect(this.state.results[this.state.focus]);
    }
  },
  onKeyDown(e) {
    switch (e.which) {
      // up
      case 38:
        e.preventDefault();
        this.moveFocus(-1);
        break;
      // down
      case 40:
        this.moveFocus(1);
        break;
      // accept
      case 13:
        if( this.state.results.length > 0 && this.state.focus == null) {
          this.clickOption(this.state.results[0],0);
        }
        this.acceptFocus();
        break;

      default:
        break;
    }
  },
  onResult(err, res, body, searchTime) {
    // searchTime is compared with the last search to set the state
    // to ensure that a slow xhr response does not scramble the
    // sequence of autocomplete display.
    if (!err && body && body.features && this.state.searchTime <= searchTime) {
      this.setState({
        searchTime: searchTime,
        loading: false,
        results: body.features,
        focus: null
      });
      this.props.onSuggest(this.state.results);
    }
  },
  clickOption(place, listLocation) {
    this.props.onSelect(place);
    this.setState({focus:listLocation});
    // focus on the input after click to maintain key traversal
    ReactDOM.findDOMNode(this.refs.input).focus(); // eslint-disable-line
    return false;
  },
  render() {
    var input = <input
      ref='input'
      className={this.props.inputClass}
      onInput={this.onInput}
      onKeyDown={this.onKeyDown}
      value={this.props.searchString}
      onChange={this.onInput}
      placeholder={this.props.inputPlaceholder}
      type='text' />;

    return (
      <div className='w-full'>
        {this.props.inputPosition === 'top' && input}
        {this.state.results.length > 0 && this.props.searchString !== '' && (
          <ul className={this.props.resultsClass}>
            {this.state.results.map((result, i) => (
              <li
                key={result.id}
                className={(i === this.state.focus ? 'bg-blue-faint' : 'bg-gray-faint-on-hover') + ' h36 flex-parent flex-parent--center-cross pr12 cursor-pointer w-full w420-mm'}
                onClick={this.clickOption.bind(this, result, i)}
              >
                <div className='absolute flex-parent flex-parent--center-cross flex-parent--center-main w42 h42'>
                  <svg className='icon color-darken25'><use xlinkHref='#icon-marker'></use></svg>
                </div>
                <div className='pl42 pr12 txt-truncate' key={result.id}>
                  <PlaceName location={result}/>
                </div>
              </li>
            ))}
          </ul>
        )}
        {this.props.inputPosition === 'bottom' && input}
      </div>
    );
  }
});

function search(endpoint, source, accessToken, proximity, bbox, types, query, callback) {
  var searchTime = new Date();
  var uri = endpoint + '/geocoding/v5/' +
    source + '/' + encodeURIComponent(query) + '.json' +
    '?access_token=' + accessToken +
    (proximity ? '&proximity=' + proximity : '') +
    (bbox ? '&bbox=' + bbox : '') +
    (types ? '&types=' + encodeURIComponent(types) : '');
  xhr({
    uri: uri,
    json: true
  }, function(err, res, body) {
    callback(err, res, body, searchTime);
  });
}

const mapStateToProps = (state) => {
  return {
    accessToken: state.mapboxAccessToken,
    proximity: state.mapZoom > 7 ? state.mapCenter.join(',') : ''
  };
};

export default connect(
  mapStateToProps
)(Geocoder);
