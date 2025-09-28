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
  cronKey: process.env.CRON_SECRET || process.env.CRON_KEY || 'change-me',
  mobileMoney: {
    mtnWebhookSecret: process.env.MTN_MOMO_WEBHOOK_SECRET || 'change-me',
    airtelWebhookSecret: process.env.AIRTEL_MONEY_WEBHOOK_SECRET || 'change-me',
  },
  // Flutterwave (déprécié pour CG) — conservé pour compat
  flutterwave: {
    baseUrl: process.env.FLW_BASE_URL || '',
    publicKey: process.env.FLW_PUBLIC_KEY || '',
    secretKey: process.env.FLW_SECRET_KEY || '',
    webhookHash: process.env.FLW_WEBHOOK_HASH || process.env.FLW_HASH || '',
  },
  // CinetPay (recommandé pour CG)
  cinetpay: {
    baseUrl: process.env.CINETPAY_BASE_URL || 'https://api-checkout.cinetpay.com/v2',
    siteId: process.env.CINETPAY_SITE_ID || '',
    apiKey: process.env.CINETPAY_API_KEY || '',
    notifyUrl: process.env.CINETPAY_NOTIFY_URL || '',
    returnUrl: process.env.CINETPAY_RETURN_URL || '',
  },
  premium: {
    monthlyPriceXAF: Number(process.env.PREMIUM_PRICE_XAF || 2000),
  },
  publicBaseUrl: process.env.API_PUBLIC_BASE_URL || ''
};
