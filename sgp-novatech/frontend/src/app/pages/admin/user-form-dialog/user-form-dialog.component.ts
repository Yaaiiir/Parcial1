import { CommonModule } from '@angular/common'
import { Component, Inject } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'
import { CreateUserDto, CreateUserResponse, UpdateUserDto, User, UsersService } from '../../../services/users'

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './user-form-dialog.component.html',
  styleUrl: './user-form-dialog.component.scss'
})
export class UserFormDialogComponent {
  readonly roleOptions: User['role'][] = ['ADMIN', 'GERENTE', 'LIDER', 'EMPLEADO']
  readonly isEdit: boolean
  loading = false
  createdUser: CreateUserResponse | null = null

  readonly form

  constructor(
    private fb: FormBuilder,
    private usersService: UsersService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<UserFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user?: User }
  ) {
    this.isEdit = !!this.data.user
    this.form = this.fb.group({
      name: [this.data.user?.name || '', Validators.required],
      email: [this.data.user?.email || '', [Validators.required, Validators.email]],
      role: [this.data.user?.role || 'EMPLEADO' as User['role'], Validators.required],
      isActive: [this.data.user?.isActive ?? true]
    })
  }

  onCancel(): void {
    this.dialogRef.close(false)
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched()
      return
    }

    this.loading = true
    const raw = this.form.getRawValue()

    const request$ = this.isEdit
      ? this.usersService.update(this.data.user!.id, {
          name: raw.name || '',
          email: raw.email || '',
          role: (raw.role || 'EMPLEADO') as UpdateUserDto['role'],
          isActive: !!raw.isActive
        })
      : this.usersService.create({
          name: raw.name || '',
          email: raw.email || '',
          role: (raw.role || 'EMPLEADO') as CreateUserDto['role']
        })

    request$.subscribe({
      next: (response) => {
        this.loading = false
        if (this.isEdit) {
          this.dialogRef.close(true)
          return
        }

        this.createdUser = response as CreateUserResponse
      },
      error: (error) => {
        this.loading = false
        this.snackBar.open(error.error?.error || 'No fue posible guardar el usuario', 'Cerrar', {
          duration: 3500
        })
      }
    })
  }

  closeCreatedUser(): void {
    this.dialogRef.close(true)
  }
}
