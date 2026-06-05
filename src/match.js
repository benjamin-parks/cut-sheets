const TOLERANCE_FT = 50.0;

function dist2d(n1, e1, n2, e2) {
  const dn = parseFloat(n1) - parseFloat(n2);
  const de = parseFloat(e1) - parseFloat(e2);
  return Math.sqrt(dn * dn + de * de);
}

// For each field point (excluding cck### check shots), find the nearest
// design point within TOLERANCE_FT and compute cut/fill.
// Multiple field points can match the same design point.
export function matchPoints(surveyPoints, designPoints) {
  return surveyPoints
    .filter(sp => !/^cck/i.test((sp.code || '').trim()))
    .map(sp => {
      let best     = null;
      let bestDist = Infinity;

      for (const dp of designPoints) {
        const d = dist2d(sp.northing, sp.easting, dp.northing, dp.easting);
        if (d < bestDist && d <= TOLERANCE_FT) { bestDist = d; best = dp; }
      }

      const unmatched  = best === null;
      const designElev = best ? parseFloat(best.elevation) : NaN;
      const surveyElev = parseFloat(sp.elevation);
      const cutFill    = (!unmatched && !isNaN(designElev) && !isNaN(surveyElev) && designElev !== 0)
        ? surveyElev - designElev
        : null;

      return {
        name:             sp.name,
        northing:         sp.northing,
        easting:          sp.easting,
        elevation:        sp.elevation,
        code:             sp.code,
        hz_angle:         sp.hz_angle   ?? '',
        vert_angle:       sp.vert_angle ?? '',
        slope_dist:       sp.slope_dist ?? '',
        horiz_dist:       sp.horiz_dist ?? '',
        delta_elev:       sp.delta_elev ?? '',
        ppm:              sp.ppm        ?? '',
        method:           sp.method     ?? '',
        design_point_name: best?.name   ?? '',
        design_elev:      !isNaN(designElev) && designElev !== 0 ? best.elevation : '',
        cut_fill:         cutFill,
        match_dist:       best ? bestDist : null,
        unmatched,
      };
    });
}
