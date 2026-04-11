import { Router, Response } from 'express'
import prisma from '../lib/prisma'
import { verifyToken, checkRole, AuthRequest } from '../middleware/auth'

const router = Router()
const MAX_ACTIVE_PROJECT_MEMBERSHIPS = 5
const PROJECT_AUDIT_ACTION = {
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  STATUS_CHANGED: 'STATUS_CHANGED'
} as const

const buildProjectPublicCode = (value: number) => `PRJ-${String(value).padStart(3, '0')}`

const PROJECT_FIELD_LABELS: Record<string, string> = {
  name: 'nombre',
  description: 'descripcion',
  startDate: 'fecha de inicio',
  deadline: 'fecha limite',
  leaderId: 'lider asignado'
}

const getNextProjectPublicCode = async (
  tx: Pick<typeof prisma, 'project'> = prisma
) => {
  const latestProject = await tx.project.findFirst({
    where: {
      publicCode: {
        not: null
      }
    },
    orderBy: {
      publicCode: 'desc'
    },
    select: {
      publicCode: true
    }
  })

  const latestNumericValue = latestProject?.publicCode
    ? Number(latestProject.publicCode.replace('PRJ-', ''))
    : 0

  return buildProjectPublicCode(Number.isFinite(latestNumericValue) ? latestNumericValue + 1 : 1)
}

const countActiveProjectMemberships = async (
  userId: string,
  options: {
    excludeProjectId?: string
    tx?: Pick<typeof prisma, 'projectMember'>
  } = {}
) => {
  const { excludeProjectId, tx = prisma } = options

  return tx.projectMember.count({
    where: {
      userId,
      project: {
        status: 'ACTIVO',
        ...(excludeProjectId ? { id: { not: excludeProjectId } } : {})
      }
    }
  })
}

const ensureUserCanJoinActiveProject = async (
  userId: string,
  options: {
    excludeProjectId?: string
    tx?: Pick<typeof prisma, 'projectMember'>
  } = {}
) => {
  const activeMemberships = await countActiveProjectMemberships(userId, options)

  if (activeMemberships >= MAX_ACTIVE_PROJECT_MEMBERSHIPS) {
    throw new Error('PROJECT_MEMBERSHIP_LIMIT')
  }
}

const ensureProjectMembersCanBeActive = async (
  projectId: string,
  options: {
    tx?: Pick<typeof prisma, 'projectMember'>
  } = {}
) => {
  const { tx = prisma } = options
  const members = await tx.projectMember.findMany({
    where: { projectId },
    select: { userId: true }
  })

  for (const member of members) {
    await ensureUserCanJoinActiveProject(member.userId, {
      excludeProjectId: projectId,
      tx
    })
  }
}

const buildUpdatedFieldsSummary = (fields: string[]) => {
  if (fields.length === 0) {
    return 'Se actualizo la configuracion del proyecto.'
  }

  if (fields.length === 1) {
    return `Se actualizo ${fields[0]} del proyecto.`
  }

  if (fields.length === 2) {
    return `Se actualizaron ${fields[0]} y ${fields[1]} del proyecto.`
  }

  return `Se actualizaron ${fields.slice(0, -1).join(', ')} y ${fields[fields.length - 1]} del proyecto.`
}

const createProjectAuditLog = async (
  tx: Pick<typeof prisma, 'projectAuditLog'>,
  input: {
    projectId: string
    actorId: string
    action: string
    summary: string
  }
) => tx.projectAuditLog.create({ data: input })

// Todas las rutas requieren token valido
router.use(verifyToken)

// GET /projects - lista proyectos segun el rol
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, leaderId, deadlineFrom, deadlineTo, page, pageSize } = req.query
    const where: Record<string, unknown> = {}
    const hasPagination = page !== undefined || pageSize !== undefined

    if (status) {
      where.status = String(status)
    }

    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { publicCode: { contains: String(search).toUpperCase() } }
      ]
    }

    if (leaderId) {
      where.leaderId = String(leaderId)
    }

    if (deadlineFrom || deadlineTo) {
      where.deadline = {
        ...(deadlineFrom ? { gte: new Date(String(deadlineFrom)) } : {}),
        ...(deadlineTo ? { lte: new Date(String(deadlineTo)) } : {})
      }
    }

    if (req.user!.role === 'EMPLEADO' || req.user!.role === 'LIDER') {
      where.members = { some: { userId: req.user!.id } }
    }

    const include = {
      leader: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, role: true } }
        }
      },
      tasks: { select: { id: true, status: true } }
    } as const

    if (hasPagination) {
      const normalizedPage = Math.max(1, Number(page) || 1)
      const normalizedPageSize = Math.min(50, Math.max(1, Number(pageSize) || 10))

      const [totalItems, projects] = await prisma.$transaction([
        prisma.project.count({ where }),
        prisma.project.findMany({
          where,
          include,
          orderBy: { createdAt: 'desc' },
          skip: (normalizedPage - 1) * normalizedPageSize,
          take: normalizedPageSize
        })
      ])

      const totalPages = Math.max(1, Math.ceil(totalItems / normalizedPageSize))

      return res.status(200).json({
        items: projects.map((project) => {
          const total = project.tasks.length
          const completed = project.tasks.filter((task) => task.status === 'COMPLETADA').length
          const progress = total > 0 ? Math.round((completed / total) * 100) : 0

          return { ...project, progress, totalTasks: total, completedTasks: completed }
        }),
        pagination: {
          page: normalizedPage,
          pageSize: normalizedPageSize,
          totalItems,
          totalPages
        }
      })
    }

    const projects = await prisma.project.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' }
    })

    const projectsWithProgress = projects.map((project) => {
      const total = project.tasks.length
      const completed = project.tasks.filter((task) => task.status === 'COMPLETADA').length
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0

      return { ...project, progress, totalTasks: total, completedTasks: completed }
    })

    return res.status(200).json(projectsWithProgress)
  } catch (error) {
    console.error('Error GET /projects:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// GET /projects/:id - detalle de un proyecto
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const projectId = String(req.params.id)

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        leader: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, role: true } }
          }
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true } },
            comments: { select: { id: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        auditLogs: {
          include: {
            actor: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' })
    }

    const isMember = project.members.some((member) => member.userId === req.user!.id)
    const isGerente = req.user!.role === 'GERENTE' || req.user!.role === 'ADMIN'

    if (!isMember && !isGerente) {
      return res.status(403).json({ error: 'No tienes acceso a este proyecto' })
    }

    const total = project.tasks.length
    const completed = project.tasks.filter((task) => task.status === 'COMPLETADA').length
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0

    return res.status(200).json({
      ...project,
      progress,
      totalTasks: total,
      completedTasks: completed
    })
  } catch (error) {
    console.error('Error GET /projects/:id:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /projects - crear proyecto
router.post('/', checkRole('GERENTE', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { name, description, startDate, deadline, leaderId } = req.body

  if (!name || !startDate || !deadline || !leaderId) {
    return res.status(400).json({ error: 'Nombre, fechas y lider son requeridos' })
  }

  if (new Date(deadline) <= new Date(startDate)) {
    return res.status(400).json({ error: 'La fecha limite debe ser posterior a la fecha de inicio' })
  }

  try {
    const leader = await prisma.user.findUnique({ where: { id: leaderId } })
    if (!leader || leader.role !== 'LIDER') {
      return res.status(400).json({ error: 'El lider asignado debe tener rol LIDER' })
    }

    await ensureUserCanJoinActiveProject(leaderId)

    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          publicCode: await getNextProjectPublicCode(tx),
          name,
          description,
          startDate: new Date(startDate),
          deadline: new Date(deadline),
          creatorId: req.user!.id,
          leaderId
        }
      })

      await tx.projectMember.create({
        data: { projectId: newProject.id, userId: leaderId }
      })

      await createProjectAuditLog(tx, {
        projectId: newProject.id,
        actorId: req.user!.id,
        action: PROJECT_AUDIT_ACTION.CREATED,
        summary: `Proyecto creado y asignado a ${leader.name} como lider.`
      })

      await tx.notification.create({
        data: {
          userId: leaderId,
          title: 'Nuevo proyecto asignado',
          message: `Se te asigno el proyecto ${newProject.name} para coordinacion operativa.`,
          link: `/projects/${newProject.id}`
        }
      })

      return newProject
    })

    return res.status(201).json(project)
  } catch (error) {
    if (error instanceof Error && error.message === 'PROJECT_MEMBERSHIP_LIMIT') {
      return res.status(400).json({
        error: 'Un usuario no puede ser miembro de mas de 5 proyectos activos simultaneamente'
      })
    }

    console.error('Error POST /projects:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PUT /projects/:id - editar proyecto
router.put('/:id', checkRole('GERENTE', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { name, description, startDate, deadline, leaderId } = req.body

  try {
    const projectId = String(req.params.id)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { select: { userId: true } },
        tasks: { select: { id: true, deadline: true } }
      }
    })
    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' })
    }

    const nextStartDate = startDate ? new Date(startDate) : project.startDate
    const nextDeadline = deadline ? new Date(deadline) : project.deadline

    if (nextDeadline <= nextStartDate) {
      return res.status(400).json({ error: 'La fecha limite debe ser posterior al inicio' })
    }

    const tasksOutOfRange = project.tasks.filter((task) => new Date(task.deadline) > nextDeadline)
    if (tasksOutOfRange.length > 0) {
      return res.status(400).json({
        error: 'La fecha limite del proyecto no puede ser anterior a la fecha limite de sus tareas'
      })
    }

    let nextLeaderId = project.leaderId
    if (leaderId) {
      const leader = await prisma.user.findUnique({ where: { id: leaderId } })
      if (!leader || leader.role !== 'LIDER') {
        return res.status(400).json({ error: 'El lider asignado debe tener rol LIDER' })
      }
      nextLeaderId = leaderId
    }

    const changedFields = Object.entries({
      name: name !== undefined && name !== project.name,
      description: description !== undefined && description !== project.description,
      startDate: startDate !== undefined && nextStartDate.getTime() !== new Date(project.startDate).getTime(),
      deadline: deadline !== undefined && nextDeadline.getTime() !== new Date(project.deadline).getTime(),
      leaderId: leaderId !== undefined && nextLeaderId !== project.leaderId
    })
      .filter(([, changed]) => changed)
      .map(([field]) => PROJECT_FIELD_LABELS[field])

    const leaderAlreadyMember = project.members.some((member) => member.userId === nextLeaderId)
    if (project.status === 'ACTIVO' && nextLeaderId !== project.leaderId && !leaderAlreadyMember) {
      await ensureUserCanJoinActiveProject(nextLeaderId)
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(startDate && { startDate: nextStartDate }),
          ...(deadline && { deadline: nextDeadline }),
          ...(leaderId && { leaderId })
        }
      })

      if (leaderId && !leaderAlreadyMember) {
        await tx.projectMember.create({
          data: {
            projectId,
            userId: leaderId
          }
        })
      }

      if (changedFields.length > 0) {
        await createProjectAuditLog(tx, {
          projectId,
          actorId: req.user!.id,
          action: PROJECT_AUDIT_ACTION.UPDATED,
          summary: buildUpdatedFieldsSummary(changedFields)
        })
      }

      return updatedProject
    })

    return res.status(200).json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'PROJECT_MEMBERSHIP_LIMIT') {
      return res.status(400).json({
        error: 'Un usuario no puede ser miembro de mas de 5 proyectos activos simultaneamente'
      })
    }

    console.error('Error PUT /projects/:id:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// PATCH /projects/:id/status - cambiar estado
router.patch('/:id/status', checkRole('GERENTE', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { status } = req.body
  const validStatuses = ['ACTIVO', 'PAUSADO', 'CERRADO']

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Estado invalido. Debe ser: ${validStatuses.join(', ')}` })
  }

  try {
    const projectId = String(req.params.id)

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { tasks: { select: { id: true, status: true } } }
    })

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' })
    }

    if (status === 'ACTIVO' && project.status !== 'ACTIVO') {
      await ensureProjectMembersCanBeActive(projectId)
    }

    if (status === 'CERRADO') {
      const activeTasks = project.tasks.filter(
        (task) => task.status === 'EN_PROGRESO' || task.status === 'EN_REVISION'
      )

      if (activeTasks.length > 0) {
        return res.status(400).json({
          error: `No se puede cerrar el proyecto. Hay ${activeTasks.length} tarea(s) en progreso o en revision.`
        })
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (status === 'CERRADO') {
        const pendingTaskIds = project.tasks
          .filter((task) => task.status === 'PENDIENTE')
          .map((task) => task.id)

        if (pendingTaskIds.length > 0) {
          await tx.task.updateMany({
            where: {
              id: {
                in: pendingTaskIds
              }
            },
            data: {
              status: 'COMPLETADA',
              completedAt: new Date()
            }
          })
        }
      }

      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: { status }
      })

      if (status !== project.status) {
        await createProjectAuditLog(tx, {
          projectId,
          actorId: req.user!.id,
          action: PROJECT_AUDIT_ACTION.STATUS_CHANGED,
          summary: status === 'CERRADO'
            ? `El estado del proyecto cambio de ${project.status} a ${status} y se archivaron las tareas pendientes.`
            : `El estado del proyecto cambio de ${project.status} a ${status}.`
        })
      }

      return updatedProject
    })

    return res.status(200).json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'PROJECT_MEMBERSHIP_LIMIT') {
      return res.status(400).json({
        error: 'No se puede activar el proyecto porque uno de sus miembros ya pertenece a 5 proyectos activos'
      })
    }

    console.error('Error PATCH /projects/:id/status:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

export default router
