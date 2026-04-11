import { Prisma } from '@prisma/client'
import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

const buildTaskWhere = (projectId?: string): Prisma.TaskWhereInput => (
  projectId
    ? { projectId }
    : {
        project: {
          is: {
            status: 'ACTIVO'
          }
        }
      }
)

export const getPortfolioSummary = async () => {
  const activeProjects = await prisma.project.findMany({
    where: { status: 'ACTIVO' },
    include: {
      leader: {
        select: { id: true, name: true, email: true }
      },
      tasks: {
        select: {
          id: true,
          status: true,
          priority: true,
          deadline: true
        }
      }
    },
    orderBy: { deadline: 'asc' }
  })

  const now = Date.now()
  const portfolioProjects = activeProjects.map((project) => {
    const totalTasks = project.tasks.length
    const completedTasks = project.tasks.filter((task) => task.status === 'COMPLETADA').length
    const overdueTasks = project.tasks.filter(
      (task) => task.status !== 'COMPLETADA' && new Date(task.deadline).getTime() < now
    ).length
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
    const openTasks = totalTasks - completedTasks
    const overdueRate = openTasks <= 0 ? 0 : Math.round((overdueTasks / openTasks) * 100)
    const daysRemaining = Math.ceil((new Date(project.deadline).getTime() - now) / (1000 * 60 * 60 * 24))

    return {
      id: project.id,
      publicCode: project.publicCode,
      name: project.name,
      leader: project.leader,
      deadline: project.deadline,
      progress,
      totalTasks,
      completedTasks,
      openTasks,
      overdueTasks,
      overdueRate,
      daysRemaining,
      highPriorityTasks: project.tasks.filter((task) => task.priority === 'ALTA').length,
      hasDelayAlert: overdueRate > 20
    }
  })

  const atRiskProjects = portfolioProjects.filter((project) => project.hasDelayAlert).length
  const onTrackProjects = portfolioProjects.filter((project) => !project.hasDelayAlert).length
  const averageProgress = portfolioProjects.length === 0
    ? 0
    : Math.round(portfolioProjects.reduce((total, project) => total + project.progress, 0) / portfolioProjects.length)

  return {
    activeProjects: portfolioProjects.length,
    atRiskProjects,
    onTrackProjects,
    averageProgress,
    projects: portfolioProjects
  }
}

export const ensureReportsAccess = async (
  user: NonNullable<AuthRequest['user']>,
  projectId?: string
) => {
  if (!projectId) {
    if (user.role === 'ADMIN' || user.role === 'GERENTE') {
      return
    }

    throw new Error('REPORTS_FORBIDDEN')
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      leaderId: true,
      creatorId: true
    }
  })

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND')
  }

  if (user.role === 'ADMIN' || user.role === 'GERENTE') {
    return
  }

  if (user.role === 'LIDER' && project.leaderId === user.id) {
    return
  }

  throw new Error('REPORTS_FORBIDDEN')
}

export const getGlobalProgress = async (projectId?: string) => {
  const where = buildTaskWhere(projectId)

  const [total, completed] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.count({
      where: {
        ...where,
        status: 'COMPLETADA'
      }
    })
  ])

  return {
    total,
    completed,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100)
  }
}

export const getTasksByStatus = async (projectId?: string) => {
  const results = await prisma.task.groupBy({
    by: ['status'],
    where: buildTaskWhere(projectId),
    _count: {
      status: true
    }
  })

  const labels: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    EN_PROGRESO: 'En Progreso',
    EN_REVISION: 'En Revision',
    COMPLETADA: 'Completada'
  }

  return results.map((result) => ({
    name: labels[result.status] ?? result.status,
    value: result._count.status ?? 0
  }))
}

export const getTasksByPriority = async (projectId?: string) => {
  const results = await prisma.task.groupBy({
    by: ['priority'],
    where: buildTaskWhere(projectId),
    _count: {
      priority: true
    }
  })

  const labels: Record<string, string> = {
    ALTA: 'Alta',
    MEDIA: 'Media',
    BAJA: 'Baja'
  }

  return results.map((result) => ({
    name: labels[result.priority] ?? result.priority,
    value: result._count.priority ?? 0
  }))
}

export const getOverdueTasks = async (projectId?: string) => {
  return prisma.task.findMany({
    where: {
      ...buildTaskWhere(projectId),
      deadline: { lt: new Date() },
      status: { not: 'COMPLETADA' }
    },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } }
    },
    orderBy: { deadline: 'asc' }
  })
}

export const getProductivityByMember = async (projectId?: string) => {
  const results = await prisma.task.groupBy({
    by: ['assigneeId', 'status'],
    where: {
      ...buildTaskWhere(projectId),
      assigneeId: { not: null }
    },
    _count: { status: true }
  })

  const statsByUser = new Map<string, { completed: number; total: number }>()

  results.forEach((result) => {
    const userId = result.assigneeId
    if (!userId) {
      return
    }

    if (!statsByUser.has(userId)) {
      statsByUser.set(userId, { completed: 0, total: 0 })
    }

    const stats = statsByUser.get(userId)!
    stats.total += result._count.status ?? 0

    if (result.status === 'COMPLETADA') {
      stats.completed += result._count.status ?? 0
    }
  })

  const userIds = [...statsByUser.keys()]

  if (userIds.length === 0) {
    return []
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })

  return users.map((user) => {
    const stats = statsByUser.get(user.id) || { completed: 0, total: 0 }

    return {
      name: user.name,
      completed: stats.completed,
      total: stats.total,
      percentage: stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100)
    }
  })
}

export const getFullDashboard = async (projectId?: string) => {
  const [globalProgress, tasksByStatus, tasksByPriority, overdueTasks, productivityByMember, portfolioSummary] = await Promise.all([
    getGlobalProgress(projectId),
    getTasksByStatus(projectId),
    getTasksByPriority(projectId),
    getOverdueTasks(projectId),
    getProductivityByMember(projectId),
    projectId ? Promise.resolve(null) : getPortfolioSummary()
  ])

  return {
    globalProgress,
    tasksByStatus,
    tasksByPriority,
    overdueTasks,
    productivityByMember,
    portfolioSummary
  }
}
