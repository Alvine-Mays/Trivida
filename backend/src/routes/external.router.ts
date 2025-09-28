import { Router } from 'express';
import { z } from 'zod';
import { ExchangeRateCache } from '../models/ExchangeRateCache.js'; // kept for typing reference
import { WeatherCache } from '../models/WeatherCache.js';
import { TimezoneCache } from '../models/TimezoneCache.js';
import { config } from '../config.js';
import { ApiError } from '../utils/errors.js';
import { getRates } from '../services/fx.js';

const router = Router();

router.get('/fx/rates', async (req, res, next) => {
  try {
    const base = String(req.query.base || config.baseCurrency || 'XAF').toUpperCase();
    const symbols = String(req.query.symbols || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    if (!symbols.length) return res.json({ base, rates: {}, fetchedAt: new Date().toISOString(), ttlSeconds: config.fx.ttlHours * 3600 });
    const rates = await getRates(base, symbols);
    res.json({ base, rates, fetchedAt: new Date().toISOString(), ttlSeconds: config.fx.ttlHours * 3600 });
  } catch (e) { next(e); }
});

const weatherSchema = z.object({ lat: z.coerce.number(), lon: z.coerce.number(), units: z.enum(['metric','imperial']).default('metric') });
router.get('/weather', async (req, res, next) => {
  try {
    if (!config.weather.apiKey) throw new ApiError('FORBIDDEN', 'Weather API key missing', 403);
    const { lat, lon, units } = weatherSchema.parse({ lat: req.query.lat, lon: req.query.lon, units: req.query.units || 'metric' });
    const key = `${lat.toFixed(4)},${lon.toFixed(4)},${units}`;
    const now = new Date();
    const existing = await WeatherCache.findOne({ key });
    if (existing && existing.expiresAt > now) {
      const p: any = existing.payload;
      return res.json({ condition: p.weather?.[0]?.main, temperature: p.main?.temp, humidity: p.main?.humidity, city: p.name, country: p.sys?.country, fetchedAt: existing.fetchedAt.toISOString(), ttlSeconds: config.weather.ttlHours * 3600 });
    }
    const url = `${config.weather.baseUrl}/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${config.weather.apiKey}`;
    const r = await fetch(url);
    if (!r.ok) throw new ApiError('CONFLICT', `Weather fetch failed ${r.status}`, r.status);
    const j: any = await r.json();
    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + config.weather.ttlHours * 3600 * 1000);
    await WeatherCache.findOneAndUpdate({ key }, { key, payload: j, fetchedAt, expiresAt }, { upsert: true });
    res.json({ condition: j.weather?.[0]?.main, temperature: j.main?.temp, humidity: j.main?.humidity, city: j.name, country: j.sys?.country, fetchedAt: fetchedAt.toISOString(), ttlSeconds: config.weather.ttlHours * 3600 });
  } catch (e) { next(e); }
});

const tzSchema = z.object({ lat: z.coerce.number(), lon: z.coerce.number() });
router.get('/timezone', async (req, res, next) => {
  try {
    if (!config.timezone.apiKey) throw new ApiError('FORBIDDEN', 'Timezone API key missing', 403);
    const { lat, lon } = tzSchema.parse({ lat: req.query.lat, lon: req.query.lon });
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const now = new Date();
    const existing = await TimezoneCache.findOne({ key });
    if (existing && existing.expiresAt > now) {
      const p: any = existing.payload;
      return res.json({ zoneName: p.zoneName, gmtOffset: p.gmtOffset, countryName: p.countryName, fetchedAt: existing.fetchedAt.toISOString(), ttlSeconds: config.timezone.ttlDays * 86400 });
    }
    const url = `https://api.timezonedb.com/v2.1/get-time-zone?key=${config.timezone.apiKey}&format=json&by=position&lat=${lat}&lng=${lon}`;
    const r = await fetch(url);
    if (!r.ok) throw new ApiError('CONFLICT', `Timezone fetch failed ${r.status}`, r.status);
    const j: any = await r.json();
    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + config.timezone.ttlDays * 86400 * 1000);
    await TimezoneCache.findOneAndUpdate({ key }, { key, payload: j, fetchedAt, expiresAt }, { upsert: true });
    res.json({ zoneName: j.zoneName, gmtOffset: j.gmtOffset, countryName: j.countryName, fetchedAt: fetchedAt.toISOString(), ttlSeconds: config.timezone.ttlDays * 86400 });
  } catch (e) { next(e); }
});

export default router;
