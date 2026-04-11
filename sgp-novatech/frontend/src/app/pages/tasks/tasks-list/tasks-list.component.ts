import { CommonModule } from '@angular/common'
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSelectModule } from '@angular/material/select'
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs'
import { AuthService } from '../../../services/auth'
import { Project, ProjectsService } from '../../../services/projects'
import { MyTasksFilters, Task, TaskComment, TaskDueRange, TaskPriority, TaskStatus, TasksService } from '../../../services/tasks'
import { TaskFormComponent } from '../task-form/task-form.component'

type StatusOption = { value: TaskStatus | ''; label: string }
type PriorityOption = { value: TaskPriority | ''; label: string }
type DueRangeOption = { value: TaskDueRange; label: string }
type AssigneeOption = { id: string; name: string; role: string }

@Component({
  selector: 'app-tasks-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './tasks-list.component.html',
  styleUrl: './tasks-list.component.scss'
})
export class TasksListComponent implements OnInit, OnDestroy {
  loading = true
  deletingTask = false
  filtersExpanded = false
  projects: Project[] = []
  assigneeOptions: AssigneeOption[] = []
  tasks: Task[] = []
  selectedTask: Task | null = null
  comments: TaskComment[] = []
  commentsLoading = false
  commentSaving = false
  commentDraft = ''
  editingCommentId: string | null = null
  editCommentDraft = ''
  updatingCommentId: string | null = null
  deletingCommentId: string | null = null
  filters: MyTasksFilters = {
    search: '',
    status: '',
    priority: '',
    projectId: '',
    assigneeId: '',
    dueRange: 'TODAS'
  }
  private readonly destroy$ = new Subject<void>()
  private readonly searchChanges$ = new Subject<string>()

  readonly statusOptions: StatusOption[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'EN_PROGRESO', label: 'En progreso' },
    { value: 'EN_REVISION', label: 'En revision' },
    { value: 'COMPLETADA', label: 'Completada' }
  ]

  readonly priorityOptions: PriorityOption[] = [
    { value: '', label: 'Todas las prioridades' },
    { value: 'ALTA', label: 'Alta' },
    { value: 'MEDIA', label: 'Media' },
    { value: 'BAJA', label: 'Baja' }
  ]

  readonly dueRangeOptions: DueRangeOption[] = [
    { value: 'TODAS', label: 'Todas las fechas' },
    { value: 'HOY', label: 'Vencen hoy' },
    { value: 'ESTA_SEMANA', label: 'Esta semana' },
    { value: 'VENCIDAS', label: 'Vencidas' }
  ]

  constructor(
    public authService: AuthService,
    private projectsService: ProjectsService,
    private tasksService: TasksService,
    private dialog: MatDialog,
    private router: Router,
    private snackBar: MatSnackBar,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.searchChanges$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadTasks())

    this.projectsService.getAll().subscribe({
      next: (projects) => {
        this.ngZone.run(() => {
          this.projects = projects
          this.assigneeOptions = this.buildAssigneeOptions(projects)
          this.loadTasks()
        })
      },
      error: () => {
        this.loading = false
        this.snackBar.open('No fue posible cargar los proyectos', 'Cerrar', { duration: 3000 })
        this.cdr.detectChanges()
      }
    })
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  loadTasks(): void {
    this.loading = true

    this.tasksService.getList(this.filters).subscribe({
      next: (tasks) => {
        this.ngZone.run(() => {
          this.tasks = tasks
          const nextSelectedTask = this.resolveSelectedTask(tasks)
          if (nextSelectedTask) {
            this.selectTask(nextSelectedTask)
          } else {
            this.selectedTask = null
            this.comments = []
          }
          this.loading = false
          this.cdr.detectChanges()
        })
      },
      error: () => {
        this.ngZone.run(() => {
          this.loading = false
          this.snackBar.open('No fue posible cargar las tareas', 'Cerrar', { duration: 3000 })
          this.cdr.detectChanges()
        })
      }
    })
  }

  onSearchChange(): void {
    this.searchChanges$.next(this.filters.search?.trim() || '')
  }

  onFiltersChange(): void {
    this.loadTasks()
  }

  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      status: '',
      priority: '',
      projectId: '',
      assigneeId: '',
      dueRange: 'TODAS'
    }
    this.filtersExpanded = false
    this.loadTasks()
  }

  selectTask(task: Task): void {
    this.selectedTask = task
    this.loadComments(task.id)
  }

  loadComments(taskId: string): void {
    this.commentsLoading = true
    this.tasksService.getComments(taskId).subscribe({
      next: (comments) => {
        this.ngZone.run(() => {
          this.comments = comments
          this.commentsLoading = false
          this.cdr.detectChanges()
        })
      },
      error: () => {
        this.ngZone.run(() => {
          this.comments = []
          this.commentsLoading = false
          this.snackBar.open('No fue posible cargar los comentarios', 'Cerrar', { duration: 2500 })
          this.cdr.detectChanges()
        })
      }
    })
  }

  addComment(): void {
    if (!this.selectedTask || !this.commentDraft.trim() || this.commentSaving) {
      return
    }

    if (this.commentDraft.trim().length > 500) {
      this.snackBar.open('El comentario no puede exceder 500 caracteres', 'Cerrar', { duration: 2500 })
      return
    }

    this.commentSaving = true
    this.tasksService.createComment(this.selectedTask.id, this.commentDraft.trim()).subscribe({
      next: (comment) => {
        this.ngZone.run(() => {
          this.comments = [...this.comments, comment]
          this.commentDraft = ''
          this.commentSaving = false
          this.bumpCommentCount(1)
          this.cdr.detectChanges()
        })
      },
      error: () => {
        this.ngZone.run(() => {
          this.commentSaving = false
          this.snackBar.open('No fue posible guardar el comentario', 'Cerrar', { duration: 2500 })
          this.cdr.detectChanges()
        })
      }
    })
  }

  startEditComment(comment: TaskComment): void {
    this.editingCommentId = comment.id
    this.editCommentDraft = comment.content
  }

  cancelEditComment(): void {
    this.editingCommentId = null
    this.editCommentDraft = ''
    this.updatingCommentId = null
  }

  saveComment(comment: TaskComment): void {
    const content = this.editCommentDraft.trim()
    if (!content) {
      return
    }

    if (content.length > 500) {
      this.snackBar.open('El comentario no puede exceder 500 caracteres', 'Cerrar', { duration: 2500 })
      return
    }

    this.updatingCommentId = comment.id
    this.tasksService.updateComment(comment.id, content).subscribe({
      next: (updated) => {
        this.ngZone.run(() => {
          this.comments = this.comments.map((item) => item.id === updated.id ? updated : item)
          this.cancelEditComment()
          this.snackBar.open('Comentario actualizado', 'Cerrar', { duration: 2000 })
          this.cdr.detectChanges()
        })
      },
      error: () => {
        this.ngZone.run(() => {
          this.updatingCommentId = null
          this.snackBar.open('No fue posible actualizar el comentario', 'Cerrar', { duration: 2500 })
          this.cdr.detectChanges()
        })
      }
    })
  }

  deleteComment(comment: TaskComment): void {
    if (this.deletingCommentId) {
      return
    }

    const confirmed = window.confirm('Se eliminara este comentario.')
    if (!confirmed) {
      return
    }

    this.deletingCommentId = comment.id
    this.tasksService.deleteComment(comment.id).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.comments = this.comments.filter((item) => item.id !== comment.id)
          if (this.editingCommentId === comment.id) {
            this.cancelEditComment()
          }
          this.deletingCommentId = null
          this.bumpCommentCount(-1)
          this.snackBar.open('Comentario eliminado', 'Cerrar', { duration: 2000 })
          this.cdr.detectChanges()
        })
      },
      error: () => {
        this.ngZone.run(() => {
          this.deletingCommentId = null
          this.snackBar.open('No fue posible eliminar el comentario', 'Cerrar', { duration: 2500 })
          this.cdr.detectChanges()
        })
      }
    })
  }

  openCreateDialog(): void {
    const projectId = this.filters.projectId || this.selectedTask?.project?.id || this.projects[0]?.id

    if (!projectId) {
      this.snackBar.open('Selecciona un proyecto antes de crear una tarea', 'Cerrar', { duration: 2500 })
      return
    }

    this.projectsService.getById(projectId).subscribe({
      next: (project) => {
        const ref = this.dialog.open(TaskFormComponent, {
          width: '560px',
          data: {
            projectId: project.id,
            members: project.members.map((member) => ({
              id: member.user.id,
              name: member.user.name,
              role: member.user.role
            }))
          }
        })

        ref.afterClosed().subscribe((result) => {
          if (result) {
            this.loadTasks()
            this.snackBar.open('Tarea creada correctamente', 'Cerrar', { duration: 2500 })
          }
        })
      },
      error: () => {
        this.snackBar.open('No fue posible abrir el formulario de tarea', 'Cerrar', { duration: 2500 })
      }
    })
  }

  openProjectBoard(): void {
    if (!this.selectedTask?.project?.id) {
      return
    }

    this.router.navigate(['/tasks', this.selectedTask.project.id])
  }

  openEditDialog(): void {
    if (!this.selectedTask) {
      return
    }

    this.projectsService.getById(this.selectedTask.projectId).subscribe({
      next: (project) => {
        const ref = this.dialog.open(TaskFormComponent, {
          width: '560px',
          data: {
            projectId: project.id,
            task: this.selectedTask,
            members: project.members.map((member) => ({
              id: member.user.id,
              name: member.user.name,
              role: member.user.role
            }))
          }
        })

        ref.afterClosed().subscribe((result) => {
          if (result) {
            this.loadTasks()
            this.snackBar.open('Tarea actualizada correctamente', 'Cerrar', { duration: 2500 })
          }
        })
      },
      error: () => {
        this.snackBar.open('No fue posible abrir la tarea seleccionada', 'Cerrar', { duration: 2500 })
      }
    })
  }

  deleteSelectedTask(): void {
    if (!this.selectedTask || this.deletingTask) {
      return
    }

    const confirmed = window.confirm(`Se eliminara la tarea ${this.getTaskCode(this.selectedTask)}. Esta accion no se puede deshacer.`)
    if (!confirmed) {
      return
    }

    this.deletingTask = true
    const taskId = this.selectedTask.id

    this.tasksService.delete(taskId).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.tasks = this.tasks.filter((task) => task.id !== taskId)
          this.selectedTask = this.resolveSelectedTask(this.tasks)
          if (this.selectedTask) {
            this.loadComments(this.selectedTask.id)
          } else {
            this.comments = []
          }
          this.deletingTask = false
          this.snackBar.open('Tarea eliminada correctamente', 'Cerrar', { duration: 2500 })
          this.cdr.detectChanges()
        })
      },
      error: () => {
        this.ngZone.run(() => {
          this.deletingTask = false
          this.snackBar.open('No fue posible eliminar la tarea', 'Cerrar', { duration: 2500 })
          this.cdr.detectChanges()
        })
      }
    })
  }

  advanceTask(): void {
    if (!this.selectedTask) {
      return
    }

    const nextStatus = this.getNextStatus(this.selectedTask.status)
    if (!nextStatus) {
      return
    }

    this.tasksService.updateStatus(this.selectedTask.id, nextStatus).subscribe({
      next: (task) => {
        this.ngZone.run(() => {
          this.tasks = this.tasks.map((current) => current.id === task.id ? { ...current, ...task } : current)
          this.selectedTask = { ...this.selectedTask!, ...task }
          this.snackBar.open('Estado actualizado', 'Cerrar', { duration: 2000 })
          this.cdr.detectChanges()
        })
      },
      error: () => {
        this.snackBar.open('No fue posible actualizar la tarea', 'Cerrar', { duration: 2500 })
      }
    })
  }

  canCreateTasks(): boolean {
    if (this.filters.projectId) {
      const project = this.projects.find((item) => item.id === this.filters.projectId)
      if (project && project.status !== 'ACTIVO') {
        return false
      }
    }

    return this.authService.hasRole('ADMIN', 'GERENTE', 'LIDER')
  }

  canAdvanceTask(): boolean {
    if (!this.selectedTask) {
      return false
    }

    if (this.selectedTask.project?.status === 'CERRADO') {
      return false
    }

    return this.canCreateTasks() || this.selectedTask.assigneeId === this.authService.currentUser?.id
  }

  canManageSelectedTask(): boolean {
    if (!this.selectedTask) {
      return false
    }

    return this.canCreateTasks() && this.selectedTask.project?.status === 'ACTIVO'
  }

  getTasksAlert(): { tone: 'warning' | 'danger'; text: string } | null {
    const overdue = this.tasks.filter(
      (task) => task.status !== 'COMPLETADA' && new Date(task.deadline).getTime() < Date.now()
    ).length

    if (overdue > 0) {
      return { tone: 'danger', text: `Tienes ${overdue} tarea(s) vencida(s) en la lista actual.` }
    }

    if (this.filters.projectId) {
      const project = this.projects.find((item) => item.id === this.filters.projectId)
      if (project?.status === 'PAUSADO') {
        return { tone: 'warning', text: 'Estas viendo un proyecto pausado. Revisa pendientes antes de continuar.' }
      }
    }

    return null
  }

  getTotalLabel(): string {
    return `${this.tasks.length} tarea${this.tasks.length === 1 ? '' : 's'} en total`
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.filters.search?.trim()
      || this.filters.status
      || this.filters.priority
      || this.filters.projectId
      || this.filters.assigneeId
      || this.filters.dueRange !== 'TODAS'
    )
  }

  get activeFiltersCount(): number {
    return [
      this.filters.search?.trim() ? 1 : 0,
      this.filters.status ? 1 : 0,
      this.filters.priority ? 1 : 0,
      this.filters.projectId ? 1 : 0,
      this.filters.assigneeId ? 1 : 0,
      this.filters.dueRange !== 'TODAS' ? 1 : 0
    ].reduce((sum, value) => sum + value, 0)
  }

  canFilterByAssignee(): boolean {
    return this.assigneeOptions.length > 1
  }

  getPriorityClass(priority: TaskPriority): string {
    return `priority-${priority.toLowerCase()}`
  }

  getStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      PENDIENTE: 'Pendiente',
      EN_PROGRESO: 'En progreso',
      EN_REVISION: 'En revision',
      COMPLETADA: 'Completada'
    }
    return labels[status]
  }

  getPriorityLabel(priority: TaskPriority): string {
    const labels: Record<TaskPriority, string> = {
      ALTA: 'Alta',
      MEDIA: 'Media',
      BAJA: 'Baja'
    }
    return labels[priority]
  }

  getNextStatusLabel(): string {
    if (!this.selectedTask) {
      return ''
    }

    const nextStatus = this.getNextStatus(this.selectedTask.status)
    return nextStatus ? `Mover a ${this.getStatusLabel(nextStatus)}` : ''
  }

  getTaskCode(task: Task): string {
    return task.publicCode || 'TSK-000-000'
  }

  getRelativeTime(value: string): string {
    const diffMs = Date.now() - new Date(value).getTime()
    const minutes = Math.max(1, Math.floor(diffMs / 60000))

    if (minutes < 60) {
      return `Hace ${minutes} min`
    }

    const hours = Math.floor(minutes / 60)
    if (hours < 24) {
      return `Hace ${hours} hora${hours === 1 ? '' : 's'}`
    }

    const days = Math.floor(hours / 24)
    return `Hace ${days} dia${days === 1 ? '' : 's'}`
  }

  getCommentInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  formatCommentTimestamp(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value))
  }

  isOwnComment(comment: TaskComment): boolean {
    return comment.author.id === this.authService.currentUser?.id
  }

  isDeletedComment(comment: TaskComment): boolean {
    return !!comment.deletedAt
  }

  getTaskCommentsCount(task: Task): number {
    return task._count?.comments ?? 0
  }

  isEditingComment(comment: TaskComment): boolean {
    return this.editingCommentId === comment.id
  }

  private bumpCommentCount(delta: number): void {
    if (!this.selectedTask) {
      return
    }

    const updateCount = (task: Task) => task.id === this.selectedTask?.id
      ? {
          ...task,
          _count: {
            comments: Math.max(0, (task._count?.comments ?? 0) + delta)
          }
        }
      : task

    this.tasks = this.tasks.map(updateCount)
    this.selectedTask = updateCount(this.selectedTask)
  }

  getStatusCount(status: TaskStatus): number {
    return this.tasks.filter((task) => task.status === status).length
  }

  private getNextStatus(status: TaskStatus): TaskStatus | null {
    const flow: Record<TaskStatus, TaskStatus | null> = {
      PENDIENTE: 'EN_PROGRESO',
      EN_PROGRESO: 'EN_REVISION',
      EN_REVISION: 'COMPLETADA',
      COMPLETADA: null
    }

    return flow[status]
  }

  private resolveSelectedTask(tasks: Task[]): Task | null {
    if (tasks.length === 0) {
      return null
    }

    if (!this.selectedTask) {
      return tasks[0]
    }

    return tasks.find((task) => task.id === this.selectedTask?.id) ?? tasks[0]
  }

  private buildAssigneeOptions(projects: Project[]): AssigneeOption[] {
    const members = projects.flatMap((project) => project.members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      role: member.user.role
    })))

    return members
      .filter((member, index, array) => array.findIndex((item) => item.id === member.id) === index)
      .sort((left, right) => left.name.localeCompare(right.name, 'es'))
  }
}
