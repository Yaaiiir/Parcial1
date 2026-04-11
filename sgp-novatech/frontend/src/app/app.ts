import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { NavbarComponent } from './shared/navbar/navbar.component'
import { AuthService } from './services/auth'
import { NotificationsService } from './services/notifications'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, CommonModule],
  template: `
    <app-navbar *ngIf="authService.isLoggedIn"></app-navbar>
    <router-outlet></router-outlet>
  `
})
export class App {
  constructor(
    public authService: AuthService,
    private notificationsService: NotificationsService
  ) {
    this.authService.initSessionTracking()
    if (this.authService.isLoggedIn) {
      this.notificationsService.load()
    }
  }
}
