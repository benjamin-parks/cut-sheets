
function dist2d(n1, e1, n2, e2) {
  const dn = parseFloat(n1) - parseFloat(n2);
  const de = parseFloat(e1) - parseFloat(e2);
  return Math.sqrt(dn * dn + de * de);
}

// If the code contains a ####-#### pattern, return the digits before the dash.
function extractCodeRef(code) {
  const m = (code || '').match(/\b(\d+)\s*-\s*\d+/);
  return m ? m[1] : null;
}

// For each field point (excluding cck### check shots), find the nearest
// design point within TOLERANCE_FT and compute cut/fill.
// If the point's description contains a ####-#### pattern, the number before
// the dash is used as a direct name lookup against the design file first;
// proximity search is only used when no such reference exists or it doesn't match.
export function matchPoints(surveyPoints, designPoints, toleranceFt = 50) {
  const designNames  = new Set(designPoints.map(dp => (dp.name || '').trim()));
  const designByName = Object.fromEntries(designPoints.map(dp => [(dp.name || '').trim(), dp]));

  return surveyPoints
    .filter(sp => !/^cck/i.test((sp.code || '').trim()))
    .filter(sp => !designNames.has((sp.name || '').trim()))
    .filter(sp => isNaN(sp.name) || parseFloat(sp.name) > 999)
    .map(sp => {
      // 1. Try direct name lookup from ####-#### code reference
      const codeRef = extractCodeRef(sp.code);
      let best      = codeRef ? (designByName[codeRef] ?? null) : null;

      // 2. Fall back to nearest-in-proximity
      let bestDist = best ? dist2d(sp.northing, sp.easting, best.northing, best.easting) : Infinity;
      if (!best) {
        for (const dp of designPoints) {
          const d = dist2d(sp.northing, sp.easting, dp.northing, dp.easting);
          if (d < bestDist && d <= toleranceFt + 1) { bestDist = d; best = dp; }
        }
      }

      const unmatched  = best === null;
      const designElev = best ? parseFloat(best.elevation) : NaN;
      const surveyElev = parseFloat(sp.elevation);
      const cutFill    = (!unmatched && !isNaN(designElev) && !isNaN(surveyElev) && designElev !== 0)
        ? surveyElev - designElev
        : null;

      return {
        name:              sp.name,
        northing:          sp.northing,
        easting:           sp.easting,
        elevation:         sp.elevation,
        code:              sp.code,
        hz_angle:          sp.hz_angle   ?? '',
        vert_angle:        sp.vert_angle ?? '',
        slope_dist:        sp.slope_dist ?? '',
        horiz_dist:        sp.horiz_dist ?? '',
        delta_elev:        sp.delta_elev ?? '',
        ppm:               sp.ppm        ?? '',
        method:            sp.method     ?? '',
        design_point_name: best?.name    ?? '',
        design_point_code: best?.code    ?? '',
        design_elev:       !isNaN(designElev) && designElev !== 0 ? best.elevation : '',
        cut_fill:          cutFill,
        match_dist:        best ? bestDist : null,
        unmatched,
      };
    });
}
