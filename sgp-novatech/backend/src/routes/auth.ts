import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { Role } from '@prisma/client'
import prisma from '../lib/prisma'
import { verifyToken, AuthRequest } from '../middleware/auth'

const router = Router()
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/
const validRoles = new Set(Object.values(Role))
const MAX_LOGIN_ATTEMPTS = 5
const LOCK_MINUTES = 15

const buildAuthToken = (user: {
  id: string
  email: string
  role: Role
  name: string
  sessionVersion: number
}) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      sessionVersion: user.sessionVersion
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '8h' }
  )

router.post('/register', async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contrasena son requeridos' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email invalido' })
  }

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error: 'La contrasena debe tener minimo 8 caracteres, una mayuscula, un numero y un caracter especial'
    })
  }

  const userRole = role ? String(role).toUpperCase() : Role.EMPLEADO
  if (!validRoles.has(userRole as Role)) {
    return res.status(400).json({ error: 'Rol invalido' })
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: userRole as Role
      }
    })

    const token = buildAuthToken(user)

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Error en register:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contrasena son requeridos' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Correo o contrasena incorrectos' })
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(423).json({
        error: 'Cuenta temporalmente bloqueada por intentos fallidos',
        lockUntil: user.lockUntil
      })
    }

    if (user.lockUntil && user.lockUntil <= new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockUntil: null
        }
      })
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash)
    if (!passwordValid) {
      const nextAttempts = user.failedLoginAttempts + 1
      const shouldLock = nextAttempts >= MAX_LOGIN_ATTEMPTS
      const lockUntil = shouldLock
        ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
        : null

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : nextAttempts,
          lockUntil
        }
      })

      return res.status(shouldLock ? 423 : 401).json({
        error: shouldLock
          ? 'Cuenta temporalmente bloqueada por intentos fallidos'
          : 'Correo o contrasena incorrectos',
        remainingAttempts: shouldLock ? 0 : MAX_LOGIN_ATTEMPTS - nextAttempts,
        lockUntil
      })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null
      }
    })

    const token = buildAuthToken(user)

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    })
  } catch (error) {
    console.error('Error en login:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.get('/me', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }
    })

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    return res.status(200).json(user)
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.post('/change-password', verifyToken, async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Ambas contrasenas son requeridas' })
  }

  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      error: 'La nueva contrasena debe tener minimo 8 caracteres, una mayuscula, un numero y un caracter especial'
    })
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Contrasena actual incorrecta' })
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        passwordHash: newHash,
        sessionVersion: {
          increment: 1
        }
      }
    })

    return res.status(200).json({
      message: 'Contrasena actualizada correctamente. Todas las sesiones activas fueron cerradas.'
    })
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

export default router
