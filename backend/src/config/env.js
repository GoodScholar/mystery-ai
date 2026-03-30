import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  
  MONGODB_URI: z.string().url().default('mongodb://localhost:27017/mijuai'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  JWT_SECRET: z.string().min(10).default('your-secret-key-change-me-in-production'),
  JWT_REFRESH_SECRET: z.string().min(10).default('your-refresh-key-change-me-in-production'),

  AI_API_KEY: z.string().min(1, 'AI_API_KEY is required'),
  AI_API_BASE: z.string().url().default('https://api.deepseek.com/v1'),
  AI_API_MODEL: z.string().default('deepseek-chat'),

  CORS_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173')
})

const envParse = envSchema.safeParse(process.env)

if (!envParse.success) {
  console.error('❌ Environment validation failed:')
  console.error(envParse.error.format())
  process.exit(1)
}

export const env = envParse.data
export const corsOrigins = env.CORS_ORIGINS.split(',').map(o => o.trim())
