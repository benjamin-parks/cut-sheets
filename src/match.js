const TOLERANCE_FT = 50.0;

function dist2d(n1, e1, n2, e2) {
  const dn = parseFloat(n1) - parseFloat(n2);
  const de = parseFloat(e1) - parseFloat(e2);
  return Math.sqrt(dn * dn + de * de);
}

// Returns true if the field point description contains the design point name
// as a standalone number token (e.g. "25' os hub 10001 - 10002" contains "10001").
function descContainsName(code, name) {
  if (!code || !name) return false;
  // Word-boundary match so "1000" doesn't match inside "10001"
  return new RegExp(`(?<![\\d])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\d])`).test(code);
}

// Match priority for each design point:
//   1. Field points whose description EXACTLY equals the design point name
//   2. Field points whose description CONTAINS the design point name as a token
//      (e.g. "25' os hub 10001 - 10002" matches design "10001")
//      If multiple, pick the closest.
//   3. Nearest field point by N/E within TOLERANCE_FT, skipping same-named
//      field points (avoids matching a design point to its own survey shot).
export function matchPoints(surveyPoints, designPoints) {
  return designPoints.map(dp => {
    const dpName = (dp.name || '').trim();

    let best     = null;
    let bestDist = Infinity;
    let matchMethod = 'proximity';

    // Priority 1 — exact description match
    const exactMatches = surveyPoints.filter(sp =>
      (sp.code || '').trim() === dpName
    );
    if (exactMatches.length > 0) {
      for (const sp of exactMatches) {
        const d = dist2d(dp.northing, dp.easting, sp.northing, sp.easting);
        if (d < bestDist) { bestDist = d; best = sp; }
      }
      matchMethod = 'description (exact)';
    }

    // Priority 2 — partial description match (description contains name as a token)
    if (!best) {
      const partialMatches = surveyPoints.filter(sp =>
        (sp.name || '').trim() !== dpName &&          // exclude same-named shot
        descContainsName(sp.code || '', dpName)
      );
      if (partialMatches.length > 0) {
        for (const sp of partialMatches) {
          const d = dist2d(dp.northing, dp.easting, sp.northing, sp.easting);
          if (d < bestDist) { bestDist = d; best = sp; }
        }
        matchMethod = 'description (partial)';
      }
    }

    // Priority 3 — proximity fallback (skip same-named field point)
    if (!best) {
      for (const sp of surveyPoints) {
        if ((sp.name || '').trim() === dpName) continue;
        const d = dist2d(dp.northing, dp.easting, sp.northing, sp.easting);
        if (d < bestDist && d <= TOLERANCE_FT) { bestDist = d; best = sp; }
      }
    }

    const unmatched   = best === null;
    const designElev  = parseFloat(dp.elevation);
    const surveyElev  = best ? parseFloat(best.elevation) : NaN;
    const cutFill     = (!unmatched && !isNaN(designElev) && !isNaN(surveyElev) && designElev !== 0)
      ? surveyElev - designElev
      : null;

    return {
      name:             dpName,
      // Use design point coordinates — that's where the crew needs to go
      northing:         dp.northing,
      easting:          dp.easting,
      elevation:        best?.elevation ?? '',
      code:             dp.code || best?.code || '',
      hz_angle:         best?.hz_angle   ?? '',
      vert_angle:       best?.vert_angle ?? '',
      slope_dist:       best?.slope_dist ?? '',
      horiz_dist:       best?.horiz_dist ?? '',
      delta_elev:       best?.delta_elev ?? '',
      ppm:              best?.ppm        ?? '',
      method:           best?.method     ?? '',
      field_point_name: best?.name       ?? '',
      design_elev:      isNaN(designElev) || designElev === 0 ? '' : dp.elevation,
      cut_fill:         cutFill,
      match_dist:       best ? bestDist : null,
      match_method:     matchMethod,
      unmatched,
    };
  });
}
