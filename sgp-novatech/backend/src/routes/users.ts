import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { Role } from '@prisma/client'
import prisma from '../lib/prisma'
import { verifyToken, checkRole, AuthRequest } from '../middleware/auth'

const router = Router()
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/
const validRoles = new Set(Object.values(Role))

const generateTemporaryPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const numbers = '23456789'
  const specials = '!@#$%^&*'

  const pick = (source: string) => source[Math.floor(Math.random() * source.length)]
  const seed = [
    pick(upper),
    pick(lower),
    pick(numbers),
    pick(specials)
  ]
  const fullSource = `${upper}${lower}${numbers}${specials}`

  while (seed.length < 10) {
    seed.push(pick(fullSource))
  }

  return seed.sort(() => Math.random() - 0.5).join('')
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true
} as const

router.use(verifyToken)

// GET /users - lista usuarios (Admin y Gerente)
router.get('/', checkRole('ADMIN', 'GERENTE'), async (req: AuthRequest, res: Response) => {
  try {
    const { role, includeInactive } = req.query
    const where: Record<string, unknown> = {}

    if (role) {
      where.role = String(role)
    }

    if (req.user?.role !== 'ADMIN' || String(includeInactive) !== 'true') {
      where.isActive = true
    }

    const users = await prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { name: 'asc' }
    })

    return res.status(200).json(users)
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.post('/', checkRole('ADMIN'), async (req: Request, res: Response) => {
  const body = req.body as {
    name?: string
    email?: string
    password?: string
    role?: string
  }
  const { name, email, password, role } = body

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Nombre, email y rol son requeridos' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email invalido' })
  }

  const temporaryPassword = password || generateTemporaryPassword()

  if (!passwordRegex.test(temporaryPassword)) {
    return res.status(400).json({
      error: 'La contrasena debe tener minimo 8 caracteres, una mayuscula, un numero y un caracter especial'
    })
  }

  const normalizedRole = String(role).toUpperCase()
  if (!validRoles.has(normalizedRole as Role)) {
    return res.status(400).json({ error: 'Rol invalido' })
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' })
    }

    const passwordHash = await bcrypt.hash(temporaryPassword, 10)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: normalizedRole as Role
      },
      select: userSelect
    })

    return res.status(201).json({
      ...user,
      temporaryPassword
    })
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.put('/:id', checkRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  const body = req.body as {
    name?: string
    email?: string
    role?: string
    isActive?: boolean
  }
  const { name, email, role, isActive } = body

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Nombre, email y rol son requeridos' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email invalido' })
  }

  const normalizedRole = String(role).toUpperCase()
  if (!validRoles.has(normalizedRole as Role)) {
    return res.status(400).json({ error: 'Rol invalido' })
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { id } })
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const userWithEmail = await prisma.user.findUnique({ where: { email } })
    if (userWithEmail && userWithEmail.id !== id) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role: normalizedRole as Role,
        isActive: typeof isActive === 'boolean' ? isActive : existingUser.isActive
      },
      select: userSelect
    })

    return res.status(200).json(updatedUser)
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.patch('/:id/status', checkRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id)
  const body = req.body as { isActive?: boolean }
  const { isActive } = body

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'El campo isActive es requerido' })
  }

  if (req.user?.id === id && !isActive) {
    return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' })
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { id } })
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: userSelect
    })

    return res.status(200).json(updatedUser)
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

export default router
