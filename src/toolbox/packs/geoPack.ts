/**
 * Geo & Maps pack — great-circle math, coordinate formats, geohash, map tiles.
 * All pure spherical-earth math (R = 6371 km), fully offline.
 */
import { ToolboxTool } from '../types';

const t = (
  id: string,
  name: string,
  description: string,
  inputHint: string,
  run: (s: string) => string,
  tags: string[] = [],
  example?: string
): ToolboxTool => ({
  id, name, description, category: 'geo', tags: ['geo', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const R = 6371; // km
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const bad = (hint: string) => `Format: ${hint}`;

/** Parse "lat,lon" pair. */
const pt = (s: string): [number, number] | null => {
  const m = s.trim().match(/^(-?[\d.]+)\s*,\s*(-?[\d.]+)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]), lon = parseFloat(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [lat, lon] : null;
};

const haversine = (a: [number, number], b: [number, number]): number => {
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const GH32 = '0123456789bcdefghjkmnpqrstuvwxyz';

const geohashEncode = (lat: number, lon: number, precision: number): string => {
  let latLo = -90, latHi = 90, lonLo = -180, lonHi = 180;
  let hash = '', bit = 0, ch = 0, even = true;
  while (hash.length < precision) {
    if (even) {
      const mid = (lonLo + lonHi) / 2;
      if (lon >= mid) { ch = (ch << 1) | 1; lonLo = mid; } else { ch <<= 1; lonHi = mid; }
    } else {
      const mid = (latLo + latHi) / 2;
      if (lat >= mid) { ch = (ch << 1) | 1; latLo = mid; } else { ch <<= 1; latHi = mid; }
    }
    even = !even;
    if (++bit === 5) { hash += GH32[ch]; bit = 0; ch = 0; }
  }
  return hash;
};

const geohashDecode = (hash: string): [number, number, number, number] | null => {
  let latLo = -90, latHi = 90, lonLo = -180, lonHi = 180, even = true;
  for (const c of hash.toLowerCase()) {
    const idx = GH32.indexOf(c);
    if (idx < 0) return null;
    for (let b = 4; b >= 0; b--) {
      const bit = (idx >> b) & 1;
      if (even) { const mid = (lonLo + lonHi) / 2; if (bit) lonLo = mid; else lonHi = mid; }
      else { const mid = (latLo + latHi) / 2; if (bit) latLo = mid; else latHi = mid; }
      even = !even;
    }
  }
  return [(latLo + latHi) / 2, (lonLo + lonHi) / 2, latHi - latLo, lonHi - lonLo];
};

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export const geoPack: ToolboxTool[] = [
  t('geo-distance', 'Distance Between Points', 'Great-circle distance (haversine). Format: lat,lon::lat,lon', 'lat,lon::lat,lon', (s) => {
    const [a, b] = s.split('::').map(pt); if (!a || !b) return bad('40.7128,-74.0060::51.5074,-0.1278');
    const km = haversine(a, b);
    return `${km.toFixed(1)} km · ${(km * 0.621371).toFixed(1)} mi · ${(km * 0.539957).toFixed(1)} nm`;
  }, ['distance', 'haversine'], '40.7128,-74.0060::51.5074,-0.1278'),
  t('geo-bearing', 'Initial Bearing', 'Compass bearing from point A to point B. Format: lat,lon::lat,lon', 'lat,lon::lat,lon', (s) => {
    const [a, b] = s.split('::').map(pt); if (!a || !b) return bad('40.71,-74.00::51.50,-0.12');
    const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
    const x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
    const brg = (deg(Math.atan2(y, x)) + 360) % 360;
    return `${brg.toFixed(1)}° (${COMPASS[Math.round(brg / 22.5) % 16]})`;
  }, ['bearing', 'compass'], '40.71,-74.00::51.50,-0.12'),
  t('geo-midpoint', 'Midpoint of Two Points', 'Geographic midpoint on the great circle. Format: lat,lon::lat,lon', 'lat,lon::lat,lon', (s) => {
    const [a, b] = s.split('::').map(pt); if (!a || !b) return bad('40.71,-74.00::51.50,-0.12');
    const dLon = rad(b[1] - a[1]);
    const bx = Math.cos(rad(b[0])) * Math.cos(dLon), by = Math.cos(rad(b[0])) * Math.sin(dLon);
    const lat = Math.atan2(Math.sin(rad(a[0])) + Math.sin(rad(b[0])), Math.sqrt((Math.cos(rad(a[0])) + bx) ** 2 + by ** 2));
    const lon = rad(a[1]) + Math.atan2(by, Math.cos(rad(a[0])) + bx);
    return `${deg(lat).toFixed(5)}, ${((deg(lon) + 540) % 360 - 180).toFixed(5)}`;
  }, ['midpoint'], '40.71,-74.00::51.50,-0.12'),
  t('geo-destination', 'Destination Point', 'Where you land from start + bearing + distance. Format: lat,lon::bearing°::km', 'lat,lon::deg::km', (s) => {
    const p = s.split('::'); const a = pt(p[0]); const brg = parseFloat(p[1]); const d = parseFloat(p[2]);
    if (!a || isNaN(brg) || isNaN(d)) return bad('48.8566,2.3522::90::100');
    const dr = d / R;
    const lat = Math.asin(Math.sin(rad(a[0])) * Math.cos(dr) + Math.cos(rad(a[0])) * Math.sin(dr) * Math.cos(rad(brg)));
    const lon = rad(a[1]) + Math.atan2(Math.sin(rad(brg)) * Math.sin(dr) * Math.cos(rad(a[0])), Math.cos(dr) - Math.sin(rad(a[0])) * Math.sin(lat));
    return `${deg(lat).toFixed(5)}, ${((deg(lon) + 540) % 360 - 180).toFixed(5)}`;
  }, ['destination'], '48.8566,2.3522::90::100'),
  t('geo-dms-decimal', 'DMS → Decimal', 'Degrees-minutes-seconds to decimal degrees. Format: 40°26\'46"N or 40 26 46 N', 'DMS string', (s) => {
    const m = s.trim().match(/(\d+)[°\s]+(\d+)['\s]+([\d.]+)["\s]*([NSEW])?/i);
    if (!m) return bad(`40°26'46"N or 40 26 46 N`);
    let dec = +m[1] + +m[2] / 60 + +m[3] / 3600;
    if (m[4] && /[SW]/i.test(m[4])) dec = -dec;
    return dec.toFixed(6);
  }, ['dms', 'coordinates'], `40°26'46"N`),
  t('geo-decimal-dms', 'Decimal → DMS', 'Decimal degrees to degrees-minutes-seconds. Format: value::lat|lon', 'decimal::lat|lon', (s) => {
    const p = s.split('::'); const v = parseFloat(p[0]); if (isNaN(v)) return bad('40.446::lat');
    const isLat = (p[1] ?? 'lat').trim().toLowerCase() !== 'lon';
    const abs = Math.abs(v); const d = Math.floor(abs); const mFull = (abs - d) * 60; const mm = Math.floor(mFull);
    const ss = ((mFull - mm) * 60).toFixed(1);
    const hemi = isLat ? (v >= 0 ? 'N' : 'S') : v >= 0 ? 'E' : 'W';
    return `${d}°${mm}'${ss}"${hemi}`;
  }, ['dms'], '40.446::lat'),
  t('geo-validate', 'Coordinate Validator', 'Check a lat,lon pair is in range and classify hemisphere.', 'lat,lon', (s) => {
    const a = pt(s); if (!a) return 'INVALID — latitude must be −90..90, longitude −180..180 (format: lat,lon)';
    return `VALID · ${a[0] >= 0 ? 'Northern' : 'Southern'} + ${a[1] >= 0 ? 'Eastern' : 'Western'} hemisphere${Math.abs(a[0]) > 66.56 ? ' · polar region' : Math.abs(a[0]) < 23.44 ? ' · tropics' : ''}`;
  }, ['validate'], '40.7128,-74.0060'),
  t('geo-geohash-encode', 'Geohash Encode', 'Encode lat,lon to a geohash. Format: lat,lon[::precision 1-12]', 'lat,lon[::precision]', (s) => {
    const p = s.split('::'); const a = pt(p[0]); if (!a) return bad('57.64911,10.40744::11');
    const prec = Math.min(Math.max(parseInt(p[1]) || 9, 1), 12);
    return geohashEncode(a[0], a[1], prec);
  }, ['geohash'], '57.64911,10.40744::11'),
  t('geo-geohash-decode', 'Geohash Decode', 'Decode a geohash to lat,lon with error bounds.', 'geohash', (s) => {
    const d = geohashDecode(s.trim()); if (!d || !s.trim()) return 'Invalid geohash (base32: 0-9 b-z minus a,i,l,o).';
    return `${d[0].toFixed(6)}, ${d[1].toFixed(6)}\n± ${(d[2] / 2 * 111).toFixed(2)} km lat · ± ${(d[3] / 2 * 111).toFixed(2)} km lon (at equator)`;
  }, ['geohash'], 'u4pruydqqvj'),
  t('geo-tile', 'Lat/Lon → Map Tile', 'Slippy-map tile x/y for a zoom level. Format: lat,lon::zoom', 'lat,lon::zoom', (s) => {
    const p = s.split('::'); const a = pt(p[0]); const z = parseInt(p[1]);
    if (!a || isNaN(z) || z < 0 || z > 22) return bad('48.8566,2.3522::15');
    const n = 2 ** z;
    const x = Math.floor(((a[1] + 180) / 360) * n);
    const y = Math.floor(((1 - Math.log(Math.tan(rad(a[0])) + 1 / Math.cos(rad(a[0]))) / Math.PI) / 2) * n);
    return `z/x/y = ${z}/${x}/${y}`;
  }, ['tile', 'osm'], '48.8566,2.3522::15'),
  t('geo-tile-latlon', 'Map Tile → Lat/Lon', 'NW corner of a slippy tile. Format: z/x/y', 'z/x/y', (s) => {
    const m = s.trim().match(/^(\d+)\/(\d+)\/(\d+)$/); if (!m) return bad('15/16597/11273');
    const [z, x, y] = [+m[1], +m[2], +m[3]]; const n = 2 ** z;
    const lon = (x / n) * 360 - 180;
    const lat = deg(Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))));
    return `NW corner: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }, ['tile'], '15/16597/11273'),
  t('geo-compass-point', 'Degrees → Compass Point', '16-wind compass name for a bearing. Input: degrees', 'degrees', (s) => {
    const d = parseFloat(s); if (isNaN(d)) return 'Enter a bearing in degrees (0–360).';
    const norm = ((d % 360) + 360) % 360;
    return `${norm}° = ${COMPASS[Math.round(norm / 22.5) % 16]}`;
  }, ['compass'], '227'),
  t('geo-bbox', 'Bounding Box Around Point', 'Box of ±radius km around a point. Format: lat,lon::km', 'lat,lon::km', (s) => {
    const p = s.split('::'); const a = pt(p[0]); const km = parseFloat(p[1]);
    if (!a || !km) return bad('48.8566,2.3522::5');
    const dLat = km / 111.32;
    const dLon = km / (111.32 * Math.cos(rad(a[0])));
    return `South: ${(a[0] - dLat).toFixed(6)}\nNorth: ${(a[0] + dLat).toFixed(6)}\nWest:  ${(a[1] - dLon).toFixed(6)}\nEast:  ${(a[1] + dLon).toFixed(6)}`;
  }, ['bbox'], '48.8566,2.3522::5'),
  t('geo-deg-len', 'Length of 1° at Latitude', 'How many km one degree spans at a given latitude. Input: latitude', 'latitude', (s) => {
    const lat = parseFloat(s); if (isNaN(lat) || Math.abs(lat) > 90) return 'Enter a latitude (−90..90).';
    return `At ${lat}°:\n1° latitude ≈ 111.32 km (constant)\n1° longitude ≈ ${(111.32 * Math.cos(rad(lat))).toFixed(2)} km`;
  }, ['degree'], '48.85'),
];
