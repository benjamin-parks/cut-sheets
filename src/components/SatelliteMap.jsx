import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import proj4 from 'proj4';
import 'leaflet/dist/leaflet.css';
import { offsetDesc } from '../utils.js';

// Mirrors the canvas map's dot suppression.
const SUPPRESS_FT = 0.5;
const isDotVisible = mp =>
  mp.unmatched || !mp.design_point_name || (mp.match_dist ?? Infinity) > SUPPRESS_FT;

// Convert county N/E (US survey feet) to [lat, lng].
function makeConverter(projDef) {
  const conv = proj4(projDef, 'EPSG:4326');
  return (northing, easting) => {
    const [lng, lat] = conv.forward([parseFloat(easting), parseFloat(northing)]);
    return [lat, lng];
  };
}

export default function SatelliteMap({ mergedPoints, designPoints, projDef }) {
  const data = useMemo(() => {
    let toLatLng;
    try {
      toLatLng = makeConverter(projDef);
    } catch {
      return null;
    }

    try {
      const design = designPoints
        .filter(dp => isFinite(parseFloat(dp.northing)) && isFinite(parseFloat(dp.easting)))
        .map(dp => ({ ...dp, ll: toLatLng(dp.northing, dp.easting) }));
      const staked = mergedPoints
        .filter(mp => isFinite(parseFloat(mp.northing)) && isFinite(parseFloat(mp.easting)))
        .map(mp => ({ ...mp, ll: toLatLng(mp.northing, mp.easting) }));

      const designByName = Object.fromEntries(design.map(d => [d.name, d]));
      const lines = staked
        .filter(mp => mp.design_point_name && !mp.unmatched && isDotVisible(mp) && designByName[mp.design_point_name])
        .map(mp => ({ key: mp.name, from: mp.ll, to: designByName[mp.design_point_name].ll }));

      const all = [...design.map(d => d.ll), ...staked.map(s => s.ll)];
      if (!all.length) return null;
      const lats = all.map(p => p[0]), lngs = all.map(p => p[1]);
      const bounds = [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]];
      // Sanity check: coordinates should land in/near Minnesota
      const cLat = (bounds[0][0] + bounds[1][0]) / 2;
      const cLng = (bounds[0][1] + bounds[1][1]) / 2;
      if (cLat < 42 || cLat > 50 || cLng < -98 || cLng > -88) return { outOfRange: true };

      return { design, staked, lines, bounds };
    } catch {
      return null;
    }
  }, [mergedPoints, designPoints, projDef]);

  if (!data) {
    return <div className="sat-error">Could not convert coordinates with the selected county projection.</div>;
  }
  if (data.outOfRange) {
    return <div className="sat-error">Converted coordinates fall outside Minnesota — this is probably not the right county. Try another.</div>;
  }

  return (
    <MapContainer
      bounds={data.bounds}
      boundsOptions={{ padding: [30, 30] }}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom
      attributionControl={true}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics"
        maxZoom={21}
        maxNativeZoom={19}
      />

      {data.lines.map(l => (
        <Polyline key={`ln-${l.key}`} positions={[l.from, l.to]} pathOptions={{ color: '#818cf8', weight: 2, opacity: 0.85 }} />
      ))}

      {data.design.map(dp => (
        <CircleMarker
          key={`d-${dp.name}`}
          center={dp.ll}
          radius={6}
          pathOptions={{ color: '#fff', weight: 1.5, fillColor: '#ef4444', fillOpacity: 1 }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            <strong>{dp.name}</strong>{dp.code ? ` · ${dp.code}` : ''}<br />
            <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>Computed point</span>
          </Tooltip>
        </CircleMarker>
      ))}

      {data.staked.filter(isDotVisible).map(mp => (
        <CircleMarker
          key={`s-${mp.name}`}
          center={mp.ll}
          radius={6}
          pathOptions={{ color: '#fff', weight: 1.5, fillColor: '#3b82f6', fillOpacity: 1 }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            <strong>{mp.name}</strong> · {offsetDesc(mp)}<br />
            {mp.cut_fill !== null && mp.cut_fill !== undefined && (
              <span style={{ fontWeight: 600 }}>
                {mp.cut_fill >= 0 ? 'Cut' : 'Fill'} {Math.abs(mp.cut_fill).toFixed(2)}′<br />
              </span>
            )}
            <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>Staked point</span>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
