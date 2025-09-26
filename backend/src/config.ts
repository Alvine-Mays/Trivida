import 'dotenv/config';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || '',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me',
    accessTtlMin: Number(process.env.ACCESS_TOKEN_TTL_MIN || 15),
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
  },
  bcryptRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12),
  baseCurrency: process.env.BASE_CURRENCY || 'XAF',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    max: Number(process.env.RATE_LIMIT_MAX || 60),
  },
  fx: {
    baseUrl: process.env.EXCHANGE_RATE_BASE_URL || 'https://api.exchangerate.host',
    ttlHours: Number(process.env.FX_CACHE_TTL_HOURS || 12),
  },
  weather: {
    baseUrl: process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org/data/2.5',
    apiKey: process.env.OPENWEATHER_API_KEY || '',
    ttlHours: Number(process.env.WEATHER_CACHE_TTL_HOURS || 1),
  },
  timezone: {
    apiKey: process.env.TIMEZONEDB_API_KEY || '',
    ttlDays: Number(process.env.TIMEZONE_CACHE_TTL_DAYS || 30),
  },
  reservedSlugs: (process.env.RESERVED_SLUGS || 'admin,login,api,public,assets').split(',').map(s => s.trim()),
  expo: { accessToken: process.env.EXPO_ACCESS_TOKEN || '' },
  cronKey: process.env.CRON_KEY || 'change-me',
};
