import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { AuthService } from '../../services/auth'
import { NotificationsService } from '../../services/notifications'

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm: FormGroup
  loading = false
  error = ''
  hidePassword = true
  sessionNotice = ''

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notificationsService: NotificationsService
  ) {
    this.sessionNotice = this.authService.consumeSessionNotice()

    if (this.authService.hasValidSession()) {
      this.router.navigate([this.authService.getDefaultRoute()])
    }

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    })
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return
    }

    this.loading = true
    this.error = ''

    const { email, password } = this.loginForm.value

    this.authService.login(email, password).subscribe({
      next: () => {
        this.loading = false
        this.sessionNotice = ''
        this.notificationsService.load()
        this.router.navigate([this.authService.getDefaultRoute()])
      },
      error: (err) => {
        this.loading = false
        const backendMessage = err.error?.error || 'Error al iniciar sesion'
        const remainingAttempts = err.error?.remainingAttempts

        if (err.status === 423 && err.error?.lockUntil) {
          const lockDate = new Date(err.error.lockUntil).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit'
          })
          this.error = `${backendMessage}. Intenta nuevamente despues de las ${lockDate}.`
          return
        }

        if (typeof remainingAttempts === 'number' && remainingAttempts > 0) {
          this.error = `${backendMessage}. Intentos restantes: ${remainingAttempts}.`
          return
        }

        this.error = backendMessage
      }
    })
  }
}
