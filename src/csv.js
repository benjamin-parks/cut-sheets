function splitLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (const c of line) {
    if (c === '"')            { inQ = !inQ; }
    else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
    else                      { cur += c; }
  }
  result.push(cur);
  return result.map(s => s.replace(/^"|"$/g, '').trim());
}

const ALIASES = {
  name:       ['name','point name','point id','point','id','pt','pt name','point no','ptname','pt id'],
  northing:   ['northing','north','n','y','latitude','lat','yn','north(y)'],
  easting:    ['easting','east','e','x','longitude','lon','lng','xe','east(x)'],
  elevation:  ['elevation','elev','height','z','ht','h','elev(z)','alt'],
  code:       ['code','feature code','description','desc','notes','feature','attrib','attribute','feature_code'],
  hz_angle:   ['hz angle','horizontal angle','azimuth','bearing','direction','ha','hz','hz_angle'],
  vert_angle: ['vert angle','vertical angle','zenith','va','vert','v_angle','va_angle'],
  slope_dist: ['slope dist','slope distance','sd','distance','dist','slope_dist','s.dist'],
  horiz_dist: ['horiz dist','horizontal distance','hd','h.dist','horiz_dist'],
  delta_elev: ['delta elev','delta elevation','dz','de','height diff','delta_z','dh'],
  ppm:        ['ppm','parts per million','scale factor'],
  method:     ['method','obs method','observation method'],
};

function mapHeaders(headers) {
  const colMap = {};
  headers.forEach((h, i) => {
    const hl = h.toLowerCase().replace(/[_\-\s]+/g, ' ').trim();
    for (const [key, names] of Object.entries(ALIASES)) {
      if (colMap[key] !== undefined) continue;
      if (names.some(n => hl === n || hl.includes(n) || n.includes(hl))) {
        colMap[key] = i;
      }
    }
  });
  return colMap;
}

export function parseCSV(text, coordOrder = 'nez') {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) { alert('File appears empty or has no data rows.'); return null; }

  const headers = splitLine(lines[0]);
  const colMap  = mapHeaders(headers);

  if (colMap.name === undefined && headers.length >= 3) {
    colMap.name      ??= 0;
    colMap.northing  ??= 1;
    colMap.easting   ??= 2;
    colMap.elevation ??= 3;
    colMap.code      ??= 4;
  }

  const get = (parts, key) =>
    colMap[key] === undefined ? '' : (parts[colMap[key]] || '');

  const points = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = splitLine(lines[i]);
    if (parts.length < 2) continue;

    let n = get(parts, 'northing');
    let e = get(parts, 'easting');
    if (coordOrder === 'enz') { const tmp = n; n = e; e = tmp; }

    points.push({
      name:       get(parts, 'name') || String(i),
      northing:   n,
      easting:    e,
      elevation:  get(parts, 'elevation'),
      code:       get(parts, 'code'),
      hz_angle:   get(parts, 'hz_angle'),
      vert_angle: get(parts, 'vert_angle'),
      slope_dist: get(parts, 'slope_dist'),
      horiz_dist: get(parts, 'horiz_dist'),
      delta_elev: get(parts, 'delta_elev'),
      ppm:        get(parts, 'ppm'),
      method:     get(parts, 'method'),
    });
  }

  if (points.length === 0) { alert('No data rows found. Please check the CSV format.'); return null; }
  return points;
}
