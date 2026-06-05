const TOLERANCE_FT = 1.0;

function dist2d(n1, e1, n2, e2) {
  const dn = parseFloat(n1) - parseFloat(n2);
  const de = parseFloat(e1) - parseFloat(e2);
  return Math.sqrt(dn * dn + de * de);
}

// For each design point, find the nearest survey point within tolerance.
// Returns an array of merged points in design-point order, each with:
//   ...surveyPoint fields, design_elev, cut_fill (signed ft), match_dist, unmatched (bool)
export function matchPoints(surveyPoints, designPoints) {
  return designPoints.map(dp => {
    const dpN = parseFloat(dp.northing);
    const dpE = parseFloat(dp.easting);
    if (isNaN(dpN) || isNaN(dpE)) {
      return { ...dp, design_elev: dp.elevation, cut_fill: null, match_dist: null, unmatched: true };
    }

    let best = null;
    let bestDist = Infinity;
    for (const sp of surveyPoints) {
      const d = dist2d(dpN, dpE, sp.northing, sp.easting);
      if (d < bestDist) { bestDist = d; best = sp; }
    }

    const unmatched = best === null || bestDist > TOLERANCE_FT;

    const designElev  = parseFloat(dp.elevation);
    const surveyElev  = best ? parseFloat(best.elevation) : NaN;
    // cut_fill: positive = cut (digging), negative = fill (building up)
    const cutFill = (!unmatched && !isNaN(designElev) && !isNaN(surveyElev))
      ? surveyElev - designElev
      : null;

    return {
      // prefer survey N/E/code; use design elevation as the design target
      name:       dp.name || (best?.name ?? ''),
      northing:   best?.northing ?? dp.northing,
      easting:    best?.easting  ?? dp.easting,
      elevation:  best?.elevation ?? '',      // surveyed (existing) elev
      code:       best?.code || dp.code || '',
      hz_angle:   best?.hz_angle   ?? '',
      vert_angle: best?.vert_angle ?? '',
      slope_dist: best?.slope_dist ?? '',
      horiz_dist: best?.horiz_dist ?? '',
      delta_elev: best?.delta_elev ?? '',
      ppm:        best?.ppm    ?? '',
      method:     best?.method ?? '',
      design_elev: isNaN(designElev) ? '' : String(dp.elevation),
      cut_fill:    cutFill,
      match_dist:  best ? bestDist : null,
      unmatched,
    };
  });
}
