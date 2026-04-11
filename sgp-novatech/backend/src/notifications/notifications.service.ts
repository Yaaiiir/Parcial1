import prisma from '../lib/prisma'
import { AuthRequest } from '../middleware/auth'

export const createNotification = async (input: {
  userId: string
  title: string
  message: string
  link?: string
}) => prisma.notification.create({ data: input })

export const getMyNotifications = async (user: NonNullable<AuthRequest['user']>) => {
  return prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 12
  })
}

export const markNotificationAsRead = async (
  notificationId: string,
  user: NonNullable<AuthRequest['user']>
) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId }
  })

  if (!notification) {
    throw new Error('NOTIFICATION_NOT_FOUND')
  }

  if (notification.userId !== user.id) {
    throw new Error('NOTIFICATION_FORBIDDEN')
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      readAt: notification.readAt || new Date()
    }
  })
}
