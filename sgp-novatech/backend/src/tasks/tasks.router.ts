import { Router } from 'express'
import * as TasksController from './tasks.controller'
import { checkRole, verifyToken } from '../middleware/auth'

const router = Router()

router.use(verifyToken)

router.get('/tasks', TasksController.getMyTasksList)

router.get('/tasks/my', TasksController.getMyTasks)

router.get('/projects/:projectId/tasks', TasksController.getTasksByProject)

router.get('/tasks/:taskId/comments', TasksController.getTaskComments)

router.post('/tasks/:taskId/comments', TasksController.createTaskComment)

router.put('/tasks/comments/:commentId', TasksController.updateTaskComment)

router.delete('/tasks/comments/:commentId', TasksController.deleteTaskComment)

router.post(
  '/projects/:projectId/tasks',
  checkRole('ADMIN', 'GERENTE', 'LIDER'),
  TasksController.createTask
)

router.patch('/projects/:projectId/tasks/reorder', TasksController.reorderProjectTasks)

router.put(
  '/tasks/:taskId',
  checkRole('ADMIN', 'GERENTE', 'LIDER'),
  TasksController.updateTask
)

router.patch('/tasks/:taskId/status', TasksController.patchTaskStatus)

router.delete(
  '/tasks/:taskId',
  checkRole('ADMIN', 'GERENTE', 'LIDER'),
  TasksController.deleteTask
)

export default router
