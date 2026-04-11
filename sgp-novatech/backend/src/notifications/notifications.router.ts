import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import * as NotificationsController from './notifications.controller'

const router = Router()

router.use(verifyToken)

router.get('/notifications', NotificationsController.getMyNotifications)
router.patch('/notifications/:id/read', NotificationsController.markAsRead)

export default router
