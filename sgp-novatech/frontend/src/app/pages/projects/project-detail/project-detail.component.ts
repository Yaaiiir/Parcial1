import { CommonModule } from '@angular/common'
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSelectModule } from '@angular/material/select'
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'
import { AuthService } from '../../../services/auth'
import { Project, ProjectsService } from '../../../services/projects'
import { DashboardData, ReportsService } from '../../../services/reports'
import { Task, TaskComment, TaskStatus, TasksService } from '../../../services/tasks'
import { TaskFormComponent } from '../../tasks/task-form/task-form.component'

type BoardColumn = {
  id: TaskStatus
  title: string
  tone: string
  tasks: Task[]
}

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CdkDropList,
    CdkDrag,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss'
})
export class ProjectDetailComponent implements OnInit {
  loading = true
  statusSaving = false
  pdfExporting = false
  deletingTask = false
  project: Project | null = null
  statusDraft: Project['status'] | '' = ''
  selectedTask: Task | null = null
  comments: TaskComment[] = []
  commentsLoading = false
  commentSaving = false
  commentDraft = ''
  editingCommentId: string | null = null
  editCommentDraft = ''
  updatingCommentId: string | null = null
  deletingCommentId: string | null = null
  columns: BoardColumn[] = [
    { id: 'PENDIENTE', title: 'Pendiente', tone: 'pending', tasks: [] },
    { id: 'EN_PROGRESO', title: 'En progreso', tone: 'progress', tasks: [] },
    { id: 'EN_REVISION', title: 'En revision', tone: 'review', tasks: [] },
    { id: 'COMPLETADA', title: 'Completada', tone: 'done', tasks: [] }
  ]

  constructor(
    public authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private projectsService: ProjectsService,
    private reportsService: ReportsService,
    private tasksService: TasksService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProject()
  }

  loadProject(): void {
    const projectId = this.route.snapshot.paramMap.get('id')
    if (!projectId) {
      this.router.navigate(['/projects'])
      return
    }

    this.loading = true

    this.projectsService.getById(projectId).subscribe({
      next: (project) => {
        this.tasksService.getByProject(project.id).subscribe({
          next: (tasks) => {
            this.ngZone.run(() => {
              this.project = { ...project, tasks }
              this.statusDraft = project.status
              this.columns = this.columns.map((column) => ({
                ...column,
                tasks: tasks.filter((task) => task.status === column.id)
              }))
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
              this.snackBar.open('No fue posible cargar las tareas del proyecto', 'Cerrar', { duration: 3000 })
              this.cdr.detectChanges()
            })
          }
        })
      },
      error: () => {
        this.ngZone.run(() => {
          this.loading = false
          this.snackBar.open('No fue posible cargar el proyecto', 'Cerrar', { duration: 3000 })
          this.router.navigate(['/projects'])
          this.cdr.detectChanges()
        })
      }
    })
  }

  backToProjects(): void {
    this.router.navigate(['/projects'])
  }

  goToReports(): void {
    if (!this.project || !this.canOpenProjectReports()) {
      return
    }

    this.router.navigate(['/reports'], { queryParams: { projectId: this.project.id } })
  }

  exportProjectPdf(): void {
    if (!this.project || this.pdfExporting) {
      return
    }

    this.pdfExporting = true
    this.reportsService.getDashboard(this.project.id).subscribe({
      next: async (data) => {
        try {
          await this.generateProjectPdf(data)
          this.snackBar.open('PDF exportado correctamente', 'Cerrar', { duration: 2500 })
        } catch {
          this.snackBar.open('No fue posible exportar el PDF del proyecto', 'Cerrar', { duration: 3200 })
        } finally {
          this.ngZone.run(() => {
            this.pdfExporting = false
            this.cdr.detectChanges()
          })
        }
      },
      error: () => {
        this.ngZone.run(() => {
          this.pdfExporting = false
          this.snackBar.open('No fue posible obtener los datos del reporte del proyecto', 'Cerrar', { duration: 3200 })
          this.cdr.detectChanges()
        })
      }
    })
  }

  openCreateDialog(): void {
    if (!this.project) {
      return
    }

    const ref = this.dialog.open(TaskFormComponent, {
      width: '560px',
      data: {
        projectId: this.project.id,
        members: this.project.members.map((member) => ({
          id: member.user.id,
          name: member.user.name,
          role: member.user.role
        }))
      }
    })

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadProject()
        this.snackBar.open('Tarea creada correctamente', 'Cerrar', { duration: 2500 })
      }
    })
  }

  changeProjectStatus(): void {
    if (!this.project || !this.statusDraft || this.statusDraft === this.project.status || this.statusSaving) {
      return
    }

    if (this.statusDraft === 'CERRADO') {
      const confirmed = window.confirm('Confirma el cierre del proyecto? Esta accion archivara todas las tareas pendientes.')
      if (!confirmed) {
        this.statusDraft = this.project.status
        return
      }
    }

    this.statusSaving = true

    this.projectsService.changeStatus(this.project.id, this.statusDraft).subscribe({
      next: (updated) => {
        this.ngZone.run(() => {
          if (this.project) {
            this.project = { ...this.project, status: updated.status }
            this.statusDraft = updated.status
          }
          this.statusSaving = false
          this.snackBar.open('Estado del proyecto actualizado', 'Cerrar', { duration: 2400 })
          this.cdr.detectChanges()
        })
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.statusDraft = this.project?.status || ''
          this.statusSaving = false
          this.snackBar.open(error.error?.error || 'No fue posible actualizar el estado del proyecto', 'Cerrar', {
            duration: 3600
          })
          this.cdr.detectChanges()
        })
      }
    })
  }

  openEditDialog(task: Task): void {
    if (!this.project) {
      return
    }

    const ref = this.dialog.open(TaskFormComponent, {
      width: '560px',
      data: {
        projectId: this.project.id,
        task,
        members: this.project.members.map((member) => ({
          id: member.user.id,
          name: member.user.name,
          role: member.user.role
        }))
      }
    })

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadProject()
        this.snackBar.open('Tarea actualizada correctamente', 'Cerrar', { duration: 2500 })
      }
    })
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

  drop(event: CdkDragDrop<Task[]>, targetStatus: TaskStatus): void {
    if (!this.project) {
      return
    }

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex)
      this.persistBoardOrder()
      return
    }

    const previousData = [...event.previousContainer.data]
    const currentData = [...event.container.data]
    const movedTask = event.previousContainer.data[event.previousIndex]

    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex)
    movedTask.status = targetStatus
    if (this.selectedTask?.id === movedTask.id) {
      this.selectedTask = { ...this.selectedTask, status: targetStatus }
    }
    this.cdr.detectChanges()

    this.tasksService.reorder(this.project.id, this.buildBoardPayload()).subscribe({
      next: (tasks) => {
        this.ngZone.run(() => {
          this.syncBoardTasks(tasks)
          this.snackBar.open('Tablero actualizado', 'Cerrar', { duration: 1800 })
          this.cdr.detectChanges()
        })
      },
      error: () => {
        event.previousContainer.data.splice(0, event.previousContainer.data.length, ...previousData)
        event.container.data.splice(0, event.container.data.length, ...currentData)
        this.cdr.detectChanges()
        this.snackBar.open('No fue posible mover la tarea', 'Cerrar', { duration: 3000 })
      }
    })
  }

  canManageTasks(): boolean {
    return this.authService.hasRole('GERENTE', 'ADMIN', 'LIDER') && this.project?.status === 'ACTIVO'
  }

  canDragTask(task: Task): boolean {
    if (!this.project || this.project.status !== 'ACTIVO') {
      return false
    }

    if (this.authService.hasRole('GERENTE', 'ADMIN', 'LIDER')) {
      return true
    }

    return task.assigneeId === this.authService.currentUser?.id
  }

  getProjectAlert(): { tone: 'info' | 'warning' | 'danger'; text: string } | null {
    if (!this.project) {
      return null
    }

    const overdue = this.columns
      .flatMap((column) => column.tasks)
      .filter((task) => task.status !== 'COMPLETADA' && new Date(task.deadline).getTime() < Date.now()).length

    if (this.project.status === 'CERRADO') {
      return { tone: 'info', text: 'Este proyecto esta cerrado. El tablero queda en modo solo lectura.' }
    }

    if (this.project.status === 'PAUSADO') {
      return { tone: 'warning', text: 'Este proyecto esta pausado. Puedes revisar el avance, pero no deberias crear nuevas tareas.' }
    }

    if (overdue > 0) {
      return { tone: 'danger', text: `Hay ${overdue} tarea(s) vencida(s) en este proyecto.` }
    }

    return null
  }

  getConnectedLists(currentId: TaskStatus): string[] {
    return this.columns.filter((column) => column.id !== currentId).map((column) => column.id)
  }

  getPriorityClass(task: Task): string {
    return `priority-${task.priority?.toLowerCase() || 'media'}`
  }

  getPriorityLabel(priority: string): string {
    const map: Record<string, string> = {
      ALTA: 'Alta',
      MEDIA: 'Media',
      BAJA: 'Baja'
    }

    return map[priority] ?? priority
  }

  isUrgent(task: Task): boolean {
    return !!task.deadline && new Date(task.deadline).getTime() < Date.now() + 2 * 24 * 60 * 60 * 1000
  }

  get projectCode(): string {
    if (!this.project) {
      return 'PRJ-000'
    }

    return this.project.publicCode || 'PRJ-000'
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

  getAuditActionLabel(action: string): string {
    switch (action) {
      case 'CREATED':
        return 'Creacion'
      case 'STATUS_CHANGED':
        return 'Cambio de estado'
      case 'UPDATED':
      default:
        return 'Actualizacion'
    }
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

  formatAuditTimestamp(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'full',
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

  private resolveSelectedTask(tasks: Task[]): Task | null {
    if (tasks.length === 0) {
      return null
    }

    if (!this.selectedTask) {
      return tasks[0]
    }

    return tasks.find((task) => task.id === this.selectedTask?.id) ?? tasks[0]
  }

  canChangeProjectStatus(): boolean {
    return this.authService.hasRole('ADMIN', 'GERENTE')
  }

  canOpenProjectReports(): boolean {
    if (!this.project) {
      return false
    }

    if (this.authService.hasRole('ADMIN', 'GERENTE')) {
      return true
    }

    return this.authService.hasRole('LIDER') && this.project.leaderId === this.authService.currentUser?.id
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

    this.tasksService.delete(this.selectedTask.id).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.deletingTask = false
          this.loadProject()
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

  private buildBoardPayload() {
    return this.columns.map((column) => ({
      status: column.id,
      taskIds: column.tasks.map((task) => task.id)
    }))
  }

  private persistBoardOrder(): void {
    if (!this.project) {
      return
    }

    this.tasksService.reorder(this.project.id, this.buildBoardPayload()).subscribe({
      next: (tasks) => {
        this.ngZone.run(() => {
          this.syncBoardTasks(tasks)
          this.snackBar.open('Orden actualizado', 'Cerrar', { duration: 1800 })
          this.cdr.detectChanges()
        })
      },
      error: () => {
        this.ngZone.run(() => {
          this.loadProject()
          this.snackBar.open('No fue posible guardar el orden del tablero', 'Cerrar', { duration: 3000 })
          this.cdr.detectChanges()
        })
      }
    })
  }

  private syncBoardTasks(tasks: Task[]): void {
    this.columns = this.columns.map((column) => ({
      ...column,
      tasks: tasks.filter((task) => task.status === column.id)
    }))

    if (this.project) {
      this.project = { ...this.project, tasks }
    }

    this.selectedTask = this.resolveSelectedTask(tasks)
  }

  private bumpCommentCount(delta: number): void {
    if (!this.selectedTask) {
      return
    }

    this.columns = this.columns.map((column) => ({
      ...column,
      tasks: column.tasks.map((task) => task.id === this.selectedTask?.id
        ? {
            ...task,
            _count: {
              comments: Math.max(0, (task._count?.comments ?? 0) + delta)
            }
          }
        : task)
    }))

    if (this.project) {
      this.project = {
        ...this.project,
        tasks: this.project.tasks?.map((task) => task.id === this.selectedTask?.id
          ? {
              ...task,
              _count: {
                comments: Math.max(0, (task._count?.comments ?? 0) + delta)
              }
            }
          : task)
      }
    }

    this.selectedTask = {
      ...this.selectedTask,
      _count: {
        comments: Math.max(0, (this.selectedTask._count?.comments ?? 0) + delta)
      }
    }
  }

  private async generateProjectPdf(data: DashboardData): Promise<void> {
    if (!this.project) {
      return
    }

    const { default: jsPDF } = await import('jspdf')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 14
    const contentWidth = pageWidth - margin * 2
    const dateLabel = new Date().toLocaleDateString('es-MX').replace(/\//g, '-')
    const generatedAt = new Date().toLocaleString('es-MX')
    const project = this.project
    const tasks = [...(project.tasks || [])]
    const getDeadlineTime = (deadline?: string) => deadline ? new Date(deadline).getTime() : Number.MAX_SAFE_INTEGER
    const getTaskCodeForPdf = (task: { publicCode?: string | null }) => task.publicCode || 'TSK-000-000'
    const getTaskPriorityForPdf = (task: { priority?: string }) => this.getPriorityLabel(task.priority || 'MEDIA')
    const completedTasks = tasks.filter((task) => task.status === 'COMPLETADA')
    const pendingTasks = tasks.filter((task) => task.status !== 'COMPLETADA')
    const upcomingTasks = [...pendingTasks]
      .sort((a, b) => getDeadlineTime(a.deadline) - getDeadlineTime(b.deadline))
      .slice(0, 6)
    const today = Date.now()
    const urgentTasks = pendingTasks.filter((task) => {
      const diff = getDeadlineTime(task.deadline) - today
      return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
    })
    const statusCounts = {
      pendiente: tasks.filter((task) => task.status === 'PENDIENTE').length,
      progreso: tasks.filter((task) => task.status === 'EN_PROGRESO').length,
      revision: tasks.filter((task) => task.status === 'EN_REVISION').length,
      completada: completedTasks.length
    }
    const priorityCounts = {
      alta: tasks.filter((task) => task.priority === 'ALTA').length,
      media: tasks.filter((task) => task.priority === 'MEDIA').length,
      baja: tasks.filter((task) => task.priority === 'BAJA').length
    }
    const memberProductivity = project.members
      .map((member) => {
        const memberTasks = tasks.filter((task) => task.assignee?.id === member.user.id)
        const memberCompleted = memberTasks.filter((task) => task.status === 'COMPLETADA').length
        const memberOverdue = memberTasks.filter(
          (task) => task.status !== 'COMPLETADA' && getDeadlineTime(task.deadline) < today
        ).length

        return {
          name: member.user.name,
          role: member.user.role,
          total: memberTasks.length,
          completed: memberCompleted,
          overdue: memberOverdue
        }
      })
      .filter((member) => member.total > 0)
      .sort((a, b) => {
        if (b.completed !== a.completed) {
          return b.completed - a.completed
        }
        return b.total - a.total
      })
    const latestAuditLogs = [...(project.auditLogs || [])]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12)
    const dominantStatus = [...data.tasksByStatus].sort((a, b) => b.value - a.value)[0]
    const dominantPriority = [...data.tasksByPriority].sort((a, b) => b.value - a.value)[0]
    const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0

    const drawFooter = (pageNumber: number, totalPages: number) => {
      pdf.setDrawColor(221, 226, 235)
      pdf.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(124, 137, 161)
      pdf.text(`NovaTech SGP | ${project.publicCode || 'PRJ-000'}`, margin, pageHeight - 5)
      pdf.text(`Pagina ${pageNumber} de ${totalPages}`, pageWidth - margin - 26, pageHeight - 5)
    }

    const drawSectionTitle = (title: string, y: number) => {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(13)
      pdf.setTextColor(22, 41, 97)
      pdf.text(title, margin, y)
      pdf.setDrawColor(46, 94, 182)
      pdf.line(margin, y + 2, margin + 48, y + 2)
    }

    const drawParagraph = (text: string, x: number, y: number, maxWidth = contentWidth, lineHeight = 5) => {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(60, 72, 88)
      const lines = pdf.splitTextToSize(text, maxWidth)
      pdf.text(lines, x, y)
      return y + lines.length * lineHeight
    }

    const drawLabelValue = (label: string, value: string, x: number, y: number) => {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8.8)
      pdf.setTextColor(100, 116, 139)
      pdf.text(label.toUpperCase(), x, y)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(22, 41, 97)
      pdf.text(value, x, y + 7)
    }

    const drawInfoRow = (label: string, value: string, x: number, y: number) => {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9.5)
      pdf.setTextColor(22, 41, 97)
      pdf.text(label, x, y)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(60, 72, 88)
      pdf.text(value, x + 28, y)
    }

    const addPageHeader = (title: string, subtitle: string) => {
      pdf.setFillColor(22, 41, 97)
      pdf.roundedRect(margin, 12, contentWidth, 18, 4, 4, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.setTextColor(255, 255, 255)
      pdf.text(title, margin + 6, 21)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.text(subtitle, margin + 6, 27)
    }

    pdf.setFillColor(22, 41, 97)
    pdf.rect(0, 0, pageWidth, 54, 'F')
    pdf.setFillColor(46, 94, 182)
    pdf.rect(0, 54, pageWidth, 10, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(24)
    pdf.text('NovaTech SGP', margin, 24)
    pdf.setFontSize(18)
    pdf.text('Reporte ejecutivo del proyecto', margin, 36)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.text(`Generado el ${generatedAt}`, margin, 45)

    pdf.setFillColor(255, 255, 255)
    pdf.roundedRect(margin, 74, contentWidth, 42, 5, 5, 'F')
    pdf.setDrawColor(221, 226, 235)
    pdf.roundedRect(margin, 74, contentWidth, 42, 5, 5, 'S')
    pdf.setTextColor(22, 41, 97)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.text(project.name, margin + 6, 89)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    pdf.setTextColor(92, 107, 132)
    pdf.text(`${project.publicCode || 'PRJ-000'} | Lider: ${project.leader.name}`, margin + 6, 98)
    pdf.text(
      `Estado: ${project.status} | Inicio: ${new Date(project.startDate).toLocaleDateString('es-MX')} | Cierre: ${new Date(project.deadline).toLocaleDateString('es-MX')}`,
      margin + 6,
      106
    )

    let y = 130
    drawSectionTitle('1. Resumen ejecutivo', y)
    y += 9
    y = drawParagraph(
      `El proyecto mantiene un avance general de ${data.globalProgress.percentage}% y una tasa de cierre de ${completionRate}%. El estado predominante es ${dominantStatus?.name || 'Sin datos'}, la prioridad con mayor presencia es ${dominantPriority?.name || 'Sin datos'} y actualmente se reportan ${data.overdueTasks.length} tarea(s) vencida(s) junto con ${urgentTasks.length} actividad(es) proximas a vencer en los siguientes siete dias.`,
      margin,
      y
    )

    const summaryCardWidth = (contentWidth - 8) / 3
    const summaryY = y + 6
    ;[
      { title: 'Avance', value: `${data.globalProgress.percentage}%`, subtitle: `${completedTasks.length} de ${tasks.length} tareas`, tone: [46, 94, 182] as [number, number, number] },
      { title: 'Riesgo por vencimiento', value: `${data.overdueTasks.length}`, subtitle: 'Tareas fuera de fecha', tone: (data.overdueTasks.length > 0 ? [214, 58, 58] : [39, 174, 68]) as [number, number, number] },
      { title: 'Trazabilidad', value: `${project.auditLogs?.length || 0}`, subtitle: 'Eventos de auditoria', tone: [245, 158, 11] as [number, number, number] }
    ].forEach((card, index) => {
      const x = margin + index * (summaryCardWidth + 4)
      pdf.setFillColor(255, 255, 255)
      pdf.setDrawColor(221, 226, 235)
      pdf.roundedRect(x, summaryY, summaryCardWidth, 29, 4, 4, 'FD')
      pdf.setFillColor(...card.tone)
      pdf.roundedRect(x, summaryY, summaryCardWidth, 4, 4, 4, 'F')
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8.8)
      pdf.setTextColor(100, 116, 139)
      pdf.text(card.title, x + 4, summaryY + 10.5)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(18)
      pdf.setTextColor(22, 41, 97)
      pdf.text(card.value, x + 4, summaryY + 20)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(124, 137, 161)
      pdf.text(card.subtitle, x + 4, summaryY + 26)
    })

    y = summaryY + 40
    drawSectionTitle('2. Ficha y contexto operativo', y)
    y += 10

    pdf.setFillColor(248, 250, 252)
    pdf.roundedRect(margin, y - 4, contentWidth, 38, 4, 4, 'F')
    pdf.setDrawColor(221, 226, 235)
    pdf.roundedRect(margin, y - 4, contentWidth, 38, 4, 4, 'S')
    drawLabelValue('Codigo', project.publicCode || 'PRJ-000', margin + 5, y + 4)
    drawLabelValue('Estado', project.status, margin + 55, y + 4)
    drawLabelValue('Lider', project.leader.name, margin + 105, y + 4)
    drawLabelValue('Miembros', `${project.members.length}`, margin + 155, y + 4)
    drawLabelValue('Inicio', new Date(project.startDate).toLocaleDateString('es-MX'), margin + 5, y + 22)
    drawLabelValue('Fecha limite', new Date(project.deadline).toLocaleDateString('es-MX'), margin + 55, y + 22)
    drawLabelValue('Comentarios', `${tasks.reduce((total, task) => total + (task._count?.comments ?? 0), 0)}`, margin + 105, y + 22)
    drawLabelValue('Urgentes', `${urgentTasks.length}`, margin + 155, y + 22)
    y += 42
    y = drawParagraph(project.description || 'Proyecto sin descripcion adicional registrada.', margin, y)

    pdf.addPage()
    addPageHeader('Salud operativa', `${project.publicCode || 'PRJ-000'} | ${project.name}`)
    y = 42
    drawSectionTitle('3. Distribucion por estado y prioridad', y)
    y += 10

    const distributionRows = [
      { label: 'Pendientes', value: statusCounts.pendiente, detail: 'Tareas aun no iniciadas' },
      { label: 'En progreso', value: statusCounts.progreso, detail: 'Trabajo actualmente en ejecucion' },
      { label: 'En revision', value: statusCounts.revision, detail: 'Pendientes de aprobacion' },
      { label: 'Completadas', value: statusCounts.completada, detail: 'Trabajo finalizado' },
      { label: 'Prioridad alta', value: priorityCounts.alta, detail: 'Carga critica del proyecto' },
      { label: 'Prioridad media', value: priorityCounts.media, detail: 'Carga operativa estandar' },
      { label: 'Prioridad baja', value: priorityCounts.baja, detail: 'Carga diferible o menor urgencia' }
    ]

    distributionRows.forEach((row) => {
      pdf.setDrawColor(232, 236, 242)
      pdf.line(margin, y + 6, margin + contentWidth, y + 6)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9.5)
      pdf.setTextColor(22, 41, 97)
      pdf.text(row.label, margin, y)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8.5)
      pdf.setTextColor(124, 137, 161)
      pdf.text(row.detail, margin, y + 4)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(13)
      pdf.setTextColor(22, 41, 97)
      pdf.text(String(row.value), pageWidth - margin - 4, y + 1, { align: 'right' })
      y += 12
    })

    y += 6
    drawSectionTitle('4. Productividad por miembro', y)
    y += 10

    if (memberProductivity.length === 0) {
      y = drawParagraph('No hay tareas asignadas a miembros del proyecto para calcular productividad.', margin, y)
    } else {
      memberProductivity.slice(0, 8).forEach((member) => {
        if (y > pageHeight - 22) {
          pdf.addPage()
          addPageHeader('Salud operativa', `${project.publicCode || 'PRJ-000'} | ${project.name}`)
          y = 42
        }

        pdf.setFillColor(248, 250, 252)
        pdf.roundedRect(margin, y - 4, contentWidth, 18, 4, 4, 'F')
        pdf.setDrawColor(221, 226, 235)
        pdf.roundedRect(margin, y - 4, contentWidth, 18, 4, 4, 'S')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9.8)
        pdf.setTextColor(22, 41, 97)
        pdf.text(member.name, margin + 4, y + 1)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8.2)
        pdf.setTextColor(124, 137, 161)
        pdf.text(member.role, margin + 4, y + 6)
        pdf.text(`Total: ${member.total}`, margin + 58, y + 3)
        pdf.text(`Completadas: ${member.completed}`, margin + 92, y + 3)
        pdf.text(`Vencidas: ${member.overdue}`, margin + 138, y + 3)
        pdf.text(
          `${member.total > 0 ? Math.round((member.completed / member.total) * 100) : 0}% de cumplimiento`,
          pageWidth - margin - 4,
          y + 3,
          { align: 'right' }
        )
        y += 22
      })
    }

    pdf.addPage()
    addPageHeader('Seguimiento de tareas', `${project.publicCode || 'PRJ-000'} | ${project.name}`)
    y = 42
    drawSectionTitle('5. Tareas proximas a vencer', y)
    y += 10

    if (upcomingTasks.length === 0) {
      y = drawParagraph('No hay tareas pendientes registradas con fecha limite proxima.', margin, y)
    } else {
      upcomingTasks.forEach((task) => {
        pdf.setFillColor(255, 255, 255)
        pdf.setDrawColor(221, 226, 235)
        pdf.roundedRect(margin, y - 4, contentWidth, 20, 4, 4, 'FD')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9.6)
        pdf.setTextColor(22, 41, 97)
        pdf.text(`${getTaskCodeForPdf(task)} | ${task.title}`, margin + 4, y + 1)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8.5)
        pdf.setTextColor(60, 72, 88)
        pdf.text(`Estado: ${task.status}`, margin + 4, y + 7)
        pdf.text(`Responsable: ${task.assignee?.name || 'Sin asignar'}`, margin + 48, y + 7)
        pdf.text(`Fecha: ${task.deadline ? new Date(task.deadline).toLocaleDateString('es-MX') : 'Sin fecha'}`, margin + 112, y + 7)
        pdf.text(`Prioridad: ${getTaskPriorityForPdf(task)}`, margin + 156, y + 7)
        y += 24
      })
    }

    drawSectionTitle('6. Tareas vencidas y riesgos', y + 2)
    y += 12

    if (data.overdueTasks.length === 0) {
      y = drawParagraph('No hay tareas vencidas registradas para este proyecto. El nivel de riesgo por fecha es bajo en el corte actual.', margin, y)
    } else {
      data.overdueTasks.slice(0, 8).forEach((task) => {
        if (y > pageHeight - 22) {
          pdf.addPage()
          addPageHeader('Seguimiento de tareas', `${project.publicCode || 'PRJ-000'} | ${project.name}`)
          y = 42
        }

        pdf.setFillColor(252, 245, 245)
        pdf.roundedRect(margin, y - 4, contentWidth, 19, 4, 4, 'F')
        pdf.setDrawColor(238, 213, 213)
        pdf.roundedRect(margin, y - 4, contentWidth, 19, 4, 4, 'S')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9.5)
        pdf.setTextColor(170, 45, 45)
        pdf.text(task.title, margin + 4, y + 1)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8.4)
        pdf.text(`Responsable: ${task.assignee?.name || 'Sin asignar'}`, margin + 4, y + 7)
        pdf.text(`Vencio: ${new Date(task.deadline).toLocaleDateString('es-MX')}`, margin + 78, y + 7)
        pdf.text(`Prioridad: ${this.getPriorityLabel(task.priority)}`, margin + 136, y + 7)
        y += 22
      })
    }

    pdf.addPage()
    addPageHeader('Trazabilidad y control', `${project.publicCode || 'PRJ-000'} | ${project.name}`)
    y = 42
    drawSectionTitle('7. Auditoria basica reciente', y)
    y += 10

    if (latestAuditLogs.length === 0) {
      y = drawParagraph('No hay movimientos de auditoria registrados para este proyecto.', margin, y)
    } else {
      latestAuditLogs.forEach((log) => {
        if (y > pageHeight - 24) {
          pdf.addPage()
          addPageHeader('Trazabilidad y control', `${project.publicCode || 'PRJ-000'} | ${project.name}`)
          y = 42
        }

        pdf.setDrawColor(232, 236, 242)
        pdf.line(margin, y + 8, margin + contentWidth, y + 8)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9.5)
        pdf.setTextColor(22, 41, 97)
        pdf.text(log.actor.name, margin, y)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8.4)
        pdf.setTextColor(124, 137, 161)
        pdf.text(`${log.actor.role} | ${this.getAuditActionLabel(log.action)}`, margin, y + 5)
        pdf.text(this.formatAuditTimestamp(log.createdAt), pageWidth - margin, y, { align: 'right' })
        const lines = pdf.splitTextToSize(log.summary, contentWidth)
        pdf.setTextColor(60, 72, 88)
        pdf.text(lines, margin, y + 11)
        y += 14 + lines.length * 4.2
      })
    }

    y += 4
    if (y <= pageHeight - 28) {
      drawSectionTitle('8. Cierre del informe', y)
      y += 10
      drawParagraph(
        data.overdueTasks.length > 0
          ? 'Se recomienda priorizar la regularizacion de tareas vencidas, revisar la asignacion de responsables y sostener seguimiento semanal sobre las actividades de prioridad alta para reducir desviaciones del cronograma.'
          : 'El proyecto mantiene una operacion estable en este corte. Se recomienda sostener el ritmo de cierre, vigilar las tareas proximas a vencer y mantener la actualizacion continua de comentarios y auditoria.',
        margin,
        y
      )
    }

    const totalPages = pdf.getNumberOfPages()
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      pdf.setPage(pageNumber)
      drawFooter(pageNumber, totalPages)
    }

    const safeProjectName = project.name
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_]/g, '')

    pdf.save(`Reporte_${safeProjectName || 'Proyecto'}_${dateLabel}.pdf`)
  }
}
