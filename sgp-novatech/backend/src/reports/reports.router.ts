import { Router } from 'express'
import * as ReportsController from './reports.controller'
import { checkRole, verifyToken } from '../middleware/auth'

const router = Router()

router.use(verifyToken)

router.get(
  '/reports/dashboard',
  checkRole('ADMIN', 'GERENTE', 'LIDER'),
  ReportsController.getDashboard
)

router.get(
  '/reports/overdue',
  checkRole('ADMIN', 'GERENTE', 'LIDER'),
  ReportsController.getOverdueTasks
)

export default router
