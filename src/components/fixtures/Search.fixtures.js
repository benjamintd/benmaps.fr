const searchLocation = {
  id: 'place.228080',
  type: 'Feature',
  'place_type': [
    'region',
    'place'
  ],
  relevance: 0.99,
  properties: {
    wikidata: 'Q90',
    'short_code': 'FR-75'
  },
  text: 'Paris',
  'place_name': 'Paris, France',
  bbox: [
    2.224219,
    48.815754,
    2.469753,
    48.901973
  ],
  center: [
    2.320582,
    48.859489
  ],
  geometry: {
    type: 'Point',
    coordinates: [
      2.320582,
      48.859489
    ]
  }
};

const placeInfo = {
  label: 'Paris',
  description: 'Capital city of France',
  claims: {
    'P18': 'Airplane view Paris 01.jpg'
  }
};

export {searchLocation, placeInfo};
