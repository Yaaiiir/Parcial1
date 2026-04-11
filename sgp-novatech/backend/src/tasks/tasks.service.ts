import { Priority, Prisma, TaskStatus } from '@prisma/client'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

type CreateTaskInput = {
  title: string
  description?: string
  labels?: string
  priority?: string
  deadline?: string
  projectId: string
  assigneeId?: string
}

type UpdateTaskInput = Partial<{
  title: string
  description: string
  labels: string
  status: TaskStatus
  priority: string
  deadline: string
  assigneeId: string | null
}>

type CreateCommentInput = {
  content: string
}

type UpdateCommentInput = {
  content: string
}

type ReorderColumnInput = {
  status: TaskStatus
  taskIds: string[]
}

type MyTasksFilters = {
  search?: string
  status?: string
  priority?: string
  projectId?: string
  assigneeId?: string
  dueRange?: string
}

const validPriorities = new Set(Object.values(Priority))
const movableStatuses = new Set(Object.values(TaskStatus))
const validDueRanges = new Set(['HOY', 'ESTA_SEMANA', 'VENCIDAS', 'TODAS'])

const buildTaskPublicCode = (projectPublicCode: string, value: number) =>
  `TSK-${projectPublicCode.replace('PRJ-', '')}-${String(value).padStart(3, '0')}`

const getNextTaskPublicCode = async (projectId: string, projectPublicCode?: string | null) => {
  const resolvedProjectPublicCode = projectPublicCode || (await prisma.project.findUnique({
    where: { id: projectId },
    select: { publicCode: true }
  }))?.publicCode

  if (!resolvedProjectPublicCode) {
    throw new Error('PROJECT_CODE_MISSING')
  }

  const prefix = `TSK-${resolvedProjectPublicCode.replace('PRJ-', '')}-`
  const latestTask = await prisma.task.findFirst({
    where: {
      projectId,
      publicCode: {
        startsWith: prefix
      }
    },
    orderBy: {
      publicCode: 'desc'
    },
    select: {
      publicCode: true
    }
  })

  const latestNumericValue = latestTask?.publicCode
    ? Number(latestTask.publicCode.slice(prefix.length))
    : 0

  return buildTaskPublicCode(
    resolvedProjectPublicCode,
    Number.isFinite(latestNumericValue) ? latestNumericValue + 1 : 1
  )
}

const getProjectWithAccess = async (projectId: string, user: NonNullable<AuthRequest['user']>) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: { select: { userId: true } }
    }
  })

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND')
  }

  const isMember = project.members.some((member) => member.userId === user.id)
  const isManager = user.role === 'GERENTE' || user.role === 'ADMIN'
  const isLeader = project.leaderId === user.id

  if (!isMember && !isManager && !isLeader) {
    throw new Error('PROJECT_FORBIDDEN')
  }

  return project
}

const getTaskWithAccess = async (taskId: string, user: NonNullable<AuthRequest['user']>) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          members: { select: { userId: true } }
        }
      }
    }
  })

  if (!task) {
    throw new Error('TASK_NOT_FOUND')
  }

  const isMember = task.project.members.some((member) => member.userId === user.id)
  const isManager = user.role === 'GERENTE' || user.role === 'ADMIN'
  const isLeader = task.project.leaderId === user.id
  const isAssignee = task.assigneeId === user.id

  if (!isMember && !isManager && !isLeader && !isAssignee) {
    throw new Error('TASK_FORBIDDEN')
  }

  return task
}

const validateAssignee = async (projectId: string, assigneeId?: string | null) => {
  if (!assigneeId) {
    return null
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: assigneeId
      }
    },
    include: {
      user: true
    }
  })

  if (!membership || !membership.user.isActive) {
    throw new Error('ASSIGNEE_INVALID')
  }

  return membership.user.id
}

const validateTaskDeadlineWithinProject = (
  projectDeadline: Date,
  taskDeadline?: string | Date | null
) => {
  if (!taskDeadline) {
    return
  }

  if (new Date(taskDeadline) > new Date(projectDeadline)) {
    throw new Error('TASK_DEADLINE_EXCEEDS_PROJECT')
  }
}

const ensureProjectIsActive = (status: string) => {
  if (status !== 'ACTIVO') {
    throw new Error('PROJECT_NOT_ACTIVE')
  }
}

const normalizeLabels = (labels?: string | null) => {
  const raw = String(labels || '').trim()
  if (!raw) {
    return null
  }

  const normalized = raw
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, 8)

  return normalized.length > 0 ? normalized.join(', ') : null
}

export const getAllTasksByProject = async (projectId: string, user: NonNullable<AuthRequest['user']>) => {
  await getProjectWithAccess(projectId, user)

  return prisma.task.findMany({
    where: { projectId },
    include: {
      _count: {
        select: {
          comments: true
        }
      },
      assignee: {
        select: { id: true, name: true, email: true, role: true }
      }
    },
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'asc' }
    ]
  })
}

export const getTaskComments = async (taskId: string, user: NonNullable<AuthRequest['user']>) => {
  await getTaskWithAccess(taskId, user)

  return prisma.comment.findMany({
    where: { taskId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })
}

export const getMyUpcomingTasks = async (user: NonNullable<AuthRequest['user']>) => {
  const baseWhere = buildMyTasksWhere(user, {
    status: undefined
  })
  baseWhere.status = {
    in: ['PENDIENTE', 'EN_PROGRESO', 'EN_REVISION']
  }

  return prisma.task.findMany({
    where: baseWhere,
    include: {
      _count: {
        select: {
          comments: true
        }
      },
      project: {
        select: {
          id: true,
          publicCode: true,
          name: true,
          status: true
        }
      },
      assignee: {
        select: { id: true, name: true, email: true, role: true }
      }
    },
    orderBy: [
      { deadline: 'asc' },
      { priority: 'desc' }
    ],
    take: 6
  })
}

const buildMyTasksWhere = (
  user: NonNullable<AuthRequest['user']>,
  filters: MyTasksFilters = {}
): Prisma.TaskWhereInput => {
  const andConditions: Prisma.TaskWhereInput[] = []

  if (user.role === 'EMPLEADO') {
    andConditions.push({ assigneeId: user.id })
  } else if (user.role === 'LIDER') {
    andConditions.push({
      OR: [
        { assigneeId: user.id },
        { project: { leaderId: user.id } }
      ]
    })
  } else if (user.role === 'GERENTE') {
    andConditions.push({
      OR: [
        { assigneeId: user.id },
        { project: { creatorId: user.id } }
      ]
    })
  }

  if (filters.search) {
    andConditions.push({
      OR: [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
        { labels: { contains: filters.search } },
        { publicCode: { contains: filters.search } }
      ]
    })
  }

  if (filters.status && movableStatuses.has(filters.status as TaskStatus)) {
    andConditions.push({ status: filters.status as TaskStatus })
  }

  if (filters.priority && validPriorities.has(filters.priority as Priority)) {
    andConditions.push({ priority: filters.priority as Priority })
  }

  if (filters.projectId) {
    andConditions.push({ projectId: filters.projectId })
  }

  if (filters.assigneeId) {
    andConditions.push({ assigneeId: filters.assigneeId })
  }

  const dueRange = String(filters.dueRange || '').toUpperCase()
  if (dueRange && validDueRanges.has(dueRange)) {
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const endOfToday = new Date(startOfToday)
    endOfToday.setDate(endOfToday.getDate() + 1)

    const endOfWeek = new Date(startOfToday)
    const daysUntilSunday = (7 - endOfWeek.getDay()) % 7
    endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday + 1)

    if (dueRange === 'HOY') {
      andConditions.push({
        deadline: {
          gte: startOfToday,
          lt: endOfToday
        }
      })
    }

    if (dueRange === 'ESTA_SEMANA') {
      andConditions.push({
        deadline: {
          gte: startOfToday,
          lt: endOfWeek
        }
      })
    }

    if (dueRange === 'VENCIDAS') {
      andConditions.push({
        status: {
          not: TaskStatus.COMPLETADA
        },
        deadline: {
          lt: now
        }
      })
    }
  }

  if (andConditions.length === 0) {
    return {}
  }

  return { AND: andConditions }
}

export const getMyTasksList = async (
  user: NonNullable<AuthRequest['user']>,
  filters: MyTasksFilters = {}
) => {
  const where = buildMyTasksWhere(user, filters)

  return prisma.task.findMany({
    where,
    include: {
      _count: {
        select: {
          comments: true
        }
      },
      project: {
        select: {
          id: true,
          publicCode: true,
          name: true,
          status: true
        }
      },
      assignee: {
        select: { id: true, name: true, email: true, role: true }
      }
    },
    orderBy: [
      { deadline: 'asc' },
      { createdAt: 'desc' }
    ]
  })
}

export const createTask = async (data: CreateTaskInput, user: NonNullable<AuthRequest['user']>) => {
  const project = await getProjectWithAccess(data.projectId, user)
  ensureProjectIsActive(project.status)

  if (!['GERENTE', 'ADMIN', 'LIDER'].includes(user.role)) {
    throw new Error('TASK_FORBIDDEN')
  }

  const assigneeId = await validateAssignee(project.id, data.assigneeId)
  const priority = data.priority ? String(data.priority).toUpperCase() : Priority.MEDIA

  if (!validPriorities.has(priority as Priority)) {
    throw new Error('PRIORITY_INVALID')
  }

  const deadline = data.deadline
    ? new Date(data.deadline)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  validateTaskDeadlineWithinProject(project.deadline, deadline)

  const createData: Prisma.TaskCreateInput = {
    publicCode: await getNextTaskPublicCode(project.id, project.publicCode),
    title: data.title,
    description: data.description,
    labels: normalizeLabels(data.labels),
    priority: priority as Priority,
    deadline,
    sortOrder: await prisma.task.count({
      where: {
        projectId: project.id,
        status: TaskStatus.PENDIENTE
      }
    }),
    project: {
      connect: { id: project.id }
    }
  }

  if (assigneeId) {
    createData.assignee = {
      connect: { id: assigneeId }
    }
  }

  return prisma.task.create({
    data: createData,
    include: {
      _count: {
        select: {
          comments: true
        }
      },
      assignee: {
        select: { id: true, name: true, email: true, role: true }
      }
    }
  }).then(async (task) => {
    if (task.assignee?.id && task.assignee.id !== user.id) {
      await prisma.notification.create({
        data: {
          userId: task.assignee.id,
          title: 'Nueva tarea asignada',
          message: `Se te asigno la tarea ${task.title}.`,
          link: `/projects/${project.id}`
        }
      })
    }

    return task
  })
}

export const updateTask = async (
  taskId: string,
  data: UpdateTaskInput,
  user: NonNullable<AuthRequest['user']>
) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: { members: { select: { userId: true } } }
      }
    }
  })

  if (!task) {
    throw new Error('TASK_NOT_FOUND')
  }

  const isManager = user.role === 'GERENTE' || user.role === 'ADMIN'
  const isLeader = task.project.leaderId === user.id
  if (!isManager && !isLeader) {
    throw new Error('TASK_FORBIDDEN')
  }

  ensureProjectIsActive(task.project.status)

  const assigneeId = data.assigneeId === undefined
    ? undefined
    : await validateAssignee(task.projectId, data.assigneeId)

  let priority: Priority | undefined
  if (data.priority) {
    const normalizedPriority = String(data.priority).toUpperCase()
    if (!validPriorities.has(normalizedPriority as Priority)) {
      throw new Error('PRIORITY_INVALID')
    }
    priority = normalizedPriority as Priority
  }

  let status: TaskStatus | undefined
  if (data.status) {
    const normalizedStatus = String(data.status).toUpperCase() as TaskStatus
    if (!movableStatuses.has(normalizedStatus)) {
      throw new Error('STATUS_INVALID')
    }
    status = normalizedStatus
  }

  if (data.deadline !== undefined) {
    validateTaskDeadlineWithinProject(task.project.deadline, data.deadline)
  }

  const updateData = {
    ...(data.title !== undefined && { title: data.title }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.labels !== undefined && { labels: normalizeLabels(data.labels) }),
    ...(priority && { priority }),
    ...(status && {
      status,
      completedAt: status === 'COMPLETADA' ? new Date() : null
    }),
    ...(data.deadline !== undefined && { deadline: new Date(data.deadline) }),
    ...(data.assigneeId !== undefined && {
      assignee: assigneeId
        ? { connect: { id: assigneeId } }
        : { disconnect: true }
    })
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      _count: {
        select: {
          comments: true
        }
      },
      assignee: {
        select: { id: true, name: true, email: true, role: true }
      }
    }
  })

  if (updatedTask.assignee?.id && updatedTask.assignee.id !== user.id && updatedTask.assignee.id !== task.assigneeId) {
    await prisma.notification.create({
      data: {
        userId: updatedTask.assignee.id,
        title: 'Tarea asignada o reasignada',
        message: `Ahora eres responsable de la tarea ${updatedTask.title}.`,
        link: `/projects/${task.projectId}`
      }
    })
  }

  return updatedTask
}

export const updateTaskStatus = async (
  taskId: string,
  status: TaskStatus,
  user: NonNullable<AuthRequest['user']>
) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: { members: { select: { userId: true } } }
      }
    }
  })

  if (!task) {
    throw new Error('TASK_NOT_FOUND')
  }

  if (!movableStatuses.has(status)) {
    throw new Error('STATUS_INVALID')
  }

  const isManager = user.role === 'GERENTE' || user.role === 'ADMIN'
  const isLeader = task.project.leaderId === user.id
  const isAssignee = task.assigneeId === user.id

  if (!isManager && !isLeader && !isAssignee) {
    throw new Error('TASK_FORBIDDEN')
  }

  ensureProjectIsActive(task.project.status)

  return prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === 'COMPLETADA' ? new Date() : null
    },
    include: {
      _count: {
        select: {
          comments: true
        }
      },
      assignee: {
        select: { id: true, name: true, email: true, role: true }
      }
    }
  })
}

export const deleteTask = async (taskId: string, user: NonNullable<AuthRequest['user']>) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true }
  })

  if (!task) {
    throw new Error('TASK_NOT_FOUND')
  }

  const isManager = user.role === 'GERENTE' || user.role === 'ADMIN'
  const isLeader = task.project.leaderId === user.id
  if (!isManager && !isLeader) {
    throw new Error('TASK_FORBIDDEN')
  }

  return prisma.task.delete({ where: { id: taskId } })
}

export const createTaskComment = async (
  taskId: string,
  data: CreateCommentInput,
  user: NonNullable<AuthRequest['user']>
) => {
  const task = await getTaskWithAccess(taskId, user)

  return prisma.comment.create({
    data: {
      content: data.content,
      task: { connect: { id: task.id } },
      author: { connect: { id: user.id } }
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  })
}

export const updateTaskComment = async (
  commentId: string,
  data: UpdateCommentInput,
  user: NonNullable<AuthRequest['user']>
) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      task: {
        include: {
          project: {
            include: {
              members: { select: { userId: true } }
            }
          }
        }
      }
    }
  })

  if (!comment) {
    throw new Error('COMMENT_NOT_FOUND')
  }

  const isMember = comment.task.project.members.some((member) => member.userId === user.id)
  const isManager = user.role === 'GERENTE' || user.role === 'ADMIN'
  const isLeader = comment.task.project.leaderId === user.id
  const isAssignee = comment.task.assigneeId === user.id

  if (!isMember && !isManager && !isLeader && !isAssignee) {
    throw new Error('TASK_FORBIDDEN')
  }

  if (comment.authorId !== user.id) {
    throw new Error('COMMENT_FORBIDDEN')
  }

  if (comment.deletedAt) {
    throw new Error('COMMENT_FORBIDDEN')
  }

  return prisma.comment.update({
    where: { id: commentId },
    data: {
      content: data.content
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  })
}

export const deleteTaskComment = async (
  commentId: string,
  user: NonNullable<AuthRequest['user']>
) => {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      task: {
        include: {
          project: {
            include: {
              members: { select: { userId: true } }
            }
          }
        }
      }
    }
  })

  if (!comment) {
    throw new Error('COMMENT_NOT_FOUND')
  }

  const isMember = comment.task.project.members.some((member) => member.userId === user.id)
  const isManager = user.role === 'GERENTE' || user.role === 'ADMIN'
  const isLeader = comment.task.project.leaderId === user.id
  const isAssignee = comment.task.assigneeId === user.id

  if (!isMember && !isManager && !isLeader && !isAssignee) {
    throw new Error('TASK_FORBIDDEN')
  }

  if (comment.authorId !== user.id) {
    throw new Error('COMMENT_FORBIDDEN')
  }

  return prisma.comment.update({
    where: { id: commentId },
    data: {
      content: 'Comentario eliminado por el autor.',
      deletedAt: new Date()
    }
  })
}

export const reorderProjectTasks = async (
  projectId: string,
  columns: ReorderColumnInput[],
  user: NonNullable<AuthRequest['user']>
) => {
  await getProjectWithAccess(projectId, user)

  const normalizedColumns = columns.map((column) => ({
    status: String(column.status).toUpperCase() as TaskStatus,
    taskIds: Array.isArray(column.taskIds) ? column.taskIds : []
  }))

  if (
    normalizedColumns.length === 0 ||
    normalizedColumns.some((column) => !movableStatuses.has(column.status))
  ) {
    throw new Error('REORDER_INVALID')
  }

  const taskIds = normalizedColumns.flatMap((column) => column.taskIds)
  const uniqueTaskIds = new Set(taskIds)

  if (taskIds.length === 0 || uniqueTaskIds.size !== taskIds.length) {
    throw new Error('REORDER_INVALID')
  }

  const projectTasks = await prisma.task.findMany({
    where: { projectId },
    select: { id: true }
  })

  const projectTaskIds = new Set(projectTasks.map((task) => task.id))

  if (
    projectTaskIds.size !== uniqueTaskIds.size ||
    [...uniqueTaskIds].some((taskId) => !projectTaskIds.has(taskId))
  ) {
    throw new Error('REORDER_INVALID')
  }

  await prisma.$transaction(
    normalizedColumns.flatMap((column) =>
      column.taskIds.map((taskId, index) =>
        prisma.task.update({
          where: { id: taskId },
          data: {
            status: column.status,
            sortOrder: index,
            completedAt: column.status === 'COMPLETADA' ? new Date() : null
          }
        })
      )
    )
  )

  return getAllTasksByProject(projectId, user)
}
