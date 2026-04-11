import { Response } from 'express'
import { TaskStatus } from '@prisma/client'
import * as TasksService from './tasks.service'
import { AuthRequest } from '../middleware/auth'

const handleTaskError = (error: unknown, res: Response) => {
  if (!(error instanceof Error)) {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }

  const errorMap: Record<string, { status: number; error: string }> = {
    PROJECT_NOT_FOUND: { status: 404, error: 'Proyecto no encontrado' },
    PROJECT_FORBIDDEN: { status: 403, error: 'No tienes acceso a este proyecto' },
    TASK_NOT_FOUND: { status: 404, error: 'Tarea no encontrada' },
    COMMENT_NOT_FOUND: { status: 404, error: 'Comentario no encontrado' },
    TASK_FORBIDDEN: { status: 403, error: 'No tienes permisos para realizar esta accion' },
    COMMENT_FORBIDDEN: { status: 403, error: 'Solo puedes modificar tus propios comentarios' },
    PRIORITY_INVALID: { status: 400, error: 'Prioridad invalida' },
    STATUS_INVALID: { status: 400, error: 'Estado invalido' },
    ASSIGNEE_INVALID: { status: 400, error: 'El responsable debe ser miembro activo del proyecto' },
    PROJECT_NOT_ACTIVE: {
      status: 400,
      error: 'Solo se pueden crear o editar tareas en proyectos activos'
    },
    TASK_DEADLINE_EXCEEDS_PROJECT: {
      status: 400,
      error: 'La fecha limite de la tarea no puede ser posterior a la fecha limite del proyecto'
    },
    REORDER_INVALID: { status: 400, error: 'El reordenamiento solicitado no es valido' }
  }

  const mapped = errorMap[error.message]
  if (mapped) {
    return res.status(mapped.status).json({ error: mapped.error })
  }

  return res.status(500).json({ error: 'Error interno del servidor' })
}

export const getTasksByProject = async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await TasksService.getAllTasksByProject(String(req.params.projectId), req.user!)
    return res.status(200).json(tasks)
  } catch (error) {
    return handleTaskError(error, res)
  }
}

export const getMyTasks = async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await TasksService.getMyUpcomingTasks(req.user!)
    return res.status(200).json(tasks)
  } catch (error) {
    return handleTaskError(error, res)
  }
}

export const getMyTasksList = async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await TasksService.getMyTasksList(req.user!, {
      search: req.query.search ? String(req.query.search).trim() : undefined,
      status: req.query.status ? String(req.query.status).toUpperCase() : undefined,
      priority: req.query.priority ? String(req.query.priority).toUpperCase() : undefined,
      projectId: req.query.projectId ? String(req.query.projectId) : undefined,
      assigneeId: req.query.assigneeId ? String(req.query.assigneeId) : undefined,
      dueRange: req.query.dueRange ? String(req.query.dueRange).toUpperCase() : undefined
    })
    return res.status(200).json(tasks)
  } catch (error) {
    return handleTaskError(error, res)
  }
}

export const createTask = async (req: AuthRequest, res: Response) => {
  const { title, description, labels, priority, deadline, assigneeId } = req.body

  if (!title) {
    return res.status(400).json({ error: 'El titulo es requerido' })
  }

  try {
    const task = await TasksService.createTask({
      title,
      description,
      labels,
      priority,
      deadline,
      projectId: String(req.params.projectId),
      assigneeId
    }, req.user!)

    return res.status(201).json(task)
  } catch (error) {
    return handleTaskError(error, res)
  }
}

export const getTaskComments = async (req: AuthRequest, res: Response) => {
  try {
    const comments = await TasksService.getTaskComments(String(req.params.taskId), req.user!)
    return res.status(200).json(comments)
  } catch (error) {
    return handleTaskError(error, res)
  }
}

export const createTaskComment = async (req: AuthRequest, res: Response) => {
  const content = String(req.body?.content || '').trim()

  if (!content) {
    return res.status(400).json({ error: 'El comentario no puede estar vacio' })
  }

  if (content.length > 500) {
    return res.status(400).json({ error: 'El comentario no puede exceder 500 caracteres' })
  }

  try {
    const comment = await TasksService.createTaskComment(
      String(req.params.taskId),
      { content },
      req.user!
    )

    return res.status(201).json(comment)
  } catch (error) {
    return handleTaskError(error, res)
  }
}

export const updateTaskComment = async (req: AuthRequest, res: Response) => {
  const content = String(req.body?.content || '').trim()

  if (!content) {
    return res.status(400).json({ error: 'El comentario no puede estar vacio' })
  }

  if (content.length > 500) {
    return res.status(400).json({ error: 'El comentario no puede exceder 500 caracteres' })
  }

  try {
    const comment = await TasksService.updateTaskComment(
      String(req.params.commentId),
      { content },
      req.user!
    )

    return res.status(200).json(comment)
  } catch (error) {
    return handleTaskError(error, res)
  }
}

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await TasksService.updateTask(String(req.params.taskId), req.body, req.user!)
    return res.status(200).json(task)
  } catch (error) {
    return handleTaskError(error, res)
  }
}

export const patchTaskStatus = async (req: AuthRequest, res: Response) => {
  const { status } = req.body

  if (!status) {
    return res.status(400).json({ error: 'El estado es requerido' })
  }

  try {
    const task = await TasksService.updateTaskStatus(
      String(req.params.taskId),
      String(status).toUpperCase() as TaskStatus,
      req.user!
    )
    return res.status(200).json(task)
  } catch (error) {
    return handleTaskError(error, res)
  }
}

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    await TasksService.deleteTask(String(req.params.taskId), req.user!)
    return res.status(204).send()
  } catch (error) {
    return handleTaskError(error, res)
  }
}

export const deleteTaskComment = async (req: AuthRequest, res: Response) => {
  try {
    await TasksService.deleteTaskComment(String(req.params.commentId), req.user!)
    return res.status(204).send()
  } catch (error) {
    return handleTaskError(error, res)
  }
}

export const reorderProjectTasks = async (req: AuthRequest, res: Response) => {
  const columns = Array.isArray(req.body?.columns) ? req.body.columns : []

  try {
    const tasks = await TasksService.reorderProjectTasks(
      String(req.params.projectId),
      columns,
      req.user!
    )

    return res.status(200).json(tasks)
  } catch (error) {
    return handleTaskError(error, res)
  }
}
