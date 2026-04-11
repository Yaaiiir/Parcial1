// prisma/seed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Script de seed — SGP NovaTech Consulting
// Crea datos de prueba realistas para los 4 roles del sistema.
//
// Cómo ejecutar:
//   1. Agrega en package.json:
//      "prisma": { "seed": "ts-node prisma/seed.ts" }
//   2. Ejecuta: npx prisma db seed
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient, Role, ProjectStatus, TaskStatus, Priority } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ── 1. LIMPIAR BD (orden importa por las FKs) ──────────────────────────────
  await prisma.comment.deleteMany()
  await prisma.task.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
  console.log('✅ BD limpiada')

  // ── 2. USUARIOS (1 por rol) ────────────────────────────────────────────────
  const password = await bcrypt.hash('Password123!', 10)
  // Todos los usuarios de prueba comparten la misma contraseña: Password123!

  const admin = await prisma.user.create({
    data: {
      name:         'Carlos Mendoza',
      email:        'admin@novatech.mx',
      passwordHash: password,
      role:         Role.ADMIN,
    }
  })

  const gerente = await prisma.user.create({
    data: {
      name:         'Laura Vargas',
      email:        'gerente@novatech.mx',
      passwordHash: password,
      role:         Role.GERENTE,
    }
  })

  const lider = await prisma.user.create({
    data: {
      name:         'Andrés Torres',
      email:        'lider@novatech.mx',
      passwordHash: password,
      role:         Role.LIDER,
    }
  })

  const empleado1 = await prisma.user.create({
    data: {
      name:         'María Ramírez',
      email:        'empleado1@novatech.mx',
      passwordHash: password,
      role:         Role.EMPLEADO,
    }
  })

  const empleado2 = await prisma.user.create({
    data: {
      name:         'Diego Flores',
      email:        'empleado2@novatech.mx',
      passwordHash: password,
      role:         Role.EMPLEADO,
    }
  })

  console.log('✅ Usuarios creados (contraseña de todos: Password123!)')

  // ── 3. PROYECTO ACTIVO ─────────────────────────────────────────────────────
  const proyecto1 = await prisma.project.create({
    data: {
      name:        'Portal Web Cliente Bancario',
      description: 'Desarrollo de portal web responsivo para gestión de cuentas bancarias. Incluye módulo de transferencias, historial de movimientos y perfil de usuario.',
      startDate:   new Date('2026-03-01'),
      deadline:    new Date('2026-04-15'),
      status:      ProjectStatus.ACTIVO,
      creatorId:   gerente.id,
      leaderId:    lider.id,
    }
  })

  // Proyecto pausado (para probar filtros)
  const proyecto2 = await prisma.project.create({
    data: {
      name:        'App Móvil Inventario',
      description: 'Aplicación móvil para control de inventario en tiempo real con lector de código de barras.',
      startDate:   new Date('2026-02-01'),
      deadline:    new Date('2026-05-30'),
      status:      ProjectStatus.PAUSADO,
      creatorId:   gerente.id,
      leaderId:    lider.id,
    }
  })

  console.log('✅ Proyectos creados')

  // ── 4. MEMBRESÍAS ─────────────────────────────────────────────────────────
  // Proyecto 1: líder + 2 empleados
  await prisma.projectMember.createMany({
    data: [
      { projectId: proyecto1.id, userId: lider.id     },
      { projectId: proyecto1.id, userId: empleado1.id },
      { projectId: proyecto1.id, userId: empleado2.id },
      { projectId: proyecto2.id, userId: lider.id     },
      { projectId: proyecto2.id, userId: empleado1.id },
    ]
  })

  console.log('✅ Membresías creadas')

  // ── 5. TAREAS del Proyecto 1 ───────────────────────────────────────────────
  const tarea1 = await prisma.task.create({
    data: {
      title:      'Diseño de wireframes del portal',
      description:'Crear wireframes de baja fidelidad para las 6 pantallas principales del portal usando Figma.',
      status:     TaskStatus.COMPLETADA,
      priority:   Priority.ALTA,
      deadline:   new Date('2026-03-10'),
      completedAt:new Date('2026-03-09'),
      projectId:  proyecto1.id,
      assigneeId: empleado1.id,
    }
  })

  const tarea2 = await prisma.task.create({
    data: {
      title:      'Configuración del entorno de desarrollo',
      description:'Instalar y configurar Node.js, Angular, PostgreSQL y Docker. Crear repositorio en GitHub con estructura de ramas.',
      status:     TaskStatus.COMPLETADA,
      priority:   Priority.ALTA,
      deadline:   new Date('2026-03-08'),
      completedAt:new Date('2026-03-07'),
      projectId:  proyecto1.id,
      assigneeId: empleado2.id,
    }
  })

  const tarea3 = await prisma.task.create({
    data: {
      title:      'Desarrollo del módulo de autenticación',
      description:'Implementar login con JWT, guards de Angular por rol y middleware de verificación en el backend.',
      status:     TaskStatus.EN_PROGRESO,
      priority:   Priority.ALTA,
      deadline:   new Date('2026-03-20'),
      projectId:  proyecto1.id,
      assigneeId: empleado2.id,
    }
  })

  const tarea4 = await prisma.task.create({
    data: {
      title:      'Diseño de base de datos — módulo transferencias',
      description:'Modelar las tablas accounts, transactions y beneficiaries. Crear schema Prisma y primera migración.',
      status:     TaskStatus.EN_REVISION,
      priority:   Priority.ALTA,
      deadline:   new Date('2026-03-18'),
      projectId:  proyecto1.id,
      assigneeId: empleado1.id,
    }
  })

  const tarea5 = await prisma.task.create({
    data: {
      title:      'Implementar historial de movimientos',
      description:'Endpoint GET /accounts/:id/transactions con paginación, filtros por fecha y exportación a CSV.',
      status:     TaskStatus.PENDIENTE,
      priority:   Priority.MEDIA,
      deadline:   new Date('2026-04-01'),
      projectId:  proyecto1.id,
      assigneeId: empleado1.id,
    }
  })

  const tarea6 = await prisma.task.create({
    data: {
      title:      'Pruebas de usabilidad con usuarios reales',
      description:'Aplicar cuestionario SUS con 5 usuarios. Documentar resultados y proponer mejoras.',
      status:     TaskStatus.PENDIENTE,
      priority:   Priority.BAJA,
      deadline:   new Date('2026-04-10'),
      projectId:  proyecto1.id,
      assigneeId: empleado1.id,
    }
  })

  console.log('✅ Tareas creadas')

  // ── 6. COMENTARIOS ─────────────────────────────────────────────────────────
  await prisma.comment.createMany({
    data: [
      {
        content:  'Wireframes listos y validados con el cliente. Subí el archivo Figma al repositorio en /docs/wireframes.',
        taskId:   tarea1.id,
        authorId: empleado1.id,
      },
      {
        content:  'Revisé los wireframes. Todo correcto, aprobado para continuar con el prototipo de alta fidelidad.',
        taskId:   tarea1.id,
        authorId: lider.id,
      },
      {
        content:  'Tengo un bloqueo en la configuración de JWT: el token no persiste entre recargas. ¿Alguien ha visto esto antes?',
        taskId:   tarea3.id,
        authorId: empleado2.id,
      },
      {
        content:  'Guarda el token en localStorage en el interceptor de Angular, no en la variable del servicio. Te paso el código.',
        taskId:   tarea3.id,
        authorId: lider.id,
      },
      {
        content:  'Schema listo, migración ejecutada sin errores. Pendiente validar las relaciones con datos reales.',
        taskId:   tarea4.id,
        authorId: empleado1.id,
      },
    ]
  })

  console.log('✅ Comentarios creados')

  // ── RESUMEN ────────────────────────────────────────────────────────────────
  console.log('\n📊 Resumen del seed:')
  console.log('   Usuarios  : 5 (1 admin, 1 gerente, 1 líder, 2 empleados)')
  console.log('   Proyectos : 2 (1 activo, 1 pausado)')
  console.log('   Membresías: 5')
  console.log('   Tareas    : 6 (2 completadas, 1 en progreso, 1 en revisión, 2 pendientes)')
  console.log('   Comentarios: 5')
  console.log('\n🔑 Contraseña de todos los usuarios: Password123!')
  console.log('📧 Correos:')
  console.log('   admin@novatech.mx')
  console.log('   gerente@novatech.mx')
  console.log('   lider@novatech.mx')
  console.log('   empleado1@novatech.mx')
  console.log('   empleado2@novatech.mx')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
