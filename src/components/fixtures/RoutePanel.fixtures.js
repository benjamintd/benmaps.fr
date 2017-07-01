const bikeRoute = {
  legs: [
    {
      steps: [],
      weight: 1053.9,
      distance: 2646.9,
      summary: '',
      duration: 991.8
    }
  ],
  'weight_name': 'cyclability',
  geometry: {
    type: 'LineString',
    coordinates: [
      [
        -122.43737,
        37.76234
      ],
      [
        -122.44779,
        37.75146
      ]
    ]
  },
  weight: 1053.9,
  distance: 2646.9,
  duration: 991.8
};

const walkingRoute = {
  legs: [
    {
      steps: [],
      weight: 708064.1,
      distance: 982407.5,
      summary: '',
      duration: 708064.1
    }
  ],
  'weight_name': 'duration',
  geometry: {
    type: 'LineString',
    coordinates: [
      [
        2.32027,
        48.85912
      ],
      [
        13.39323,
        52.50407
      ]
    ]
  },
  weight: 708064.1,
  distance: 982407.5,
  duration: 708064.1
};

export {bikeRoute, walkingRoute};
