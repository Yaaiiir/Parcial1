import { CommonModule } from '@angular/common'
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'
import { UsersService, User } from '../../services/users'
import { UserFormDialogComponent } from './user-form-dialog/user-form-dialog.component'

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  readonly roleOptions: User['role'][] = ['ADMIN', 'GERENTE', 'LIDER', 'EMPLEADO']

  loading = true
  saving = false
  filtersExpanded = false
  users: User[] = []
  roleFilter = 'TODOS'
  statusFilter = 'TODOS'
  search = ''

  constructor(
    private dialog: MatDialog,
    private usersService: UsersService,
    private snackBar: MatSnackBar,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsers()
  }

  get filteredUsers(): User[] {
    return this.users.filter((user) => {
      const matchesRole = this.roleFilter === 'TODOS' || user.role === this.roleFilter
      const matchesStatus = this.statusFilter === 'TODOS'
        || (this.statusFilter === 'ACTIVOS' && user.isActive)
        || (this.statusFilter === 'INACTIVOS' && !user.isActive)
      const matchesSearch = `${user.name} ${user.email}`.toLowerCase().includes(this.search.toLowerCase())
      return matchesRole && matchesStatus && matchesSearch
    })
  }

  get roleStats(): { label: string; value: number }[] {
    return this.roleOptions.map((role) => ({
      label: role,
      value: this.users.filter((user) => user.role === role).length
    }))
  }

  get activeUsersCount(): number {
    return this.users.filter((user) => user.isActive).length
  }

  get inactiveUsersCount(): number {
    return this.users.filter((user) => !user.isActive).length
  }

  get hasActiveFilters(): boolean {
    return !!(this.search.trim() || this.roleFilter !== 'TODOS' || this.statusFilter !== 'TODOS')
  }

  get activeFiltersCount(): number {
    return [
      this.search.trim() ? 1 : 0,
      this.roleFilter !== 'TODOS' ? 1 : 0,
      this.statusFilter !== 'TODOS' ? 1 : 0
    ].reduce((sum, item) => sum + item, 0)
  }

  loadUsers(): void {
    this.loading = true
    this.usersService.getAll(true).subscribe({
      next: (users) => {
        this.ngZone.run(() => {
          this.users = users
          this.loading = false
          this.cdr.detectChanges()
        })
      },
      error: () => {
        this.ngZone.run(() => {
          this.loading = false
          this.snackBar.open('No fue posible cargar los usuarios', 'Cerrar', { duration: 3000 })
          this.cdr.detectChanges()
        })
      }
    })
  }

  selectRole(role: string): void {
    this.roleFilter = role
  }

  selectStatus(status: string): void {
    this.statusFilter = status
  }

  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded
  }

  clearFilters(): void {
    this.search = ''
    this.roleFilter = 'TODOS'
    this.statusFilter = 'TODOS'
    this.filtersExpanded = false
  }

  startCreate(): void {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '760px',
      maxWidth: '92vw',
      data: {}
    })

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadUsers()
      }
    })
  }

  editUser(user: User): void {
    const dialogRef = this.dialog.open(UserFormDialogComponent, {
      width: '760px',
      maxWidth: '92vw',
      data: { user }
    })

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadUsers()
      }
    })
  }

  toggleStatus(user: User): void {
    const nextState = !user.isActive
    const actionLabel = nextState ? 'activar' : 'desactivar'

    if (!window.confirm(`Se va a ${actionLabel} a ${user.name}. El historial del sistema se conservara. Deseas continuar?`)) {
      return
    }

    this.usersService.updateStatus(user.id, nextState).subscribe({
      next: (updated) => {
        this.ngZone.run(() => {
          this.users = this.users.map((item) => (item.id === updated.id ? updated : item))
          this.snackBar.open(
            updated.isActive ? 'Usuario activado' : 'Usuario desactivado',
            'Cerrar',
            { duration: 2500 }
          )
          this.cdr.detectChanges()
        })
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.snackBar.open(error.error?.error || 'No fue posible actualizar el estado', 'Cerrar', {
            duration: 3500
          })
          this.cdr.detectChanges()
        })
      }
    })
  }
}
