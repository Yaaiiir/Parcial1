import { CommonModule } from '@angular/common'
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'
import { AuthService } from '../../services/auth'

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  loading = true
  saving = false
  hideCurrentPassword = true
  hideNewPassword = true
  hideConfirmPassword = true

  readonly passwordForm

  constructor(
    public authService: AuthService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', Validators.required],
      confirmPassword: ['', Validators.required]
    })
  }

  ngOnInit(): void {
    this.authService.me().subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.loading = false
          this.cdr.detectChanges()
        })
      },
      error: () => {
        this.ngZone.run(() => {
          this.loading = false
          this.snackBar.open('No fue posible cargar el perfil', 'Cerrar', { duration: 3000 })
          this.cdr.detectChanges()
        })
      }
    })
  }

  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched()
      return
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue()
    if (newPassword !== confirmPassword) {
      this.snackBar.open('La confirmacion no coincide con la nueva contrasena', 'Cerrar', {
        duration: 3200
      })
      return
    }

    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/.test(newPassword!)) {
      this.snackBar.open(
        'La nueva contrasena debe tener minimo 8 caracteres, 1 mayuscula, 1 numero y 1 simbolo.',
        'Cerrar',
        { duration: 3600 }
      )
      return
    }

    this.saving = true
    this.authService.changePassword({
      currentPassword: currentPassword!,
      newPassword: newPassword!
    }).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          this.saving = false
          this.passwordForm.reset()
          this.authService.logout(response.message || 'Contrasena actualizada. Inicia sesion nuevamente.')
          this.cdr.detectChanges()
        })
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.saving = false
          this.snackBar.open(error.error?.error || 'No fue posible actualizar la contrasena', 'Cerrar', {
            duration: 3500
          })
          this.cdr.detectChanges()
        })
      }
    })
  }
}
