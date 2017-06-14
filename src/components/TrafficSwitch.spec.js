import React from 'react';
import renderer from 'react-test-renderer';
import {shallow} from 'enzyme';
import {TrafficSwitch} from './TrafficSwitch';

it('renders correctly', () => {

  const component = renderer.create(
    <TrafficSwitch
      triggerMapUpdate={() => {}}
      mapStyle='streets'
      setStateValues={() => {}}
    />
  );

  let tree = component.toJSON();
  expect(tree).toMatchSnapshot();
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
