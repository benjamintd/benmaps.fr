function parseUrl(url) {
  var props = {};
  var splits = url.split('/');
  splits.forEach(s => {
    if (s.startsWith('@')) { // Parse coords, noted with an @.
      props.coords = s.slice(1).split(',').map(Number);
    } else if (s.startsWith('+')) { // Parse search coords, noted with a +.
      props.searchCoords = s.slice(1).split(',').map(Number);
    } else if (s.startsWith('~')) { // Parse search place name, noted with a ~.
      props.searchPlace = decodeURI(s.slice(1));
    }
  });

  return props;
}

function toUrl(props) {
  var res = [baseUrl()];
  if (props.coords) {
    res.push('@' + [
      props.coords[0].toFixed(6),
      props.coords[1].toFixed(6),
      props.coords[2].toFixed(2),
    ].join(','));
  }
  if (props.searchCoords) {
    res.push('+' + props.searchCoords.map(e => e.toFixed(6)).join(','));
  }
  if (props.searchPlace) {
    res.push('~' + encodeURI(props.searchPlace));
  }

  return res.join('/');
}

function baseUrl() {
  if (process.env.NODE_ENV === 'production') {
    // return the pathname without trailing slash
    return new URL(process.env.PUBLIC_URL).pathname.replace(/\/+$/, '');
  } else {
    return '';
  }
}

export {toUrl, baseUrl, parseUrl};
