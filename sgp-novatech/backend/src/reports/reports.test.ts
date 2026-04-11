import request from 'supertest'
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { copyFileSync, existsSync, rmSync } from 'fs'

const makeToken = (
  role: string,
  id: string,
  name: string,
  email: string,
  sessionVersion = 0
) =>
  jwt.sign(
    { id, email, role, name, sessionVersion },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '1h' }
  )

let prisma: typeof import('../lib/prisma').default
let app: express.Express
let tokenGerente = ''
let tokenLider = ''
let leaderProjectId = ''

beforeAll(async () => {
  if (existsSync('test-reports.db')) {
    rmSync('test-reports.db')
  }

  copyFileSync('dev.db', 'test-reports.db')
  process.env.DATABASE_URL = 'file:./test-reports.db'

  const prismaModule = await import('../lib/prisma')
  const reportsRoutesModule = await import('./reports.router')

  prisma = prismaModule.default
  app = express()
  app.use(cors())
  app.use(express.json())
  app.use(reportsRoutesModule.default)

  const gerente = await prisma.user.findUniqueOrThrow({ where: { email: 'gerente@novatech.mx' } })
  const lider = await prisma.user.findUniqueOrThrow({ where: { email: 'lider@novatech.mx' } })
  const leaderProject = await prisma.project.findFirstOrThrow({
    where: { leaderId: lider.id }
  })
  tokenGerente = makeToken('GERENTE', gerente.id, gerente.name, gerente.email, gerente.sessionVersion)
  tokenLider = makeToken('LIDER', lider.id, lider.name, lider.email, lider.sessionVersion)
  leaderProjectId = leaderProject.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('GET /reports/dashboard', () => {
  it('debe incluir resumen ejecutivo del portafolio cuando no se filtra por proyecto', async () => {
    const res = await request(app)
      .get('/reports/dashboard')
      .set('Authorization', `Bearer ${tokenGerente}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('portfolioSummary')
    expect(res.body.portfolioSummary).not.toBeNull()
    expect(Array.isArray(res.body.portfolioSummary.projects)).toBe(true)
  })

  it('no debe incluir portafolio consolidado cuando se filtra por proyecto', async () => {
    const activeProject = await prisma.project.findFirstOrThrow({
      where: { status: 'ACTIVO' },
      orderBy: { createdAt: 'asc' }
    })

    const res = await request(app)
      .get(`/reports/dashboard?projectId=${activeProject.id}`)
      .set('Authorization', `Bearer ${tokenGerente}`)

    expect(res.status).toBe(200)
    expect(res.body.portfolioSummary).toBeNull()
  })

  it('debe permitir que un lider vea el dashboard de su proyecto', async () => {
    const res = await request(app)
      .get(`/reports/dashboard?projectId=${leaderProjectId}`)
      .set('Authorization', `Bearer ${tokenLider}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('globalProgress')
  })

  it('debe bloquear el resumen de portafolio para lideres', async () => {
    const res = await request(app)
      .get('/reports/dashboard')
      .set('Authorization', `Bearer ${tokenLider}`)

    expect(res.status).toBe(403)
  })
})
