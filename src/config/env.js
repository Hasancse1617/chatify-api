import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '3000',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'secret-key',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'secret-key',
  LARAVEL_API: process.env.LARAVEL_API,
};
