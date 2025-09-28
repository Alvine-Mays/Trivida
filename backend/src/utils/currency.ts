const DECIMALS: Record<string, number> = {
  XAF: 0,
  XOF: 0,
  JPY: 0,
  KRW: 0,
  VND: 0,
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
  AUD: 2,
  NZD: 2,
  NGN: 2,
  ZAR: 2,
  GHS: 2,
  CNY: 2,
  INR: 2,
};

export function currencyDecimals(code: string): number {
  return DECIMALS[code.toUpperCase()] ?? 2;
}

export function minorToMajor(amountMinor: number, currency: string): number {
  const d = currencyDecimals(currency);
  if (d === 0) return amountMinor;
  return amountMinor / Math.pow(10, d);
}

export function majorToMinor(amountMajor: number, currency: string): number {
  const d = currencyDecimals(currency);
  if (d === 0) return Math.round(amountMajor);
  return Math.round(amountMajor * Math.pow(10, d));
}

export function convertMinor(amountMinor: number, from: string, to: string, rateFromTo: number): number {
  if (from.toUpperCase() === to.toUpperCase()) return amountMinor;
  const majorFrom = minorToMajor(amountMinor, from);
  const majorTo = majorFrom * rateFromTo;
  return majorToMinor(majorTo, to);
}
