import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import projectRoutes from './routes/projects'
import userRoutes from './routes/users'
import tasksRouter from './tasks/tasks.router'
import reportsRouter from './reports/reports.router'
import notificationsRouter from './notifications/notifications.router'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const allowedOrigins = new Set([
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  ...envOrigins
])

const allowedOriginPatterns = [
  /^https:\/\/.*\.vercel\.app$/
]

const corsOptions = {
  origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    if (!origin) {
      return callback(null, true)
    }

    const isExplicitlyAllowed = allowedOrigins.has(origin)
    const matchesKnownPattern = allowedOriginPatterns.some((pattern) => pattern.test(origin))

    if (isExplicitlyAllowed || matchesKnownPattern) {
      return callback(null, true)
    }

    return callback(new Error(`Origen no permitido por CORS: ${origin}`))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}

app.use(cors(corsOptions))
app.options(/.*/, cors(corsOptions))
app.use(express.json())

// Rutas
app.use('/auth', authRoutes)
app.use('/projects', projectRoutes)
app.use('/users', userRoutes)
app.use(tasksRouter)
app.use(reportsRouter)
app.use(notificationsRouter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SGP-NovaTech API corriendo', version: '1.0.0' })
})

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})
