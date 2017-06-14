import React from 'react';
import renderer from 'react-test-renderer';

import {RoutePanel} from './RoutePanel';
import {bikeRoute, walkingRoute} from './fixtures/RoutePanel.fixtures.js';

it('bike route renders correctly', () => {

  const component = renderer.create(
    <RoutePanel
      mapboxAccessToken='test'
      modality='bike'
      route={bikeRoute}
      routeStatus='idle'
    />
  );

  let tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

it('walking route renders correctly', () => {

  const component = renderer.create(
    <RoutePanel
      mapboxAccessToken='test'
      modality='walk'
      route={walkingRoute}
      routeStatus='idle'
    />
  );

  let tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

it('pending route renders correctly', () => {

  const component = renderer.create(
    <RoutePanel
      mapboxAccessToken='test'
      modality='walk'
      route={null}
      routeStatus='pending'
    />
  );

  let tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});

it('error route renders correctly', () => {

  const component = renderer.create(
    <RoutePanel
      mapboxAccessToken='test'
      modality='walk'
      route={null}
      routeStatus='error'
    />
  );

  let tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});
