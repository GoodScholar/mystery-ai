import mongoose from 'mongoose'
import { env } from './env.js'
import logger from '../shared/logger.js'

export const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    logger.info(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`)
    return conn
  } catch (error) {
    logger.error('❌ MongoDB Connection Error:', error)
    // process.exit(1)
    return null
  }
}

export const checkMongoDBStatus = () => {
  return mongoose.connection.readyState === 1 ? 'ok' : 'error'
}
