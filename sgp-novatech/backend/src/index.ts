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

app.use(cors())
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
