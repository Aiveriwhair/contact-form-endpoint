import rateLimit from 'express-rate-limit';

const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';

export const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 5, // Désactivé en dev, 5 requêtes par IP toutes les 15 minutes en prod
  message: {
    success: false,
    message: 'Trop de messages envoyés, veuillez réessayer plus tard.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment, // Skip complètement en dev
});

export const generalRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDevelopment ? 1000 : 30, // Désactivé en dev, 30 requêtes par IP toutes les 1 minute en prod
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment, // Skip complètement en dev
});
