import React from 'react';
import {shallow} from 'enzyme';
import toJson from 'enzyme-to-json';
import RouteElevation from './RouteElevation';
import {bikeRoute} from './fixtures/RoutePanel.fixtures.js';

it('renders correctly', () => {
  const component = shallow(
    <RouteElevation
      accessToken='test'
      route={bikeRoute}
    />
  );

  component.setState({elevations: [-10, 30, 50, 100, 75, 20], status: 'ok'});

  let tree = toJson(component);
  expect(tree).toMatchSnapshot();
});
