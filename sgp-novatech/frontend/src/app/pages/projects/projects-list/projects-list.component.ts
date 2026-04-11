import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { RouterModule } from '@angular/router'
import { MatTableModule } from '@angular/material/table'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatChipsModule } from '@angular/material/chips'
import { MatInputModule } from '@angular/material/input'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'
import { MatSelectModule } from '@angular/material/select'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatNativeDateModule } from '@angular/material/core'
import { finalize, timeout } from 'rxjs'
import { Project, ProjectsService } from '../../../services/projects'
import { AuthService } from '../../../services/auth'
import { ProjectFormComponent } from '../project-form/project-form.component'
import { User, UsersService } from '../../../services/users'

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressBarModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './projects-list.component.html',
  styleUrl: './projects-list.component.scss'
})
export class ProjectsListComponent implements OnInit {
  projects: Project[] = []
  leaders: User[] = []
  loading = true
  filtersExpanded = false
  search = ''
  activeFilter = 'TODOS'
  selectedLeaderId = ''
  deadlineFrom: Date | null = null
  deadlineTo: Date | null = null
  currentPage = 1
  readonly pageSize = 10
  totalItems = 0
  totalPages = 1

  displayedColumns = ['name', 'leader', 'deadline', 'progress', 'status', 'actions']
  filters = ['TODOS', 'ACTIVO', 'PAUSADO', 'CERRADO']

  constructor(
    private projectsService: ProjectsService,
    private usersService: UsersService,
    public authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLeaders()
    this.loadProjects()
  }

  loadLeaders(): void {
    this.usersService.getLeaders().subscribe({
      next: (leaders) => {
        this.ngZone.run(() => {
          this.leaders = leaders
          this.cdr.detectChanges()
        })
      }
    })
  }

  loadProjects(): void {
    this.ngZone.run(() => {
      this.loading = true
      this.cdr.detectChanges()
    })

    this.projectsService.getPage({
      search: this.search,
      status: this.activeFilter,
      leaderId: this.selectedLeaderId,
      deadlineFrom: this.deadlineFrom ? this.toIsoDate(this.deadlineFrom) : undefined,
      deadlineTo: this.deadlineTo ? this.toIsoDate(this.deadlineTo, true) : undefined,
      page: this.currentPage,
      pageSize: this.pageSize
    })
      .pipe(
        timeout(10000),
        finalize(() => {
          this.ngZone.run(() => {
            this.loading = false
            this.cdr.detectChanges()
          })
        })
      )
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.projects = data.items
            this.totalItems = data.pagination.totalItems
            this.totalPages = data.pagination.totalPages
            this.currentPage = data.pagination.page
            this.cdr.detectChanges()
          })
        },
        error: (error) => {
          this.ngZone.run(() => {
            console.error('Error cargando proyectos:', error)
            this.snackBar.open('Error al cargar proyectos', 'Cerrar', { duration: 3000 })
            this.cdr.detectChanges()
          })
        }
      })
  }

  applyFilter(status: string): void {
    this.activeFilter = status
    this.currentPage = 1
    this.loadProjects()
  }

  onSearch(): void {
    this.currentPage = 1
    this.loadProjects()
  }

  onLeaderChange(): void {
    this.currentPage = 1
    this.loadProjects()
  }

  onDateRangeChange(): void {
    this.currentPage = 1
    this.loadProjects()
  }

  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded
  }

  clearFilters(): void {
    this.search = ''
    this.activeFilter = 'TODOS'
    this.selectedLeaderId = ''
    this.deadlineFrom = null
    this.deadlineTo = null
    this.currentPage = 1
    this.filtersExpanded = false
    this.loadProjects()
  }

  goToPreviousPage(): void {
    if (this.currentPage <= 1) {
      return
    }

    this.currentPage -= 1
    this.loadProjects()
  }

  goToNextPage(): void {
    if (this.currentPage >= this.totalPages) {
      return
    }

    this.currentPage += 1
    this.loadProjects()
  }

  getPageStart(): number {
    if (this.totalItems === 0) {
      return 0
    }

    return (this.currentPage - 1) * this.pageSize + 1
  }

  getPageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems)
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(ProjectFormComponent, {
      width: '520px',
      data: { project: null }
    })

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadProjects()
        this.snackBar.open('Proyecto creado correctamente', 'Cerrar', { duration: 3000 })
      }
    })
  }

  openEditDialog(project: Project): void {
    const ref = this.dialog.open(ProjectFormComponent, {
      width: '520px',
      data: { project }
    })

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadProjects()
        this.snackBar.open('Proyecto actualizado', 'Cerrar', { duration: 3000 })
      }
    })
  }

  goToDetail(id: string): void {
    this.router.navigate(['/projects', id])
  }

  goToKanban(id: string): void {
    this.router.navigate(['/tasks', id])
  }

  daysLeft(deadline: string): number {
    const diff = new Date(deadline).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  isUrgent(deadline: string): boolean {
    return this.daysLeft(deadline) <= 3
  }

  canEdit(): boolean {
    return this.authService.hasRole('GERENTE', 'ADMIN')
  }

  canOpenReports(): boolean {
    return this.authService.hasRole('GERENTE', 'ADMIN')
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.search.trim()
      || this.activeFilter !== 'TODOS'
      || this.selectedLeaderId
      || this.deadlineFrom
      || this.deadlineTo
    )
  }

  get activeFiltersCount(): number {
    return [
      this.search.trim() ? 1 : 0,
      this.activeFilter !== 'TODOS' ? 1 : 0,
      this.selectedLeaderId ? 1 : 0,
      this.deadlineFrom ? 1 : 0,
      this.deadlineTo ? 1 : 0
    ].reduce((sum, value) => sum + value, 0)
  }

  getDeadlineLabel(deadline: string): string {
    const days = this.daysLeft(deadline)

    if (days < 0) {
      return `Vencido hace ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}`
    }

    if (days === 0) {
      return 'Vence hoy'
    }

    if (days <= 3) {
      return `Vence en ${days} dia${days === 1 ? '' : 's'}`
    }

    return ''
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      ACTIVO: 'primary',
      PAUSADO: 'warn',
      CERRADO: ''
    }

    return map[status] || ''
  }

  private toIsoDate(value: Date, endOfDay = false): string {
    const normalized = new Date(value)
    if (endOfDay) {
      normalized.setHours(23, 59, 59, 999)
    } else {
      normalized.setHours(0, 0, 0, 0)
    }

    return normalized.toISOString()
  }
}
