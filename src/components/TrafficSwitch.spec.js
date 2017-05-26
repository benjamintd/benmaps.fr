import React from 'react';
import ReactDOM from 'react-dom';
import {shallow} from 'enzyme';
import {TrafficSwitch} from './TrafficSwitch';

it('renders without crashing', () => {
  const div = document.createElement('div');

  ReactDOM.render(<TrafficSwitch
    triggerMapUpdate={() => {}}
    mapStyle='streets'
    setStateValues={() => {}}
  />, div);

  expect(true).toBe(true);
});

it('switches style on change event', () => {
  const setStateValues = jest.fn();

  const trafficSwitch = shallow(
    <TrafficSwitch
      triggerMapUpdate={() => {}}
      mapStyle='streets'
      setStateValues={setStateValues}
    />
  );

  trafficSwitch.find('input').simulate('change', {target: {checked: true}});

  expect(setStateValues).toBeCalled();
  expect(setStateValues).toBeCalledWith({mapStyle: 'streets-traffic', needMapRestyle: true});
});
