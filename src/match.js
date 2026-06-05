const TOLERANCE_FT = 50.0;

function dist2d(n1, e1, n2, e2) {
  const dn = parseFloat(n1) - parseFloat(n2);
  const de = parseFloat(e1) - parseFloat(e2);
  return Math.sqrt(dn * dn + de * de);
}

// For each design point, find the best matching survey point using this priority:
//   1. Field points whose description exactly matches the design point name
//      (e.g. field desc "10000" → design point "10000")
//      If multiple description matches, pick the closest by N/E.
//   2. Fallback: nearest field point by N/E within TOLERANCE_FT,
//      excluding field points that share the same name as the design point
//      (avoids matching a design point to its own coincident survey shot).
export function matchPoints(surveyPoints, designPoints) {
  return designPoints.map(dp => {
    const dpName = (dp.name || '').trim();

    // Priority 1 — description-to-name match
    const descMatches = surveyPoints.filter(sp =>
      (sp.code || '').trim() === dpName
    );

    let best = null;
    let bestDist = Infinity;

    if (descMatches.length > 0) {
      for (const sp of descMatches) {
        const d = dist2d(dp.northing, dp.easting, sp.northing, sp.easting);
        if (d < bestDist) { bestDist = d; best = sp; }
      }
    }

    // Priority 2 — proximity fallback (skip same-named field point)
    if (!best) {
      for (const sp of surveyPoints) {
        if ((sp.name || '').trim() === dpName) continue; // skip coincident shot
        const d = dist2d(dp.northing, dp.easting, sp.northing, sp.easting);
        if (d < bestDist && d <= TOLERANCE_FT) { bestDist = d; best = sp; }
      }
    }

    const unmatched = best === null;

    const designElev = parseFloat(dp.elevation);
    const surveyElev = best ? parseFloat(best.elevation) : NaN;
    // positive = cut (digging down), negative = fill (building up)
    const cutFill = (!unmatched && !isNaN(designElev) && !isNaN(surveyElev) && designElev !== 0)
      ? surveyElev - designElev
      : null;

    return {
      name:       dpName,
      northing:   best?.northing ?? dp.northing,
      easting:    best?.easting  ?? dp.easting,
      elevation:  best?.elevation ?? '',
      code:       best?.code || dp.code || '',
      hz_angle:   best?.hz_angle   ?? '',
      vert_angle: best?.vert_angle ?? '',
      slope_dist: best?.slope_dist ?? '',
      horiz_dist: best?.horiz_dist ?? '',
      delta_elev: best?.delta_elev ?? '',
      ppm:        best?.ppm    ?? '',
      method:     best?.method ?? '',
      field_point_name: best?.name ?? '',
      design_elev:  isNaN(designElev) || designElev === 0 ? '' : dp.elevation,
      cut_fill:     cutFill,
      match_dist:   best ? bestDist : null,
      match_method: descMatches.length > 0 && best ? 'description' : 'proximity',
      unmatched,
    };
  });
}
