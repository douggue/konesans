// Outlines for every country in core/content/world.ts, from Natural Earth (world-atlas 50m; 110m for the giants).
import { readFileSync, writeFileSync } from 'node:fs';
import * as topojson from 'topojson-client';
import { geoMercator, geoPath, geoBounds } from 'd3-geo';

const load = (n) => { const t = JSON.parse(readFileSync('node_modules/world-atlas/countries-' + n + '.json', 'utf8')); return Object.fromEntries(topojson.feature(t, t.objects.countries).features.map((f) => [f.properties.name, f])); };
const by50 = load('50m'), by110 = load('110m');
const coarse = new Set(['United States of America', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile', 'Australia', 'India', 'Colombia', 'Japan', 'China', 'Peru', 'Venezuela', 'Saudi Arabia', 'Nigeria', 'Kenya', 'New Zealand', 'Russia', 'Kazakhstan', 'Algeria', 'Dem. Rep. Congo', 'Sudan', 'Libya', 'Iran', 'Mongolia', 'Indonesia', 'Mali', 'Niger', 'Chad', 'Angola', 'South Africa', 'Ethiopia', 'Egypt', 'Mauritania', 'Bolivia', 'Tanzania', 'Pakistan', 'Turkey', 'Mozambique', 'Zambia', 'Myanmar', 'Afghanistan', 'Somalia', 'Ukraine', 'Madagascar', 'Botswana', 'Namibia', 'Norway', 'Sweden', 'Finland', 'Greenland']);
const pickF = (n) => (coarse.has(n) && by110[n]) ? by110[n] : by50[n];

// ISO alpha-2 → Natural Earth name
const NE = {
  HT: 'Haiti', DO: 'Dominican Rep.', CU: 'Cuba', JM: 'Jamaica', BS: 'Bahamas', TT: 'Trinidad and Tobago', BB: 'Barbados', DM: 'Dominica', LC: 'Saint Lucia', VC: 'St. Vin. and Gren.', GD: 'Grenada', AG: 'Antigua and Barb.', KN: 'St. Kitts and Nevis',
  US: 'United States of America', CA: 'Canada', MX: 'Mexico', GT: 'Guatemala', BZ: 'Belize', HN: 'Honduras', SV: 'El Salvador', NI: 'Nicaragua', CR: 'Costa Rica', PA: 'Panama',
  BR: 'Brazil', AR: 'Argentina', CL: 'Chile', CO: 'Colombia', PE: 'Peru', VE: 'Venezuela', EC: 'Ecuador', BO: 'Bolivia', PY: 'Paraguay', UY: 'Uruguay', GY: 'Guyana', SR: 'Suriname',
  FR: 'France', IT: 'Italy', ES: 'Spain', DE: 'Germany', GB: 'United Kingdom', PT: 'Portugal', GR: 'Greece', CH: 'Switzerland', BE: 'Belgium', NL: 'Netherlands', AT: 'Austria', PL: 'Poland', RU: 'Russia', UA: 'Ukraine', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', IE: 'Ireland', IS: 'Iceland', CZ: 'Czechia', SK: 'Slovakia', HU: 'Hungary', RO: 'Romania', BG: 'Bulgaria', RS: 'Serbia', HR: 'Croatia', SI: 'Slovenia', BA: 'Bosnia and Herz.', ME: 'Montenegro', MK: 'Macedonia', AL: 'Albania', XK: 'Kosovo', MD: 'Moldova', BY: 'Belarus', LT: 'Lithuania', LV: 'Latvia', EE: 'Estonia', LU: 'Luxembourg', MT: 'Malta', CY: 'Cyprus', AD: 'Andorra', MC: 'Monaco', SM: 'San Marino', LI: 'Liechtenstein', VA: 'Vatican',
  EG: 'Egypt', ZA: 'South Africa', NG: 'Nigeria', SN: 'Senegal', KE: 'Kenya', MA: 'Morocco', GH: 'Ghana', BJ: 'Benin', ET: 'Ethiopia', DZ: 'Algeria', TN: 'Tunisia', LY: 'Libya', SD: 'Sudan', SS: 'S. Sudan', CI: "Côte d'Ivoire", ML: 'Mali', NE: 'Niger', TD: 'Chad', BF: 'Burkina Faso', TG: 'Togo', GN: 'Guinea', GW: 'Guinea-Bissau', SL: 'Sierra Leone', LR: 'Liberia', GM: 'Gambia', MR: 'Mauritania', CV: 'Cabo Verde', CM: 'Cameroon', CF: 'Central African Rep.', CG: 'Congo', CD: 'Dem. Rep. Congo', GA: 'Gabon', GQ: 'Eq. Guinea', ST: 'São Tomé and Principe', AO: 'Angola', ZM: 'Zambia', ZW: 'Zimbabwe', MZ: 'Mozambique', MW: 'Malawi', TZ: 'Tanzania', UG: 'Uganda', RW: 'Rwanda', BI: 'Burundi', SO: 'Somalia', DJ: 'Djibouti', ER: 'Eritrea', BW: 'Botswana', NA: 'Namibia', LS: 'Lesotho', SZ: 'eSwatini', MG: 'Madagascar', MU: 'Mauritius', SC: 'Seychelles', KM: 'Comoros',
  CN: 'China', JP: 'Japan', IN: 'India', KR: 'South Korea', KP: 'North Korea', SA: 'Saudi Arabia', TR: 'Turkey', IR: 'Iran', IQ: 'Iraq', IL: 'Israel', PS: 'Palestine', JO: 'Jordan', LB: 'Lebanon', SY: 'Syria', AE: 'United Arab Emirates', QA: 'Qatar', KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman', YE: 'Yemen', AF: 'Afghanistan', PK: 'Pakistan', BD: 'Bangladesh', LK: 'Sri Lanka', NP: 'Nepal', BT: 'Bhutan', MV: 'Maldives', MM: 'Myanmar', TH: 'Thailand', VN: 'Vietnam', LA: 'Laos', KH: 'Cambodia', MY: 'Malaysia', SG: 'Singapore', ID: 'Indonesia', PH: 'Philippines', BN: 'Brunei', TL: 'Timor-Leste', MN: 'Mongolia', KZ: 'Kazakhstan', UZ: 'Uzbekistan', TM: 'Turkmenistan', KG: 'Kyrgyzstan', TJ: 'Tajikistan', GE: 'Georgia', AM: 'Armenia', AZ: 'Azerbaijan', TW: 'Taiwan',
  AU: 'Australia', NZ: 'New Zealand', PG: 'Papua New Guinea', FJ: 'Fiji', SB: 'Solomon Is.', VU: 'Vanuatu', WS: 'Samoa', TO: 'Tonga', KI: 'Kiribati', FM: 'Micronesia', MH: 'Marshall Is.', PW: 'Palau', NR: 'Nauru', TV: 'Tuvalu',
};

// Keep only the main part for countries whose far-away territories would shrink the outline to a dot
const keep = {
  US: (c) => c[0] > -130 && c[1] < 50 && c[1] > 24, FR: (c) => c[0] > -6 && c[0] < 10 && c[1] > 41 && c[1] < 52, ES: (c) => c[0] > -10 && c[1] > 35, CL: (c) => c[0] > -80, AU: (c) => c[1] > -44, CA: (c) => c[1] < 75,
  PT: (c) => c[0] > -10, NZ: (c) => c[1] > -48 && c[0] > 160, NL: (c) => c[1] > 50, DK: (c) => c[0] > 7, NO: (c) => c[1] < 72 && c[0] < 32, RU: (c) => c[0] > 19,
  EC: (c) => c[0] > -82, KI: (c) => c[0] > 170 || c[0] < -150, FJ: (c) => c[0] > 0, IN: (c) => c[0] < 93, ID: () => true, GB: (c) => c[1] > 49.5,
};
const clipLat = { MA: 27.67 }; // Morocco proper
const clipLon = { RU: 19 };    // drop the sliver drawn west of the antimeridian seam
const noIsletFilter = new Set(['BS', 'TT', 'AG', 'KN', 'VC', 'GD', 'CV', 'ST', 'KM', 'SC', 'MU', 'MV', 'FM', 'MH', 'PW', 'KI', 'TV', 'TO', 'WS', 'FJ', 'VU', 'SB', 'PG', 'PH', 'ID', 'JP', 'NZ', 'GR', 'DK', 'MT', 'BH', 'SG', 'BN', 'TL', 'GQ', 'GW']);

function ringArea(r) { let a = 0; for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return Math.abs(a / 2); }
function filterGeom(f, iso) {
  let polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  if (keep[iso]) polys = polys.filter((p) => p[0].some(keep[iso]));
  const big = Math.max(...polys.map((p) => ringArea(p[0])));
  const thr = noIsletFilter.has(iso) ? 0.002 : 0.012;
  polys = polys.filter((p) => ringArea(p[0]) >= big * thr).map((p) => [p[0]]);
  if (clipLon[iso]) polys = polys.map((p) => { const r = p[0].filter((c) => c[0] >= clipLon[iso]); if (r.length && (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1])) r.push(r[0]); return [r]; }).filter((p) => p[0].length > 3);
  if (clipLat[iso]) polys = polys.map((p) => { const r = p[0].filter((c) => c[1] >= clipLat[iso]); if (r.length && (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1])) r.push(r[0]); return [r]; }).filter((p) => p[0].length > 3);
  return { type: 'Feature', geometry: { type: 'MultiPolygon', coordinates: polys } };
}

const W = 200, H = 120, PAD = 8;
const out = {}; const missing = []; const skipped = [];
for (const [iso, ne] of Object.entries(NE)) {
  const f = pickF(ne);
  if (!f) { missing.push(iso + ':' + ne); continue; }
  const g = filterGeom(f, iso);
  const [[x0, y0], [x1, y1]] = geoBounds(g);
  let cx = (x0 + x1) / 2; if (x1 < x0) cx += 180; // antimeridian crossers
  const proj = geoMercator().center([cx, (y0 + y1) / 2]).scale(1).translate([0, 0]);
  const [[bx0, by0], [bx1, by1]] = geoPath(proj).bounds(g);
  const s = Math.min((W - 2 * PAD) / (bx1 - bx0), (H - 2 * PAD) / (by1 - by0));
  proj.scale(s).translate([W / 2 - s * (bx0 + bx1) / 2, H / 2 - s * (by0 + by1) / 2]);
  const digits = s > 2000 ? 1 : 1;
  // skip countries that are only dots on a 200×120 box (atolls, micro-states): the shape quiz can't use them
  const area = Math.abs(geoPath(proj).area(g));
  if (area < W * H * 0.012 || ['KM', 'VA', 'MC', 'SM', 'MV', 'KI', 'FM', 'MH', 'NR', 'TO', 'PW', 'TV', 'WS', 'SC', 'ST', 'CV'].includes(iso)) { skipped.push(iso); continue; }
  out[iso] = geoPath(proj).digits(digits)(g);
}
console.log('shapes', Object.keys(out).length, 'missing', missing, 'skipped', skipped.join(' '), 'bytes', JSON.stringify(out).length);
writeFileSync('shapes-world.json', JSON.stringify(out));
