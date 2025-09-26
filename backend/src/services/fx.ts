import { ExchangeRateCache } from '../models/ExchangeRateCache.js';
import { config } from '../config.js';
import { ApiError } from '../utils/errors.js';

export async function getRates(base: string, symbols: string[]): Promise<Record<string, number>> {
  base = base.toUpperCase();
  const uniq = Array.from(new Set(symbols.map((s) => s.toUpperCase()).filter((s) => s !== base)));
  const now = new Date();
  const result: Record<string, number> = {};
  const toFetch: string[] = [];
  for (const t of uniq) {
    const c = await ExchangeRateCache.findOne({ base, target: t });
    if (c && c.expiresAt > now) result[t] = c.rate;
    else toFetch.push(t);
  }
  if (toFetch.length) {
    const url = `${config.fx.baseUrl}/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(toFetch.join(','))}`;
    const r = await fetch(url);
    if (!r.ok) throw new ApiError('CONFLICT', `FX fetch failed ${r.status}`, r.status);
    const j: any = await r.json();
    for (const k of Object.keys(j.rates || {})) {
      const rate = Number(j.rates[k]);
      result[k] = rate;
      const fetchedAt = new Date();
      const expiresAt = new Date(fetchedAt.getTime() + config.fx.ttlHours * 3600 * 1000);
      await ExchangeRateCache.findOneAndUpdate(
        { base, target: k },
        { base, target: k, rate, fetchedAt, expiresAt },
        { upsert: true }
      );
    }
  }
  return result;
}
