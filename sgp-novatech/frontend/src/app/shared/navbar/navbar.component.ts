import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule } from '@angular/router'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatButtonModule } from '@angular/material/button'
import { MatMenuModule } from '@angular/material/menu'
import { MatIconModule } from '@angular/material/icon'
import { AuthService } from '../../services/auth'
import { NotificationsService, NotificationItem } from '../../services/notifications'
import { Router } from '@angular/router'

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  constructor(
    public authService: AuthService,
    public notificationsService: NotificationsService,
    private router: Router
  ) {}

  getInitials(): string {
    const name = this.authService.currentUser?.name || ''
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  }

  isAdmin(): boolean {
    return this.authService.hasRole('ADMIN')
  }

  canViewReports(): boolean {
    return this.authService.hasRole('ADMIN', 'GERENTE')
  }

  get navLinks(): Array<{ label: string; path: string; visible: boolean }> {
    return [
      { label: 'Dashboard', path: '/dashboard', visible: true },
      { label: 'Proyectos', path: '/projects', visible: true },
      { label: 'Tareas', path: '/tasks', visible: true },
      { label: 'Reportes', path: '/reports', visible: this.canViewReports() },
      { label: 'Admin', path: '/admin', visible: this.isAdmin() }
    ].filter((item) => item.visible)
  }

  get unreadNotifications(): NotificationItem[] {
    return this.notificationsService.current.filter((item) => !item.readAt)
  }

  openNotification(notification: NotificationItem): void {
    this.notificationsService.markAsRead(notification.id).subscribe({
      next: (updated) => {
        this.notificationsService.replaceNotification(updated)
        if (notification.link) {
          this.router.navigateByUrl(notification.link)
        }
      },
      error: () => {
        if (notification.link) {
          this.router.navigateByUrl(notification.link)
        }
      }
    })
  }

  formatNotificationDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(value))
  }
}
