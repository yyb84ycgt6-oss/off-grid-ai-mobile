/**
 * Finance Calc pack — loans, interest, savings, and everyday money math.
 * Pure math on user-provided numbers; no rates are fetched (offline).
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
  id, name, description, category: 'finance', tags: ['finance', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const money = (n: number): string => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parts = (s: string): number[] => s.split('::').map((x) => parseFloat(x.trim()));

export const financePack: ToolboxTool[] = [
  t('fin-loan', 'Loan Payment', 'Monthly payment on an amortized loan. Format: principal::annualRate%::years', 'principal::rate::years', (s) => {
    const [p, r, y] = parts(s); if ([p, r, y].some(isNaN)) return 'Format: principal::annualRate::years  (e.g. 25000::6.5::5)';
    const n = y * 12; const i = r / 100 / 12;
    const pay = i === 0 ? p / n : (p * i) / (1 - Math.pow(1 + i, -n));
    const total = pay * n;
    return `Monthly payment: ${money(pay)}\nTotal paid: ${money(total)}\nTotal interest: ${money(total - p)}\nPayments: ${n}`;
  }, ['loan'], '25000::6.5::5'),
  t('fin-mortgage', 'Mortgage Calculator', 'Monthly mortgage payment. Format: principal::annualRate%::years', 'principal::rate::years', (s) => {
    const [p, r, y] = parts(s); if ([p, r, y].some(isNaN)) return 'Format: principal::annualRate::years  (e.g. 400000::5.75::30)';
    const n = y * 12; const i = r / 100 / 12;
    const pay = i === 0 ? p / n : (p * i) / (1 - Math.pow(1 + i, -n));
    return `Monthly P&I: ${money(pay)}\nTotal over ${y} yrs: ${money(pay * n)}\nTotal interest: ${money(pay * n - p)}`;
  }, ['mortgage'], '400000::5.75::30'),
  t('fin-compound', 'Compound Interest', 'Future value. Format: principal::annualRate%::years::compoundsPerYear', 'principal::rate::years::freq', (s) => {
    const [p, r, y, f] = parts(s); const freq = isNaN(f) ? 12 : f;
    if ([p, r, y].some(isNaN)) return 'Format: principal::rate::years::compoundsPerYear  (e.g. 10000::7::10::12)';
    const amount = p * Math.pow(1 + r / 100 / freq, freq * y);
    return `Future value: ${money(amount)}\nInterest earned: ${money(amount - p)}\nGrowth: ${Math.round((amount / p - 1) * 1000) / 10}%`;
  }, ['interest'], '10000::7::10::12'),
  t('fin-simple-interest', 'Simple Interest', 'Interest without compounding. Format: principal::annualRate%::years', 'principal::rate::years', (s) => {
    const [p, r, y] = parts(s); if ([p, r, y].some(isNaN)) return 'Format: principal::rate::years';
    const interest = p * r / 100 * y;
    return `Interest: ${money(interest)}\nTotal: ${money(p + interest)}`;
  }, ['interest'], '5000::4::3'),
  t('fin-savings', 'Savings Goal', 'Monthly deposit to reach a goal. Format: goal::annualRate%::years', 'goal::rate::years', (s) => {
    const [goal, r, y] = parts(s); if ([goal, r, y].some(isNaN)) return 'Format: goal::annualRate::years  (e.g. 100000::5::15)';
    const n = y * 12; const i = r / 100 / 12;
    const deposit = i === 0 ? goal / n : (goal * i) / (Math.pow(1 + i, n) - 1);
    return `Monthly deposit: ${money(deposit)}\nTotal deposited: ${money(deposit * n)}\nInterest earned: ${money(goal - deposit * n)}`;
  }, ['savings'], '100000::5::15'),
  t('fin-roi', 'ROI', 'Return on investment. Format: gain::cost', 'gain::cost', (s) => {
    const [gain, cost] = parts(s); if ([gain, cost].some(isNaN) || cost === 0) return 'Format: finalValue::cost  (cost ≠ 0, e.g. 15000::10000)';
    const roi = (gain - cost) / cost * 100;
    return `Net profit: ${money(gain - cost)}\nROI: ${Math.round(roi * 100) / 100}%`;
  }, ['roi'], '15000::10000'),
  t('fin-discount', 'Discount Price', 'Final price after a discount. Format: price::discount%', 'price::discount', (s) => {
    const [price, disc] = parts(s); if ([price, disc].some(isNaN)) return 'Format: price::discountPercent  (e.g. 79.99::25)';
    const saved = price * disc / 100;
    return `You save: ${money(saved)}\nFinal price: ${money(price - saved)}`;
  }, ['shopping'], '79.99::25'),
  t('fin-tax', 'Add / Remove Sales Tax', 'Tax-inclusive and exclusive prices. Format: price::taxRate%', 'price::taxRate', (s) => {
    const [price, rate] = parts(s); if ([price, rate].some(isNaN)) return 'Format: price::taxRate  (e.g. 100::8.25)';
    const withTax = price * (1 + rate / 100);
    const preTax = price / (1 + rate / 100);
    return `If ${money(price)} is pre-tax:\n  + tax = ${money(withTax)} (tax ${money(withTax - price)})\nIf ${money(price)} includes tax:\n  pre-tax = ${money(preTax)} (tax ${money(price - preTax)})`;
  }, ['tax'], '100::8.25'),
  t('fin-inflation', 'Inflation Adjust', 'Future buying power. Format: amount::annualInflation%::years', 'amount::rate::years', (s) => {
    const [amt, rate, y] = parts(s); if ([amt, rate, y].some(isNaN)) return 'Format: amount::inflationRate::years  (e.g. 1000::3::20)';
    const future = amt / Math.pow(1 + rate / 100, y);
    return `${money(amt)} today buys ${money(future)} worth in ${y} years at ${rate}% inflation\n(loss of ${money(amt - future)} in purchasing power)`;
  }, ['inflation'], '1000::3::20'),
  t('fin-break-even', 'Break-Even Units', 'Units to cover fixed costs. Format: fixedCost::pricePerUnit::costPerUnit', 'fixed::price::cost', (s) => {
    const [fixed, price, cost] = parts(s); if ([fixed, price, cost].some(isNaN) || price <= cost) return 'Format: fixedCost::price::costPerUnit  (price > cost)';
    const units = Math.ceil(fixed / (price - cost));
    return `Break-even: ${units.toLocaleString()} units\nRevenue at break-even: ${money(units * price)}\nMargin per unit: ${money(price - cost)}`;
  }, ['business'], '10000::25::15'),
  t('fin-currency-split', 'Split The Bill', 'Even split with optional tip. Format: total::people::tip%', 'total::people::tip', (s) => {
    const [total, people, tip] = parts(s); const t2 = isNaN(tip) ? 0 : tip;
    if (isNaN(total) || isNaN(people) || people < 1) return 'Format: total::people::tip  (e.g. 120::4::18)';
    const grand = total * (1 + t2 / 100);
    return `Total with ${t2}% tip: ${money(grand)}\nPer person (${people}): ${money(grand / people)}`;
  }, ['everyday'], '120::4::18'),
  t('fin-hourly-salary', 'Hourly ↔ Salary', 'Convert an hourly wage to annual salary. Format: hourly::hoursPerWeek', 'hourly::hoursPerWeek', (s) => {
    const [rate, hrs] = parts(s); const h = isNaN(hrs) ? 40 : hrs;
    if (isNaN(rate)) return 'Format: hourlyRate::hoursPerWeek  (e.g. 35::40)';
    const annual = rate * h * 52;
    return `Annual: ${money(annual)}\nMonthly: ${money(annual / 12)}\nWeekly: ${money(rate * h)}`;
  }, ['salary'], '35::40'),
  t('fin-currency-format', 'Currency Formatter', 'Format a number in a currency + locale (offline Intl). Format: amount::code[::locale]', 'amount::USD[::de-DE]', (s) => {
    const p = s.split('::').map((x) => x.trim());
    const amount = parseFloat(p[0]);
    if (isNaN(amount) || !p[1]) return 'Format: 1234.5::USD or 1234.5::EUR::de-DE';
    try {
      const code = p[1].toUpperCase();
      const locales = p[2] ? [p[2]] : ['en-US', 'de-DE', 'ja-JP', 'en-IN'];
      return locales.map((loc) => `${loc.padEnd(6)} ${new Intl.NumberFormat(loc, { style: 'currency', currency: code }).format(amount)}`).join('\n');
    } catch (e) { return `Cannot format: ${(e as Error).message}`; }
  }, ['currency', 'format'], '1234567.89::USD'),
];
