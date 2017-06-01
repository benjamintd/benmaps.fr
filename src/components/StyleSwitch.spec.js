import React from 'react';
import ReactDOM from 'react-dom';
import {shallow} from 'enzyme';
import {StyleSwitch} from './StyleSwitch';

it('renders without crashing', () => {
  const div = document.createElement('div');

  ReactDOM.render(<StyleSwitch
    accessToken='abc'
    center={[123, -37]}
    setStateValues={() => {}}
    mapStyle='streets'
    triggerMapUpdate={() => {}}
    zoom={14}
  />, div);

  expect(true).toBe(true);
});

it('switches style on change event', () => {
  const setStateValues = jest.fn();
  const triggerMapUpdate = jest.fn();

  const styleSwitch = shallow(
    <StyleSwitch
    accessToken='abc'
    center={[123, -37]}
    setStateValues={setStateValues}
    mapStyle='streets'
    triggerMapUpdate={triggerMapUpdate}
    zoom={14}
    />
  );

  const url = styleSwitch.find('img').prop('src');
  expect(url).toBe('https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/123,-37,10/56x100@2x?access_token=abc&attribution=false');


  styleSwitch.find('div').simulate('click');

  expect(setStateValues).toBeCalledWith({mapStyle: 'satellite', needMapRestyle: true});
  expect(triggerMapUpdate).toBeCalled();

});
