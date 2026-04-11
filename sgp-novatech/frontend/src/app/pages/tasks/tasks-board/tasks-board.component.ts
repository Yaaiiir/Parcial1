import { CommonModule } from '@angular/common'
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop'
import { ActivatedRoute, Router } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSelectModule } from '@angular/material/select'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'
import { AuthService } from '../../../services/auth'
import { Project, ProjectsService } from '../../../services/projects'
import { Task, TaskComment, TaskStatus, TasksService } from '../../../services/tasks'
import { TaskFormComponent } from '../task-form/task-form.component'

type BoardColumn = {
  id: TaskStatus
  title: string
  tone: string
  tasks: Task[]
}

@Component({
  selector: 'app-tasks-board',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CdkDropList,
    CdkDrag,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './tasks-board.component.html',
  styleUrl: './tasks-board.component.scss'
})
export class TasksBoardComponent implements OnInit {
  loading = true
  deletingTask = false
  projects: Project[] = []
  selectedProjectId = ''
  selectedProject: Project | null = null
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
    private projectsService: ProjectsService,
    private tasksService: TasksService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.projectsService.getAll().subscribe({
      next: (projects) => {
        this.ngZone.run(() => {
          this.projects = projects
          const routeProjectId = this.route.snapshot.paramMap.get('id') || ''
          this.selectedProjectId = projects.some((project) => project.id === routeProjectId)
            ? routeProjectId
            : (projects[0]?.id || '')
          if (this.selectedProjectId) {
            this.loadBoard()
          } else {
            this.loading = false
          }
          this.cdr.detectChanges()
        })
      },
      error: () => {
        this.loading = false
        this.snackBar.open('No fue posible cargar los proyectos', 'Cerrar', { duration: 3000 })
      }
    })
  }

  onProjectChange(): void {
    if (!this.selectedProjectId) {
      return
    }

    this.router.navigate(['/tasks', this.selectedProjectId])
    this.loadBoard()
  }

  loadBoard(): void {
    if (!this.selectedProjectId) {
      this.loading = false
      return
    }

    this.loading = true

    this.projectsService.getById(this.selectedProjectId).subscribe({
      next: (project) => {
        this.selectedProject = project
        this.tasksService.getByProject(this.selectedProjectId).subscribe({
          next: (tasks) => {
            this.ngZone.run(() => {
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
            this.loading = false
            this.snackBar.open('No fue posible cargar las tareas', 'Cerrar', { duration: 3000 })
          }
        })
      },
      error: () => {
        this.loading = false
        this.snackBar.open('No fue posible cargar el proyecto seleccionado', 'Cerrar', { duration: 3000 })
      }
    })
  }

  drop(event: CdkDragDrop<Task[]>, targetStatus: TaskStatus): void {
    if (!this.selectedProject) {
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

    this.tasksService.reorder(this.selectedProject.id, this.buildBoardPayload()).subscribe({
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
    if (!this.selectedProject) {
      return
    }

    const members = this.getMemberOptions()

    const ref = this.dialog.open(TaskFormComponent, {
      width: '560px',
      data: {
        projectId: this.selectedProject.id,
        members
      }
    })

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadBoard()
        this.snackBar.open('Tarea creada correctamente', 'Cerrar', { duration: 2500 })
      }
    })
  }

  openEditDialog(task: Task): void {
    if (!this.selectedProject) {
      return
    }

    const members = this.getMemberOptions()

    const ref = this.dialog.open(TaskFormComponent, {
      width: '560px',
      data: {
        projectId: this.selectedProject.id,
        members,
        task
      }
    })

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadBoard()
        this.snackBar.open('Tarea actualizada correctamente', 'Cerrar', { duration: 2500 })
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

    this.tasksService.delete(this.selectedTask.id).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.deletingTask = false
          this.loadBoard()
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

  canManageTasks(): boolean {
    return this.authService.hasRole('GERENTE', 'ADMIN', 'LIDER') && this.selectedProject?.status !== 'CERRADO'
  }

  canDragTask(task: Task): boolean {
    if (!this.selectedProject || this.selectedProject.status === 'CERRADO') {
      return false
    }

    if (this.authService.hasRole('GERENTE', 'ADMIN', 'LIDER')) {
      return true
    }

    return task.assigneeId === this.authService.currentUser?.id
  }

  getBoardAlert(): { tone: 'info' | 'warning' | 'danger'; text: string } | null {
    if (!this.selectedProject) {
      return null
    }

    const overdue = this.columns
      .flatMap((column) => column.tasks)
      .filter((task) => task.status !== 'COMPLETADA' && new Date(task.deadline).getTime() < Date.now()).length

    if (this.selectedProject.status === 'CERRADO') {
      return { tone: 'info', text: 'Este proyecto esta cerrado. El tablero esta disponible solo para consulta.' }
    }

    if (this.selectedProject.status === 'PAUSADO') {
      return { tone: 'warning', text: 'Este proyecto esta pausado. Evita crear nuevas tareas hasta reactivarlo.' }
    }

    if (overdue > 0) {
      return { tone: 'danger', text: `Hay ${overdue} tarea(s) vencida(s) que requieren atencion.` }
    }

    return null
  }

  private getMemberOptions(): { id: string; name: string; role: string }[] {
    if (!this.selectedProject) {
      return []
    }

    const members = this.selectedProject.members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      role: member.user.role
    }))
    return members
  }

  getConnectedLists(currentId: TaskStatus): string[] {
    return this.columns.filter((column) => column.id !== currentId).map((column) => column.id)
  }

  getPriorityClass(task: Task): string {
    return `priority-${task.priority.toLowerCase()}`
  }

  isUrgent(task: Task): boolean {
    return new Date(task.deadline).getTime() < Date.now() + 2 * 24 * 60 * 60 * 1000
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

  private buildBoardPayload() {
    return this.columns.map((column) => ({
      status: column.id,
      taskIds: column.tasks.map((task) => task.id)
    }))
  }

  private persistBoardOrder(): void {
    if (!this.selectedProject) {
      return
    }

    this.tasksService.reorder(this.selectedProject.id, this.buildBoardPayload()).subscribe({
      next: (tasks) => {
        this.ngZone.run(() => {
          this.syncBoardTasks(tasks)
          this.snackBar.open('Orden actualizado', 'Cerrar', { duration: 1800 })
          this.cdr.detectChanges()
        })
      },
      error: () => {
        this.ngZone.run(() => {
          this.loadBoard()
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

    this.selectedTask = {
      ...this.selectedTask,
      _count: {
        comments: Math.max(0, (this.selectedTask._count?.comments ?? 0) + delta)
      }
    }
  }
}
