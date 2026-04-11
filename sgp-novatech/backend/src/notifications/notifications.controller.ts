import { Response } from 'express'
import * as NotificationsService from './notifications.service'
import { AuthRequest } from '../middleware/auth'

const handleNotificationError = (error: unknown, res: Response) => {
  if (error instanceof Error && error.message === 'NOTIFICATION_NOT_FOUND') {
    return res.status(404).json({ error: 'Notificacion no encontrada' })
  }

  if (error instanceof Error && error.message === 'NOTIFICATION_FORBIDDEN') {
    return res.status(403).json({ error: 'No tienes permisos para modificar esta notificacion' })
  }

  return res.status(500).json({ error: 'Error interno del servidor' })
}

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await NotificationsService.getMyNotifications(req.user!)
    return res.status(200).json(notifications)
  } catch (error) {
    return handleNotificationError(error, res)
  }
}

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const notification = await NotificationsService.markNotificationAsRead(String(req.params.id), req.user!)
    return res.status(200).json(notification)
  } catch (error) {
    return handleNotificationError(error, res)
  }
}
