import 'dotenv/config'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient, ProjectStatus, Priority, Role, TaskStatus } from '@prisma/client'
import bcrypt from 'bcrypt'

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL as string,
})

const prisma = new PrismaClient({ adapter })

type SeedUser = {
  key: string
  name: string
  email: string
  role: Role
  isActive?: boolean
}

type SeedProject = {
  key: string
  publicCode: string
  name: string
  description: string
  startDate: string
  deadline: string
  status: ProjectStatus
  creatorKey: string
  leaderKey: string
  memberKeys: string[]
}

type SeedTask = {
  publicCode: string
  title: string
  description: string
  labels?: string
  status: TaskStatus
  priority: Priority
  deadline: string
  completedAt?: string
  assigneeKey?: string
}

const usersSeed: SeedUser[] = [
  { key: 'admin', name: 'Carlos Mendoza', email: 'admin@novatech.mx', role: Role.ADMIN },
  { key: 'gerente', name: 'Laura Vargas', email: 'gerente@novatech.mx', role: Role.GERENTE },
  { key: 'gerente2', name: 'Sofia Herrera', email: 'gerente2@novatech.mx', role: Role.GERENTE },
  { key: 'lider', name: 'Andres Torres', email: 'lider@novatech.mx', role: Role.LIDER },
  { key: 'lider2', name: 'Paula Rios', email: 'lider2@novatech.mx', role: Role.LIDER },
  { key: 'lider3', name: 'Jorge Medina', email: 'lider3@novatech.mx', role: Role.LIDER },
  { key: 'empleado1', name: 'Maria Ramirez', email: 'empleado1@novatech.mx', role: Role.EMPLEADO },
  { key: 'empleado2', name: 'Diego Flores', email: 'empleado2@novatech.mx', role: Role.EMPLEADO },
  { key: 'empleado3', name: 'Fernanda Cruz', email: 'empleado3@novatech.mx', role: Role.EMPLEADO },
  { key: 'empleado4', name: 'Ricardo Luna', email: 'empleado4@novatech.mx', role: Role.EMPLEADO },
  { key: 'empleado5', name: 'Ana Beltran', email: 'empleado5@novatech.mx', role: Role.EMPLEADO },
  { key: 'empleado6', name: 'Luis Romero', email: 'empleado6@novatech.mx', role: Role.EMPLEADO },
  { key: 'empleado7', name: 'Camila Soto', email: 'empleado7@novatech.mx', role: Role.EMPLEADO },
  { key: 'empleado8', name: 'Tomas Vega', email: 'empleado8@novatech.mx', role: Role.EMPLEADO },
  { key: 'empleado9', name: 'Valeria Nunez', email: 'empleado9@novatech.mx', role: Role.EMPLEADO, isActive: false }
]

const projectsSeed: SeedProject[] = [
  {
    key: 'portal-bancario',
    publicCode: 'PRJ-001',
    name: 'Portal Web Cliente Bancario',
    description: 'Portal web responsivo para gestion de cuentas, transferencias, perfil y monitoreo de movimientos en linea.',
    startDate: '2026-03-01',
    deadline: '2026-04-15',
    status: ProjectStatus.ACTIVO,
    creatorKey: 'gerente',
    leaderKey: 'lider',
    memberKeys: ['lider', 'empleado1', 'empleado2', 'empleado3']
  },
  {
    key: 'inventario-movil',
    publicCode: 'PRJ-002',
    name: 'App Movil Inventario',
    description: 'Aplicacion movil para inventario con lector de codigo de barras, alertas y movimientos en tiempo real.',
    startDate: '2026-02-01',
    deadline: '2026-05-30',
    status: ProjectStatus.PAUSADO,
    creatorKey: 'gerente',
    leaderKey: 'lider2',
    memberKeys: ['lider2', 'empleado1', 'empleado4', 'empleado5']
  },
  {
    key: 'nomina-inteligente',
    publicCode: 'PRJ-003',
    name: 'Sistema de Nomina Inteligente',
    description: 'Modernizacion del sistema de nomina con aprobaciones, reportes, portal de colaboradores y trazabilidad.',
    startDate: '2026-02-20',
    deadline: '2026-04-28',
    status: ProjectStatus.ACTIVO,
    creatorKey: 'admin',
    leaderKey: 'lider',
    memberKeys: ['lider', 'gerente', 'empleado2', 'empleado6']
  },
  {
    key: 'crm-ventas',
    publicCode: 'PRJ-004',
    name: 'CRM Comercial B2B',
    description: 'Plataforma para seguimiento de leads, pipeline de ventas y tableros ejecutivos para direccion comercial.',
    startDate: '2026-01-15',
    deadline: '2026-06-10',
    status: ProjectStatus.ACTIVO,
    creatorKey: 'gerente2',
    leaderKey: 'lider2',
    memberKeys: ['lider2', 'empleado3', 'empleado4', 'empleado7']
  },
  {
    key: 'mesa-ayuda',
    publicCode: 'PRJ-005',
    name: 'Portal de Mesa de Ayuda',
    description: 'Sistema de tickets internos con SLA, categorias, bitacora de atencion y panel de soporte.',
    startDate: '2026-02-10',
    deadline: '2026-04-22',
    status: ProjectStatus.ACTIVO,
    creatorKey: 'gerente2',
    leaderKey: 'lider3',
    memberKeys: ['lider3', 'empleado5', 'empleado6', 'empleado8']
  },
  {
    key: 'analytics-logistica',
    publicCode: 'PRJ-006',
    name: 'Dashboard Analytics Logistica',
    description: 'Tableros para tiempos de entrega, ocupacion de rutas y alertas operativas para coordinacion.',
    startDate: '2026-01-05',
    deadline: '2026-03-25',
    status: ProjectStatus.CERRADO,
    creatorKey: 'admin',
    leaderKey: 'lider3',
    memberKeys: ['lider3', 'empleado4', 'empleado7']
  }
]

const tasksByProject: Record<string, SeedTask[]> = {
  'portal-bancario': [
    {
      publicCode: 'TSK-001-001',
      title: 'Diseno de wireframes del portal',
      description: 'Crear wireframes de baja fidelidad para onboarding, dashboard y modulo de transferencias.',
      labels: 'ux, discovery',
      status: TaskStatus.COMPLETADA,
      priority: Priority.ALTA,
      deadline: '2026-03-10',
      completedAt: '2026-03-09',
      assigneeKey: 'empleado1'
    },
    {
      publicCode: 'TSK-001-002',
      title: 'Configuracion del entorno de desarrollo',
      description: 'Preparar Angular, Express, Prisma, scripts y lineamientos base del proyecto.',
      labels: 'setup, devops',
      status: TaskStatus.COMPLETADA,
      priority: Priority.ALTA,
      deadline: '2026-03-08',
      completedAt: '2026-03-07',
      assigneeKey: 'empleado2'
    },
    {
      publicCode: 'TSK-001-003',
      title: 'Desarrollo del modulo de autenticacion',
      description: 'Implementar login con JWT, proteccion de rutas, caducidad de sesion y mensajes de error.',
      labels: 'backend, seguridad',
      status: TaskStatus.EN_PROGRESO,
      priority: Priority.ALTA,
      deadline: '2026-04-11',
      assigneeKey: 'empleado2'
    },
    {
      publicCode: 'TSK-001-004',
      title: 'Diseno de base de datos de transferencias',
      description: 'Modelar cuentas, movimientos, beneficiarios y reglas de integridad para las transferencias.',
      labels: 'prisma, modelado',
      status: TaskStatus.EN_REVISION,
      priority: Priority.ALTA,
      deadline: '2026-04-09',
      assigneeKey: 'empleado3'
    },
    {
      publicCode: 'TSK-001-005',
      title: 'Implementar historial de movimientos',
      description: 'Crear endpoint con filtros por fecha, paginacion y exportacion de resultados.',
      labels: 'api, reportes',
      status: TaskStatus.PENDIENTE,
      priority: Priority.MEDIA,
      deadline: '2026-04-13',
      assigneeKey: 'empleado1'
    },
    {
      publicCode: 'TSK-001-006',
      title: 'Pruebas de usabilidad con usuarios reales',
      description: 'Aplicar cuestionario SUS, documentar hallazgos y proponer ajustes de interfaz.',
      labels: 'sus, ux',
      status: TaskStatus.PENDIENTE,
      priority: Priority.BAJA,
      deadline: '2026-04-14',
      assigneeKey: 'empleado1'
    }
  ],
  'inventario-movil': [
    {
      publicCode: 'TSK-002-001',
      title: 'Crear tablero de alertas de inventario',
      description: 'Disenar pantalla de stock minimo y notificaciones de reabastecimiento.',
      labels: 'mobile, alertas',
      status: TaskStatus.EN_PROGRESO,
      priority: Priority.ALTA,
      deadline: '2026-04-12',
      assigneeKey: 'empleado4'
    },
    {
      publicCode: 'TSK-002-002',
      title: 'Ajustar exportacion de recibos a PDF',
      description: 'Corregir formato, logo y margenes para la descarga de comprobantes.',
      labels: 'pdf, frontend',
      status: TaskStatus.PENDIENTE,
      priority: Priority.MEDIA,
      deadline: '2026-04-18',
      assigneeKey: 'empleado5'
    },
    {
      publicCode: 'TSK-002-003',
      title: 'Sincronizacion offline de catalogos',
      description: 'Validar cache local y reintentos de sincronizacion cuando no hay red.',
      labels: 'offline, sync',
      status: TaskStatus.EN_REVISION,
      priority: Priority.MEDIA,
      deadline: '2026-04-20',
      assigneeKey: 'empleado1'
    },
    {
      publicCode: 'TSK-002-004',
      title: 'Flujo de conteo ciclico',
      description: 'Implementar recorrido guiado por pasillo y conciliacion automatica.',
      labels: 'logistica, negocio',
      status: TaskStatus.PENDIENTE,
      priority: Priority.ALTA,
      deadline: '2026-04-26',
      assigneeKey: 'lider2'
    }
  ],
  'nomina-inteligente': [
    {
      publicCode: 'TSK-003-001',
      title: 'Definir reglas de aprobacion de nomina',
      description: 'Documentar flujo de autorizacion para incidencias, bonos y horas extra.',
      labels: 'proceso, rh',
      status: TaskStatus.EN_PROGRESO,
      priority: Priority.MEDIA,
      deadline: '2026-04-10',
      assigneeKey: 'gerente'
    },
    {
      publicCode: 'TSK-003-002',
      title: 'Validar integracion con reportes de RH',
      description: 'Revisar widgets operativos y validar consistencia de datos en corte quincenal.',
      labels: 'qa, reportes',
      status: TaskStatus.PENDIENTE,
      priority: Priority.ALTA,
      deadline: '2026-04-09',
      assigneeKey: 'lider'
    },
    {
      publicCode: 'TSK-003-003',
      title: 'Preparar reporte ejecutivo para direccion',
      description: 'Consolidar avance, riesgos, productividad y tareas vencidas del proyecto.',
      labels: 'dashboard, direccion',
      status: TaskStatus.PENDIENTE,
      priority: Priority.MEDIA,
      deadline: '2026-04-18',
      assigneeKey: 'gerente'
    },
    {
      publicCode: 'TSK-003-004',
      title: 'Migracion de historicos de empleados',
      description: 'Cargar historico de incidencias y validar integridad de claves unicas.',
      labels: 'migracion, datos',
      status: TaskStatus.COMPLETADA,
      priority: Priority.ALTA,
      deadline: '2026-03-22',
      completedAt: '2026-03-21',
      assigneeKey: 'empleado6'
    },
    {
      publicCode: 'TSK-003-005',
      title: 'Portal de colaboradores para recibos',
      description: 'Habilitar consulta y descarga segura de recibos por periodo.',
      labels: 'portal, seguridad',
      status: TaskStatus.EN_REVISION,
      priority: Priority.ALTA,
      deadline: '2026-04-16',
      assigneeKey: 'empleado2'
    }
  ],
  'crm-ventas': [
    {
      publicCode: 'TSK-004-001',
      title: 'Pipeline visual para oportunidades',
      description: 'Crear tablero comercial con arrastre por etapa y valor potencial.',
      labels: 'kanban, ventas',
      status: TaskStatus.EN_PROGRESO,
      priority: Priority.ALTA,
      deadline: '2026-04-17',
      assigneeKey: 'empleado7'
    },
    {
      publicCode: 'TSK-004-002',
      title: 'Importador masivo de leads',
      description: 'Subir prospectos desde Excel y validar duplicados.',
      labels: 'importacion, crm',
      status: TaskStatus.PENDIENTE,
      priority: Priority.MEDIA,
      deadline: '2026-04-24',
      assigneeKey: 'empleado3'
    },
    {
      publicCode: 'TSK-004-003',
      title: 'Dashboard ejecutivo de conversion',
      description: 'Mostrar ratios por ejecutivo, etapa y segmento.',
      labels: 'charts, reportes',
      status: TaskStatus.PENDIENTE,
      priority: Priority.ALTA,
      deadline: '2026-04-28',
      assigneeKey: 'lider2'
    },
    {
      publicCode: 'TSK-004-004',
      title: 'Integracion con agenda comercial',
      description: 'Relacionar reuniones, seguimiento y alertas para el equipo de ventas.',
      labels: 'integracion, agenda',
      status: TaskStatus.COMPLETADA,
      priority: Priority.MEDIA,
      deadline: '2026-03-30',
      completedAt: '2026-03-28',
      assigneeKey: 'empleado4'
    }
  ],
  'mesa-ayuda': [
    {
      publicCode: 'TSK-005-001',
      title: 'Definir SLA por categoria',
      description: 'Configurar tiempos de respuesta y escalamiento por severidad.',
      labels: 'sla, soporte',
      status: TaskStatus.COMPLETADA,
      priority: Priority.ALTA,
      deadline: '2026-03-26',
      completedAt: '2026-03-25',
      assigneeKey: 'lider3'
    },
    {
      publicCode: 'TSK-005-002',
      title: 'Formulario de ticket con adjuntos',
      description: 'Permitir carga de evidencia y validacion por tipo de incidente.',
      labels: 'forms, soporte',
      status: TaskStatus.EN_PROGRESO,
      priority: Priority.MEDIA,
      deadline: '2026-04-19',
      assigneeKey: 'empleado8'
    },
    {
      publicCode: 'TSK-005-003',
      title: 'Bitacora de atencion por ticket',
      description: 'Registrar eventos, notas internas y cambios de estado.',
      labels: 'auditoria, historial',
      status: TaskStatus.PENDIENTE,
      priority: Priority.ALTA,
      deadline: '2026-04-21',
      assigneeKey: 'empleado5'
    },
    {
      publicCode: 'TSK-005-004',
      title: 'Panel de metricas de soporte',
      description: 'Construir KPIs de resolucion, backlog y tickets vencidos.',
      labels: 'dashboard, soporte',
      status: TaskStatus.EN_REVISION,
      priority: Priority.MEDIA,
      deadline: '2026-04-20',
      assigneeKey: 'empleado6'
    }
  ],
  'analytics-logistica': [
    {
      publicCode: 'TSK-006-001',
      title: 'KPI de entregas por region',
      description: 'Consolidar entregas, retrasos y ocupacion de unidades por zona.',
      labels: 'analytics, logistica',
      status: TaskStatus.COMPLETADA,
      priority: Priority.ALTA,
      deadline: '2026-03-05',
      completedAt: '2026-03-04',
      assigneeKey: 'empleado7'
    },
    {
      publicCode: 'TSK-006-002',
      title: 'Reporte historico por operador',
      description: 'Generar tablero mensual de puntualidad y carga atendida.',
      labels: 'reportes, logistica',
      status: TaskStatus.COMPLETADA,
      priority: Priority.MEDIA,
      deadline: '2026-03-12',
      completedAt: '2026-03-11',
      assigneeKey: 'empleado4'
    },
    {
      publicCode: 'TSK-006-003',
      title: 'Cierre de hallazgos de implementacion',
      description: 'Registrar pendientes finales y documentar el cierre del proyecto.',
      labels: 'cierre, documental',
      status: TaskStatus.COMPLETADA,
      priority: Priority.BAJA,
      deadline: '2026-03-22',
      completedAt: '2026-03-20',
      assigneeKey: 'lider3'
    }
  ]
}

async function main() {
  console.log('Iniciando seed...')

  await prisma.comment.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.projectAuditLog.deleteMany()
  await prisma.task.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
  console.log('BD limpiada')

  const passwordHash = await bcrypt.hash('Password123!', 10)
  const users = new Map<string, Awaited<ReturnType<typeof prisma.user.create>>>()

  for (const user of usersSeed) {
    const createdUser = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        isActive: user.isActive ?? true
      }
    })
    users.set(user.key, createdUser)
  }

  console.log(`Usuarios creados: ${users.size}`)

  const projects = new Map<string, Awaited<ReturnType<typeof prisma.project.create>>>()
  let membershipsCount = 0
  let tasksCount = 0

  for (const project of projectsSeed) {
    const createdProject = await prisma.project.create({
      data: {
        publicCode: project.publicCode,
        name: project.name,
        description: project.description,
        startDate: new Date(project.startDate),
        deadline: new Date(project.deadline),
        status: project.status,
        creatorId: users.get(project.creatorKey)!.id,
        leaderId: users.get(project.leaderKey)!.id
      }
    })

    projects.set(project.key, createdProject)

    await prisma.projectMember.createMany({
      data: project.memberKeys.map((memberKey) => ({
        projectId: createdProject.id,
        userId: users.get(memberKey)!.id
      }))
    })
    membershipsCount += project.memberKeys.length

    const projectTasks = tasksByProject[project.key] || []
    for (const [index, task] of projectTasks.entries()) {
      await prisma.task.create({
        data: {
          publicCode: task.publicCode,
          title: task.title,
          description: task.description,
          labels: task.labels,
          status: task.status,
          priority: task.priority,
          deadline: new Date(task.deadline),
          completedAt: task.completedAt ? new Date(task.completedAt) : null,
          sortOrder: index,
          projectId: createdProject.id,
          assigneeId: task.assigneeKey ? users.get(task.assigneeKey)!.id : null
        }
      })
      tasksCount += 1
    }
  }

  console.log(`Proyectos creados: ${projects.size}`)
  console.log(`Membresias creadas: ${membershipsCount}`)
  console.log(`Tareas creadas: ${tasksCount}`)

  const taskByCode = new Map(
    (await prisma.task.findMany({ select: { id: true, publicCode: true } }))
      .filter((task) => task.publicCode)
      .map((task) => [task.publicCode!, task.id])
  )

  const commentsSeed = [
    ['TSK-001-001', 'Wireframes listos y validados con el cliente.', 'empleado1'],
    ['TSK-001-001', 'Aprobado para continuar con el prototipo de alta fidelidad.', 'lider'],
    ['TSK-001-003', 'Tengo un bloqueo con la persistencia del token entre recargas.', 'empleado2'],
    ['TSK-001-003', 'Revisa la sesion y el refresco del perfil despues del login.', 'lider'],
    ['TSK-001-004', 'Schema listo, pendiente validar relaciones con datos reales.', 'empleado3'],
    ['TSK-002-001', 'La vista de alertas ya contempla stock minimo y criticidad.', 'empleado4'],
    ['TSK-002-002', 'Voy a revisar el PDF junto con los estilos del frontend.', 'empleado5'],
    ['TSK-003-001', 'Necesito validar estas reglas con RH antes de cerrar el flujo.', 'gerente'],
    ['TSK-003-003', 'La direccion quiere ver comparativo semanal y tareas vencidas.', 'admin'],
    ['TSK-004-001', 'El equipo comercial pidio colores mas claros por etapa.', 'lider2'],
    ['TSK-005-003', 'Propongo guardar cada cambio de ticket como movimiento auditado.', 'empleado5'],
    ['TSK-006-003', 'Se documentaron lecciones aprendidas y fecha oficial de cierre.', 'lider3']
  ] as const

  for (const [taskCode, content, authorKey] of commentsSeed) {
    await prisma.comment.create({
      data: {
        content,
        taskId: taskByCode.get(taskCode)!,
        authorId: users.get(authorKey)!.id
      }
    })
  }

  const deletedComment = await prisma.comment.create({
    data: {
      content: 'Comentario eliminado por el autor.',
      deletedAt: new Date('2026-04-07T10:30:00'),
      taskId: taskByCode.get('TSK-003-002')!,
      authorId: users.get('lider')!.id
    }
  })

  console.log(`Comentarios creados: ${commentsSeed.length + 1}`)

  const auditLogsSeed = [
    ['portal-bancario', 'gerente', 'CREATED', 'Proyecto creado y asignado a Andres Torres como lider.'],
    ['portal-bancario', 'gerente', 'UPDATED', 'Se actualizaron descripcion y fecha limite del proyecto.'],
    ['inventario-movil', 'gerente', 'STATUS_CHANGED', 'El estado del proyecto cambio de ACTIVO a PAUSADO.'],
    ['nomina-inteligente', 'admin', 'CREATED', 'Proyecto registrado para modernizar el proceso de nomina.'],
    ['crm-ventas', 'gerente2', 'CREATED', 'Proyecto comercial habilitado para seguimiento de oportunidades.'],
    ['mesa-ayuda', 'gerente2', 'UPDATED', 'Se actualizo el alcance del panel de metricas y bitacora.'],
    ['analytics-logistica', 'admin', 'STATUS_CHANGED', 'El estado del proyecto cambio de ACTIVO a CERRADO y se archivaron las tareas pendientes.']
  ] as const

  for (const [projectKey, actorKey, action, summary] of auditLogsSeed) {
    await prisma.projectAuditLog.create({
      data: {
        projectId: projects.get(projectKey)!.id,
        actorId: users.get(actorKey)!.id,
        action,
        summary
      }
    })
  }

  const notificationsSeed = [
    ['lider', 'Nuevo proyecto asignado', 'Se te asigno el proyecto Portal Web Cliente Bancario para coordinacion operativa.', `/projects/${projects.get('portal-bancario')!.id}`],
    ['lider2', 'Nuevo proyecto asignado', 'Se te asigno el proyecto CRM Comercial B2B para coordinacion operativa.', `/projects/${projects.get('crm-ventas')!.id}`],
    ['empleado1', 'Nueva tarea asignada', 'Se te asigno la tarea Implementar historial de movimientos.', `/projects/${projects.get('portal-bancario')!.id}`],
    ['empleado4', 'Nueva tarea asignada', 'Se te asigno la tarea Crear tablero de alertas de inventario.', `/projects/${projects.get('inventario-movil')!.id}`],
    ['empleado8', 'Nueva tarea asignada', 'Se te asigno la tarea Formulario de ticket con adjuntos.', `/projects/${projects.get('mesa-ayuda')!.id}`],
    ['gerente', 'Tarea reasignada', 'Ahora eres responsable de la tarea Preparar reporte ejecutivo para direccion.', `/projects/${projects.get('nomina-inteligente')!.id}`]
  ] as const

  for (const [userKey, title, message, link] of notificationsSeed) {
    await prisma.notification.create({
      data: {
        userId: users.get(userKey)!.id,
        title,
        message,
        link
      }
    })
  }

  await prisma.notification.updateMany({
    where: {
      userId: users.get('lider')!.id
    },
    data: {
      readAt: new Date('2026-04-07T09:15:00')
    }
  })

  console.log(`Notificaciones creadas: ${notificationsSeed.length}`)
  console.log(`Comentario demo con borrado logico: ${deletedComment.id}`)

  console.log('\nResumen del seed:')
  console.log(`   Usuarios      : ${users.size}`)
  console.log(`   Proyectos     : ${projects.size}`)
  console.log(`   Membresias    : ${membershipsCount}`)
  console.log(`   Tareas        : ${tasksCount}`)
  console.log(`   Comentarios   : ${commentsSeed.length + 1}`)
  console.log(`   Auditoria     : ${auditLogsSeed.length}`)
  console.log(`   Notificaciones: ${notificationsSeed.length}`)
  console.log('\nContrasena de todos los usuarios: Password123!')
  console.log('Correos disponibles:')
  usersSeed.forEach((user) => console.log(`   ${user.email}`))
}

main()
  .catch((error) => {
    console.error('Error en seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
