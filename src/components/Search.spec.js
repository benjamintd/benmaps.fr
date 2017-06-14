import React from 'react';
import renderer from 'react-test-renderer';
import {shallow} from 'enzyme';
import {createStore} from 'redux';
import {Provider} from 'react-redux';
import {defaultState} from '../reducers/index';
import reducer from '../reducers/index';

import {Search} from './Search';
import ConnectedSearch from './Search';
import {placeInfo, searchLocation} from './fixtures/Search.fixtures.js';

it('renders correctly with search location', () => {

  const component = renderer.create(
    <Search
      getPlaceInfo={() => {}}
      placeInfo={placeInfo}
      resetStateKeys={() => {}}
      searchLocation={searchLocation}
      searchString='Paris'
      setDirectionsLocation={() => {}}
      setMode={() => {}}
      setPlaceInfo={() => {}}
      setSearchLocation={() => {}}
      triggerMapUpdate={() => {}}
      writeSearch={() => {}}
    />
  );

  let tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

it('renders correctly without search location', () => {

  let store = createStore(reducer, defaultState);

  const component = renderer.create(
    <Provider store={store}>
      <ConnectedSearch/>
    </Provider>
  );

  let tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

it('behaves correctly on clicking directions', () => {

  const setDirectionsLocation = jest.fn();
  const setMode = jest.fn();

  const search = shallow(
    <Search
      getPlaceInfo={() => {}}
      placeInfo={placeInfo}
      resetStateKeys={() => {}}
      searchLocation={searchLocation}
      searchString='Paris'
      setDirectionsLocation={setDirectionsLocation}
      setMode={setMode}
      setPlaceInfo={() => {}}
      setSearchLocation={() => {}}
      triggerMapUpdate={() => {}}
      writeSearch={() => {}}
    />
  );

  search.find('#search-directions').simulate('click');
  expect(setDirectionsLocation).toBeCalledWith('to', searchLocation);
  expect(setMode).toBeCalledWith('directions');
});
