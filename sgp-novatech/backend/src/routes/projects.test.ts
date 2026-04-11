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

let tokenGerente = ''
let tokenEmpleado1 = ''
let tokenEmpleado2 = ''
let tokenLider = ''
let gerenteId = ''
let adminId = ''
let leaderId = ''
let empleado2Id = ''
let projectActivoId = ''
let projectPausadoId = ''
let inaccessibleProjectId = ''
let closableProjectId = ''
let prisma: typeof import('../lib/prisma').default
let app: express.Express
let projectSequence = 900
let taskSequence = 900

const makeProjectCode = () => {
  projectSequence += 1
  return `PRJ-9${Date.now().toString().slice(-5)}${String(projectSequence).padStart(3, '0')}`
}

const makeTaskCode = (projectCode: string) => {
  taskSequence += 1
  return `TSK-${projectCode.replace('PRJ-', '')}-${Date.now().toString().slice(-4)}${String(taskSequence).padStart(3, '0')}`
}

beforeAll(async () => {
  if (existsSync('test.db')) {
    rmSync('test.db')
  }

  copyFileSync('dev.db', 'test.db')

  process.env.DATABASE_URL = 'file:./test.db'

  const prismaModule = await import('../lib/prisma')
  const authRoutesModule = await import('./auth')
  const projectRoutesModule = await import('./projects')
  const taskRoutesModule = await import('../tasks/tasks.router')

  prisma = prismaModule.default
  app = express()
  app.use(cors())
  app.use(express.json())
  app.use('/auth', authRoutesModule.default)
  app.use('/projects', projectRoutesModule.default)
  app.use('/', taskRoutesModule.default)

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@novatech.mx' } })
  const gerente = await prisma.user.findUniqueOrThrow({ where: { email: 'gerente@novatech.mx' } })
  const lider = await prisma.user.findUniqueOrThrow({ where: { email: 'lider@novatech.mx' } })
  const empleado1 = await prisma.user.findUniqueOrThrow({ where: { email: 'empleado1@novatech.mx' } })
  const empleado2 = await prisma.user.findUniqueOrThrow({ where: { email: 'empleado2@novatech.mx' } })

  const activeProject = await prisma.project.findFirstOrThrow({
    where: { status: 'ACTIVO' },
    orderBy: { createdAt: 'asc' }
  })
  const pausedProject = await prisma.project.findFirst({
    where: { status: 'PAUSADO' },
    orderBy: { createdAt: 'asc' }
  }) || await prisma.project.create({
    data: {
      publicCode: makeProjectCode(),
      name: 'Proyecto Pausado Base QA',
      description: 'Proyecto auxiliar para pruebas',
      startDate: new Date('2026-09-01'),
      deadline: new Date('2026-10-01'),
      status: 'PAUSADO',
      creatorId: gerente.id,
      leaderId: lider.id,
      members: {
        create: [
          { userId: lider.id },
          { userId: empleado1.id }
        ]
      }
    }
  })

  adminId = admin.id
  gerenteId = gerente.id
  leaderId = lider.id
  empleado2Id = empleado2.id
  projectActivoId = activeProject.id
  projectPausadoId = pausedProject.id

  tokenGerente = makeToken('GERENTE', gerente.id, gerente.name, gerente.email, gerente.sessionVersion)
  tokenEmpleado1 = makeToken('EMPLEADO', empleado1.id, empleado1.name, empleado1.email, empleado1.sessionVersion)
  tokenEmpleado2 = makeToken('EMPLEADO', empleado2.id, empleado2.name, empleado2.email, empleado2.sessionVersion)
  tokenLider = makeToken('LIDER', lider.id, lider.name, lider.email, lider.sessionVersion)

  const inaccessibleProject = await prisma.project.create({
    data: {
      name: 'Proyecto Privado QA',
      description: 'Proyecto auxiliar para validar acceso restringido',
      startDate: new Date('2026-08-01'),
      deadline: new Date('2026-08-30'),
      status: 'ACTIVO',
      creatorId: gerente.id,
      leaderId: lider.id,
      members: {
        create: [
          { userId: lider.id },
          { userId: empleado1.id }
        ]
      }
    }
  })

  const closableProject = await prisma.project.create({
    data: {
      name: 'Proyecto Cierre QA',
      description: 'Proyecto auxiliar sin tareas activas',
      startDate: new Date('2026-09-01'),
      deadline: new Date('2026-09-25'),
      status: 'PAUSADO',
      creatorId: gerente.id,
      leaderId: lider.id,
      members: {
        create: [
          { userId: lider.id },
          { userId: empleado1.id }
        ]
      }
    }
  })

  inaccessibleProjectId = inaccessibleProject.id
  closableProjectId = closableProject.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('POST /auth/register', () => {
  it('debe crear un usuario y retornar 201 con token', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Usuario Registro',
        email: 'registro@novatech.mx',
        password: 'Password123!',
        role: 'EMPLEADO'
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user.email).toBe('registro@novatech.mx')
    expect(res.body.user.role).toBe('EMPLEADO')
  })

  it('debe retornar 409 si el email ya existe', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Duplicado',
        email: 'gerente@novatech.mx',
        password: 'Password123!'
      })

    expect(res.status).toBe(409)
  })

  it('debe retornar 400 con rol invalido', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Rol Invalido',
        email: 'rol-invalido@novatech.mx',
        password: 'Password123!',
        role: 'OTRO'
      })

    expect(res.status).toBe(400)
  })
})

describe('POST /auth/login', () => {
  it('TP-01: debe retornar 200 y JWT con credenciales correctas', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'gerente@novatech.mx', password: 'Password123!' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user.role).toBe('GERENTE')
  })

  it('TP-02: debe retornar 401 con contrasena incorrecta', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'gerente@novatech.mx', password: 'wrongpassword' })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
  })

  it('debe bloquear temporalmente la cuenta tras varios intentos fallidos', async () => {
    const email = 'empleado2@novatech.mx'

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const res = await request(app)
        .post('/auth/login')
        .send({ email, password: 'incorrecta123!' })

      expect(res.status).toBe(401)
      expect(res.body.remainingAttempts).toBe(4 - attempt)
    }

    const lockRes = await request(app)
      .post('/auth/login')
      .send({ email, password: 'incorrecta123!' })

    expect(lockRes.status).toBe(423)
    expect(lockRes.body.error).toContain('bloqueada')
    expect(lockRes.body).toHaveProperty('lockUntil')
  })

  it('debe retornar 400 si faltan campos', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'gerente@novatech.mx' })

    expect(res.status).toBe(400)
  })
})

describe('GET /auth/me', () => {
  it('debe retornar el usuario autenticado', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokenGerente}`)

    expect(res.status).toBe(200)
    expect(res.body.email).toBe('gerente@novatech.mx')
  })

  it('debe retornar 401 si el token es invalido', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer token-invalido')

    expect(res.status).toBe(401)
  })
})

describe('POST /auth/change-password', () => {
  it('debe retornar 400 con nueva contrasena insegura', async () => {
    const res = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${tokenGerente}`)
      .send({
        currentPassword: 'Password123!',
        newPassword: 'abc'
      })

    expect(res.status).toBe(400)
  })

  it('debe retornar 401 si la contrasena actual es incorrecta', async () => {
    const res = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${tokenGerente}`)
      .send({
        currentPassword: 'NoEsLaActual123!',
        newPassword: 'NuevaPass123!'
      })

    expect(res.status).toBe(401)
  })

  it('debe actualizar la contrasena correctamente', async () => {
    const changeRes = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${tokenGerente}`)
      .send({
        currentPassword: 'Password123!',
        newPassword: 'NuevaPass123!'
      })

    expect(changeRes.status).toBe(200)

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'gerente@novatech.mx', password: 'NuevaPass123!' })

    expect(loginRes.status).toBe(200)
  })

  it('debe invalidar el token anterior despues de cambiar la contrasena', async () => {
    const loginBeforeChange = await request(app)
      .post('/auth/login')
      .send({ email: 'gerente@novatech.mx', password: 'NuevaPass123!' })

    expect(loginBeforeChange.status).toBe(200)

    const previousToken = loginBeforeChange.body.token

    const changeRes = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${previousToken}`)
      .send({
        currentPassword: 'NuevaPass123!',
        newPassword: 'Password123!'
      })

    expect(changeRes.status).toBe(200)
    expect(changeRes.body.message).toContain('sesiones activas')

    const meRes = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${previousToken}`)

    expect(meRes.status).toBe(401)

    const loginAfterChange = await request(app)
      .post('/auth/login')
      .send({ email: 'gerente@novatech.mx', password: 'Password123!' })

    expect(loginAfterChange.status).toBe(200)

    tokenGerente = loginAfterChange.body.token
  })
})

describe('GET /projects', () => {
  it('debe retornar 200 y lista de proyectos con token valido', async () => {
    const res = await request(app)
      .get('/projects')
      .set('Authorization', `Bearer ${tokenGerente}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(2)
  })

  it('TP-04: debe retornar 401 sin token', async () => {
    const res = await request(app).get('/projects')
    expect(res.status).toBe(401)
  })

  it('debe incluir el campo progress en cada proyecto', async () => {
    const res = await request(app)
      .get('/projects')
      .set('Authorization', `Bearer ${tokenGerente}`)

    expect(res.status).toBe(200)
    expect(res.body[0]).toHaveProperty('progress')
    expect(res.body[0]).toHaveProperty('totalTasks')
    expect(res.body[0]).toHaveProperty('completedTasks')
  })

  it('debe filtrar por estado', async () => {
    const res = await request(app)
      .get('/projects?status=PAUSADO')
      .set('Authorization', `Bearer ${tokenGerente}`)

    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    expect(res.body.every((project: any) => project.status === 'PAUSADO')).toBe(true)
  })

  it('empleado solo debe ver proyectos donde es miembro', async () => {
    const res = await request(app)
      .get('/projects')
      .set('Authorization', `Bearer ${tokenEmpleado2}`)

    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body.every((project: any) =>
      project.members.some((member: any) => member.userId === empleado2Id)
    )).toBe(true)
  })

  it('debe filtrar proyectos por lider', async () => {
    const otherLeader = await prisma.user.create({
      data: {
        name: 'Lider Filtro QA',
        email: `lider-filtro-${Date.now()}@novatech.mx`,
        passwordHash: 'hash_temporal',
        role: 'LIDER'
      }
    })

    await prisma.project.create({
      data: {
        publicCode: makeProjectCode(),
        name: 'Proyecto de otro lider',
        description: 'Auxiliar para filtrar por lider',
        startDate: new Date('2027-03-01'),
        deadline: new Date('2027-03-20'),
        status: 'ACTIVO',
        creatorId: gerenteId,
        leaderId: otherLeader.id,
        members: {
          create: [{ userId: otherLeader.id }]
        }
      }
    })

    const res = await request(app)
      .get(`/projects?leaderId=${leaderId}`)
      .set('Authorization', `Bearer ${tokenGerente}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body.every((project: any) => project.leaderId === leaderId)).toBe(true)
  })

  it('debe paginar proyectos en bloques de 10', async () => {
    for (let index = 0; index < 11; index += 1) {
      await prisma.project.create({
        data: {
          publicCode: makeProjectCode(),
          name: `Proyecto paginacion ${index + 1}`,
          description: 'Auxiliar para validar paginacion',
          startDate: new Date('2027-04-01'),
          deadline: new Date('2027-04-20'),
          status: 'PAUSADO',
          creatorId: gerenteId,
          leaderId,
          members: {
            create: [{ userId: leaderId }]
          }
        }
      })
    }

    const res = await request(app)
      .get('/projects?page=1&pageSize=10')
      .set('Authorization', `Bearer ${tokenGerente}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.items)).toBe(true)
    expect(res.body.items.length).toBe(10)
    expect(res.body.pagination.page).toBe(1)
    expect(res.body.pagination.pageSize).toBe(10)
    expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(11)
    expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2)
  })
})

describe('GET /projects/:id', () => {
  it('debe retornar el detalle del proyecto para un miembro', async () => {
    const res = await request(app)
      .get(`/projects/${projectActivoId}`)
      .set('Authorization', `Bearer ${tokenEmpleado1}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(projectActivoId)
    expect(res.body).toHaveProperty('tasks')
    expect(res.body).toHaveProperty('progress')
    expect(Array.isArray(res.body.auditLogs)).toBe(true)
  })

  it('debe retornar 403 si el usuario no es miembro ni gerente/admin', async () => {
    const res = await request(app)
      .get(`/projects/${inaccessibleProjectId}`)
      .set('Authorization', `Bearer ${tokenEmpleado2}`)

    expect(res.status).toBe(403)
  })

  it('debe retornar 404 si el proyecto no existe', async () => {
    const res = await request(app)
      .get('/projects/proyecto-inexistente')
      .set('Authorization', `Bearer ${tokenGerente}`)

    expect(res.status).toBe(404)
  })
})

describe('POST /projects', () => {
  it('TP-05: empleado no puede crear proyectos y debe retornar 403', async () => {
    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenEmpleado1}`)
      .send({
        name: 'Proyecto no permitido',
        startDate: '2026-04-01',
        deadline: '2026-05-01',
        leaderId
      })

    expect(res.status).toBe(403)
  })

  it('debe crear un proyecto correctamente', async () => {
    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenGerente}`)
      .send({
        name: 'Proyecto de pruebas API',
        description: 'Proyecto creado desde tests',
        startDate: '2026-06-01',
        deadline: '2026-07-01',
        leaderId
      })

    expect(res.status).toBe(201)

    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: res.body.id,
          userId: leaderId
        }
      }
    })

    expect(membership).not.toBeNull()

    const auditLogs = await prisma.projectAuditLog.findMany({
      where: { projectId: res.body.id },
      orderBy: { createdAt: 'desc' }
    })

    expect(auditLogs.length).toBeGreaterThan(0)
    expect(auditLogs[0].action).toBe('CREATED')
  })

  it('debe retornar 400 si faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenGerente}`)
      .send({ name: 'Sin fechas ni lider' })

    expect(res.status).toBe(400)
  })

  it('debe retornar 400 si deadline es anterior a startDate', async () => {
    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenGerente}`)
      .send({
        name: 'Fechas invalidas',
        startDate: '2026-05-01',
        deadline: '2026-04-01',
        leaderId
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('posterior')
  })

  it('debe retornar 400 si el lider asignado no tiene rol LIDER', async () => {
    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenGerente}`)
      .send({
        name: 'Lider invalido',
        startDate: '2026-06-01',
        deadline: '2026-07-01',
        leaderId: adminId
      })

    expect(res.status).toBe(400)
  })

  it('debe impedir crear un proyecto activo si el lider ya pertenece a 5 proyectos activos', async () => {
    const activeMemberships = await prisma.projectMember.count({
      where: {
        userId: leaderId,
        project: { status: 'ACTIVO' }
      }
    })

    const missingProjects = Math.max(0, 5 - activeMemberships)

    for (let index = 0; index < missingProjects; index += 1) {
      const publicCode = makeProjectCode()
      await prisma.project.create({
        data: {
          publicCode,
          name: `Proyecto limite ${index + 1}`,
          description: 'Proyecto auxiliar para validar RN-01',
          startDate: new Date('2026-10-01'),
          deadline: new Date('2026-10-31'),
          status: 'ACTIVO',
          creatorId: gerenteId,
          leaderId,
          members: {
            create: [{ userId: leaderId }]
          }
        }
      })
    }

    const res = await request(app)
      .post('/projects')
      .set('Authorization', `Bearer ${tokenGerente}`)
      .send({
        name: 'Proyecto bloqueado por limite',
        description: 'No deberia poder crearse',
        startDate: '2026-11-01',
        deadline: '2026-11-30',
        leaderId
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('5 proyectos activos')
  })
})

describe('PUT /projects/:id', () => {
  it('debe actualizar un proyecto existente', async () => {
    const res = await request(app)
      .put(`/projects/${projectPausadoId}`)
      .set('Authorization', `Bearer ${tokenGerente}`)
      .send({
        name: 'App Movil Inventario Actualizada',
        description: 'Descripcion actualizada'
      })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('App Movil Inventario Actualizada')

    const latestAudit = await prisma.projectAuditLog.findFirst({
      where: { projectId: projectPausadoId },
      orderBy: { createdAt: 'desc' }
    })

    expect(latestAudit).not.toBeNull()
    expect(latestAudit?.action).toBe('UPDATED')
  })

  it('debe retornar 404 si el proyecto no existe', async () => {
    const res = await request(app)
      .put('/projects/proyecto-inexistente')
      .set('Authorization', `Bearer ${tokenGerente}`)
      .send({ name: 'No existe' })

    expect(res.status).toBe(404)
  })

  it('debe retornar 400 si deadline es anterior al inicio', async () => {
    const res = await request(app)
      .put(`/projects/${projectPausadoId}`)
      .set('Authorization', `Bearer ${tokenGerente}`)
      .send({
        startDate: '2026-07-10',
        deadline: '2026-07-01'
      })

    expect(res.status).toBe(400)
  })

  it('debe impedir acortar la fecha del proyecto si deja tareas fuera del rango', async () => {
    const projectCode = makeProjectCode()
    const project = await prisma.project.create({
      data: {
        publicCode: projectCode,
        name: 'Proyecto con tareas fuera de rango',
        description: 'Valida RN-04 al editar proyecto',
        startDate: new Date('2026-12-01'),
        deadline: new Date('2026-12-31'),
        status: 'ACTIVO',
        creatorId: gerenteId,
        leaderId,
        members: {
          create: [{ userId: leaderId }]
        },
        tasks: {
          create: [{
            publicCode: makeTaskCode(projectCode),
            title: 'Tarea con fecha alta',
            description: 'Debe bloquear el cambio del proyecto',
            status: 'PENDIENTE',
            priority: 'MEDIA',
            deadline: new Date('2026-12-20'),
            sortOrder: 0
          }]
        }
      }
    })

    const res = await request(app)
      .put(`/projects/${project.id}`)
      .set('Authorization', `Bearer ${tokenGerente}`)
      .send({
        deadline: '2026-12-10'
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('fecha limite del proyecto')
  })
})

describe('Reglas de negocio de tareas', () => {
  it('debe impedir crear una tarea con fecha posterior a la del proyecto', async () => {
    const projectCode = makeProjectCode()
    const project = await prisma.project.create({
      data: {
        publicCode: projectCode,
        name: 'Proyecto para crear tarea invalida',
        description: 'Valida RN-04 en creacion de tarea',
        startDate: new Date('2027-01-01'),
        deadline: new Date('2027-01-15'),
        status: 'ACTIVO',
        creatorId: gerenteId,
        leaderId,
        members: {
          create: [{ userId: leaderId }]
        }
      }
    })

    const res = await request(app)
      .post(`/projects/${project.id}/tasks`)
      .set('Authorization', `Bearer ${tokenLider}`)
      .send({
        title: 'Tarea fuera de rango',
        priority: 'MEDIA',
        deadline: '2027-01-20'
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('fecha limite de la tarea')
  })

  it('debe impedir actualizar una tarea con fecha posterior a la del proyecto', async () => {
    const projectCode = makeProjectCode()
    const project = await prisma.project.create({
      data: {
        publicCode: projectCode,
        name: 'Proyecto para actualizar tarea invalida',
        description: 'Valida RN-04 en edicion de tarea',
        startDate: new Date('2027-02-01'),
        deadline: new Date('2027-02-18'),
        status: 'ACTIVO',
        creatorId: gerenteId,
        leaderId,
        members: {
          create: [{ userId: leaderId }]
        },
        tasks: {
          create: [{
            publicCode: makeTaskCode(projectCode),
            title: 'Tarea editable',
            description: 'Se intentara mover fuera del limite',
            status: 'PENDIENTE',
            priority: 'MEDIA',
            deadline: new Date('2027-02-10'),
            sortOrder: 0
          }]
        }
      },
      include: {
        tasks: true
      }
    })

    const res = await request(app)
      .put(`/tasks/${project.tasks[0].id}`)
      .set('Authorization', `Bearer ${tokenLider}`)
      .send({
        deadline: '2027-02-25'
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('fecha limite de la tarea')
  })
})

describe('PATCH /projects/:id/status', () => {
  it('debe retornar 400 con estado invalido', async () => {
    const res = await request(app)
      .patch('/projects/cualquier-id/status')
      .set('Authorization', `Bearer ${tokenGerente}`)
      .send({ status: 'ESTADO_INVALIDO' })

    expect(res.status).toBe(400)
  })

  it('lider no puede cambiar estado y debe retornar 403', async () => {
    const res = await request(app)
      .patch(`/projects/${projectActivoId}/status`)
      .set('Authorization', `Bearer ${tokenLider}`)
      .send({ status: 'CERRADO' })

    expect(res.status).toBe(403)
  })

  it('debe retornar 404 si el proyecto no existe', async () => {
    const res = await request(app)
      .patch('/projects/proyecto-inexistente/status')
      .set('Authorization', `Bearer ${tokenGerente}`)
      .send({ status: 'PAUSADO' })

    expect(res.status).toBe(404)
  })

  it('no debe permitir cerrar un proyecto con tareas activas', async () => {
    const res = await request(app)
      .patch(`/projects/${projectActivoId}/status`)
      .set('Authorization', `Bearer ${tokenGerente}`)
      .send({ status: 'CERRADO' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('No se puede cerrar el proyecto')
  })

  it('debe cambiar el estado correctamente cuando la regla de negocio lo permite', async () => {
    const res = await request(app)
      .patch(`/projects/${closableProjectId}/status`)
      .set('Authorization', `Bearer ${tokenGerente}`)
      .send({ status: 'CERRADO' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('CERRADO')

    const latestAudit = await prisma.projectAuditLog.findFirst({
      where: { projectId: closableProjectId },
      orderBy: { createdAt: 'desc' }
    })

    expect(latestAudit).not.toBeNull()
    expect(latestAudit?.action).toBe('STATUS_CHANGED')
    expect(latestAudit?.summary).toContain('PAUSADO')
    expect(latestAudit?.summary).toContain('CERRADO')
  })
})
