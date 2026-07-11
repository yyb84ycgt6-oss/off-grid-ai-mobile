/**
 * Unit Converters pack — length, mass, temperature, data, speed, area, volume,
 * pressure, energy, angle, plus number-base conversion and Roman numerals.
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
  id, name, description, category: 'convert', tags: ['convert', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const num = (s: string): number => parseFloat(s.replace(/,/g, '').trim());
const fmt = (n: number): string => {
  if (!isFinite(n)) return 'undefined';
  const r = Math.round(n * 1e6) / 1e6;
  return String(r);
};

/** Build a linear converter (multiply by factor). */
const lin = (id: string, name: string, from: string, to: string, factor: number, example: string): ToolboxTool =>
  t(id, name, `Convert ${from} to ${to}.`, `value in ${from}`, (s) => {
    const v = num(s);
    return isNaN(v) ? 'Enter a number.' : `${fmt(v)} ${from} = ${fmt(v * factor)} ${to}`;
  }, ['unit'], example);

export const convertPack: ToolboxTool[] = [
  // Length
  lin('conv-km-mi', 'Kilometers → Miles', 'km', 'mi', 0.621371, '5'),
  lin('conv-mi-km', 'Miles → Kilometers', 'mi', 'km', 1.609344, '5'),
  lin('conv-m-ft', 'Meters → Feet', 'm', 'ft', 3.280839895, '10'),
  lin('conv-ft-m', 'Feet → Meters', 'ft', 'm', 0.3048, '10'),
  lin('conv-cm-in', 'Centimeters → Inches', 'cm', 'in', 0.3937007874, '30'),
  lin('conv-in-cm', 'Inches → Centimeters', 'in', 'cm', 2.54, '12'),
  lin('conv-mm-in', 'Millimeters → Inches', 'mm', 'in', 0.03937007874, '25'),
  lin('conv-yd-m', 'Yards → Meters', 'yd', 'm', 0.9144, '100'),
  lin('conv-nmi-km', 'Nautical Miles → km', 'nmi', 'km', 1.852, '10'),
  lin('conv-ly-km', 'Light Years → km', 'ly', 'km', 9.4607e12, '1'),
  // Mass
  lin('conv-kg-lb', 'Kilograms → Pounds', 'kg', 'lb', 2.2046226218, '70'),
  lin('conv-lb-kg', 'Pounds → Kilograms', 'lb', 'kg', 0.45359237, '150'),
  lin('conv-g-oz', 'Grams → Ounces', 'g', 'oz', 0.03527396195, '500'),
  lin('conv-oz-g', 'Ounces → Grams', 'oz', 'g', 28.349523125, '8'),
  lin('conv-st-kg', 'Stone → Kilograms', 'st', 'kg', 6.35029318, '11'),
  lin('conv-t-kg', 'Metric Tons → Kilograms', 't', 'kg', 1000, '2'),
  // Volume
  lin('conv-l-gal', 'Liters → US Gallons', 'L', 'gal', 0.2641720524, '10'),
  lin('conv-gal-l', 'US Gallons → Liters', 'gal', 'L', 3.785411784, '5'),
  lin('conv-ml-floz', 'Milliliters → Fl Oz', 'mL', 'fl oz', 0.0338140227, '250'),
  lin('conv-cup-ml', 'US Cups → Milliliters', 'cup', 'mL', 236.588, '2'),
  lin('conv-tbsp-ml', 'Tablespoons → mL', 'tbsp', 'mL', 14.7868, '3'),
  lin('conv-tsp-ml', 'Teaspoons → mL', 'tsp', 'mL', 4.92892, '2'),
  // Speed
  lin('conv-kmh-mph', 'km/h → mph', 'km/h', 'mph', 0.621371, '100'),
  lin('conv-mph-kmh', 'mph → km/h', 'mph', 'km/h', 1.609344, '60'),
  lin('conv-ms-kmh', 'm/s → km/h', 'm/s', 'km/h', 3.6, '10'),
  lin('conv-knot-kmh', 'Knots → km/h', 'kn', 'km/h', 1.852, '20'),
  lin('conv-mach-kmh', 'Mach → km/h (sea level)', 'Mach', 'km/h', 1225.04, '1'),
  // Area
  lin('conv-sqm-sqft', 'Sq Meters → Sq Feet', 'm²', 'ft²', 10.7639, '50'),
  lin('conv-acre-sqm', 'Acres → Sq Meters', 'acre', 'm²', 4046.8564224, '2'),
  lin('conv-ha-acre', 'Hectares → Acres', 'ha', 'acre', 2.4710538, '5'),
  lin('conv-sqkm-sqmi', 'Sq km → Sq Miles', 'km²', 'mi²', 0.386102, '100'),
  // Pressure / energy / power
  lin('conv-bar-psi', 'Bar → PSI', 'bar', 'psi', 14.5037738, '2'),
  lin('conv-atm-kpa', 'Atmospheres → kPa', 'atm', 'kPa', 101.325, '1'),
  lin('conv-kwh-mj', 'kWh → Megajoules', 'kWh', 'MJ', 3.6, '5'),
  lin('conv-cal-j', 'Calories → Joules', 'cal', 'J', 4.184, '500'),
  lin('conv-hp-kw', 'Horsepower → kW', 'hp', 'kW', 0.7457, '150'),
  // Digital storage
  lin('conv-mb-mib', 'Megabytes → Mebibytes', 'MB', 'MiB', 0.95367431640625, '100'),
  lin('conv-gb-mb', 'Gigabytes → Megabytes', 'GB', 'MB', 1000, '2'),
  lin('conv-gib-gb', 'Gibibytes → Gigabytes', 'GiB', 'GB', 1.073741824, '8'),
  lin('conv-byte-bit', 'Bytes → Bits', 'B', 'bit', 8, '1024'),
  lin('conv-tb-gb', 'Terabytes → Gigabytes', 'TB', 'GB', 1000, '1'),

  // Temperature (non-linear — dedicated)
  t('conv-c-f', 'Celsius → Fahrenheit', 'Convert °C to °F.', 'value in °C', (s) => {
    const v = num(s); return isNaN(v) ? 'Enter a number.' : `${fmt(v)} °C = ${fmt(v * 9 / 5 + 32)} °F`;
  }, ['unit', 'temperature'], '37'),
  t('conv-f-c', 'Fahrenheit → Celsius', 'Convert °F to °C.', 'value in °F', (s) => {
    const v = num(s); return isNaN(v) ? 'Enter a number.' : `${fmt(v)} °F = ${fmt((v - 32) * 5 / 9)} °C`;
  }, ['unit', 'temperature'], '98.6'),
  t('conv-c-k', 'Celsius → Kelvin', 'Convert °C to Kelvin.', 'value in °C', (s) => {
    const v = num(s); return isNaN(v) ? 'Enter a number.' : `${fmt(v)} °C = ${fmt(v + 273.15)} K`;
  }, ['unit', 'temperature'], '25'),
  t('conv-k-c', 'Kelvin → Celsius', 'Convert Kelvin to °C.', 'value in K', (s) => {
    const v = num(s); return isNaN(v) ? 'Enter a number.' : `${fmt(v)} K = ${fmt(v - 273.15)} °C`;
  }, ['unit', 'temperature'], '300'),

  // Angle
  lin('conv-deg-rad', 'Degrees → Radians', 'deg', 'rad', Math.PI / 180, '180'),
  lin('conv-rad-deg', 'Radians → Degrees', 'rad', 'deg', 180 / Math.PI, '3.14159'),

  // Number-base conversion
  t('conv-dec-hex', 'Decimal → Hex', 'Convert a decimal integer to hexadecimal.', 'a decimal integer', (s) => {
    const v = parseInt(s.trim(), 10); return isNaN(v) ? 'Enter an integer.' : '0x' + (v >>> 0).toString(16).toUpperCase();
  }, ['base'], '255'),
  t('conv-hex-dec', 'Hex → Decimal', 'Convert a hexadecimal value to decimal.', 'a hex value', (s) => {
    const v = parseInt(s.replace(/^0x/i, '').trim(), 16); return isNaN(v) ? 'Enter a hex value.' : String(v);
  }, ['base'], 'FF'),
  t('conv-dec-bin', 'Decimal → Binary', 'Convert a decimal integer to binary.', 'a decimal integer', (s) => {
    const v = parseInt(s.trim(), 10); return isNaN(v) ? 'Enter an integer.' : (v >>> 0).toString(2);
  }, ['base'], '42'),
  t('conv-bin-dec', 'Binary → Decimal', 'Convert a binary value to decimal.', 'a binary value', (s) => {
    const v = parseInt(s.trim(), 2); return isNaN(v) ? 'Enter a binary value.' : String(v);
  }, ['base'], '101010'),
  t('conv-dec-oct', 'Decimal → Octal', 'Convert a decimal integer to octal.', 'a decimal integer', (s) => {
    const v = parseInt(s.trim(), 10); return isNaN(v) ? 'Enter an integer.' : '0o' + (v >>> 0).toString(8);
  }, ['base'], '64'),
  t('conv-anybase', 'Any Base → Any Base', 'Convert between bases 2-36. Format: value::fromBase::toBase', 'value::from::to', (s) => {
    const [val, f, to] = s.split('::').map((x) => x.trim());
    const fb = parseInt(f, 10), tb = parseInt(to, 10);
    if (!val || isNaN(fb) || isNaN(tb) || fb < 2 || fb > 36 || tb < 2 || tb > 36) return 'Format: value::fromBase::toBase  (bases 2-36, e.g. FF::16::2)';
    const n = parseInt(val, fb);
    return isNaN(n) ? `"${val}" is not valid in base ${fb}.` : n.toString(tb).toUpperCase();
  }, ['base'], 'FF::16::2'),
  t('conv-roman', 'Number → Roman Numeral', 'Convert 1-3999 to Roman numerals.', 'an integer 1-3999', (s) => {
    let v = parseInt(s.trim(), 10);
    if (isNaN(v) || v < 1 || v > 3999) return 'Enter an integer 1-3999.';
    const map: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let out = '';
    for (const [n, r] of map) while (v >= n) { out += r; v -= n; }
    return out;
  }, ['roman'], '2025'),
  t('conv-roman-dec', 'Roman Numeral → Number', 'Convert a Roman numeral to a number.', 'a Roman numeral', (s) => {
    const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    const r = s.toUpperCase().trim();
    if (!/^[IVXLCDM]+$/.test(r)) return 'Enter a valid Roman numeral.';
    let total = 0;
    for (let i = 0; i < r.length; i++) {
      const cur = map[r[i]], next = map[r[i + 1]] || 0;
      total += cur < next ? -cur : cur;
    }
    return String(total);
  }, ['roman'], 'MMXXV'),
];
