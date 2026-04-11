import { Response } from 'express'
import * as ReportsService from './reports.service'
import { AuthRequest } from '../middleware/auth'

const handleReportsError = (error: unknown, res: Response) => {
  if (error instanceof Error && error.message === 'PROJECT_NOT_FOUND') {
    return res.status(404).json({ error: 'Proyecto no encontrado' })
  }

  if (error instanceof Error && error.message === 'REPORTS_FORBIDDEN') {
    return res.status(403).json({ error: 'No tienes permisos para ver este reporte' })
  }

  return res.status(500).json({ error: 'Error interno del servidor' })
}

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.query.projectId ? String(req.query.projectId) : undefined
    await ReportsService.ensureReportsAccess(req.user!, projectId)

    const data = await ReportsService.getFullDashboard(projectId)
    return res.status(200).json(data)
  } catch (error) {
    console.error('Error GET /reports/dashboard:', error)
    return handleReportsError(error, res)
  }
}

export const getOverdueTasks = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.query.projectId ? String(req.query.projectId) : undefined
    await ReportsService.ensureReportsAccess(req.user!, projectId)

    const tasks = await ReportsService.getOverdueTasks(projectId)
    return res.status(200).json(tasks)
  } catch (error) {
    console.error('Error GET /reports/overdue:', error)
    return handleReportsError(error, res)
  }
}
