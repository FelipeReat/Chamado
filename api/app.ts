/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth-local.js'
import notificationRoutes from './routes/notifications-simple.js'
import emailRoutes from './routes/email.js'
import ticketsRoutes from './routes/tickets.js'
import usersRoutes from './routes/users.js'
import publicRoutes from './routes/public.js'
import settingsRoutes from './routes/settings.js'
import boardsRoutes from './routes/boards.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env (override explicit env to ensure consistent deploy config)
dotenv.config({ override: true })

const app: express.Application = express()

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
]
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    if (origin.startsWith('http://localhost:')) return callback(null, true)
    return callback(null, false)
  },
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api', emailRoutes)
app.use('/api/tickets', ticketsRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/public', publicRoutes)
app.use('/api', settingsRoutes)
app.use('/api/boards', boardsRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)


/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler apenas para /api/*
 */
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

// Sem servir estático; frontend é publicado no IIS

export default app
