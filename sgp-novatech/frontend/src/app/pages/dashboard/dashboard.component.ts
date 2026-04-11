import { CommonModule } from '@angular/common'
import { ChangeDetectorRef, Component, NgZone } from '@angular/core'
import { Router } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { AuthService } from '../../services/auth'
import { Project, ProjectsService } from '../../services/projects'
import { Task, TasksService } from '../../services/tasks'

type UpcomingTaskView = {
  id: string
  name: string
  project: string
  due: string
  priority: 'alta' | 'media' | 'baja'
}

type ExecutiveProjectCard = {
  id: string
  code: string
  name: string
  leader: string
  status: Project['status']
  progress: number
  completedTasks: number
  totalTasks: number
  deadlineLabel: string
  timelineLabel: string
  alertLabel: string
  alertTone: 'critical' | 'warning' | 'healthy'
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  projects: Project[] = []
  userTasks: Task[] = []
  readonly todayLabel = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date())
  private readonly dateFormatter = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short'
  })

  constructor(
    public authService: AuthService,
    private projectsService: ProjectsService,
    private tasksService: TasksService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.projectsService.getAll().subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.projects = data
          this.cdr.detectChanges()
        })
      }
    })

    this.tasksService.getMine().subscribe({
      next: (tasks) => {
        this.ngZone.run(() => {
          this.userTasks = tasks
          this.cdr.detectChanges()
        })
      }
    })
  }

  goToProjects(): void {
    this.router.navigate(['/projects'])
  }

  goToTasks(): void {
    this.router.navigate(['/tasks'])
  }

  get completedTasks(): number {
    return this.projects.reduce((total, project) => total + project.completedTasks, 0)
  }

  get pendingTasks(): number {
    return this.projects.reduce((total, project) => total + (project.totalTasks - project.completedTasks), 0)
  }

  get activeProjectsCount(): number {
    return this.projects.filter((project) => project.status === 'ACTIVO').length
  }

  get overdueTasks(): number {
    return this.userTasks.filter((task) => new Date(task.deadline).getTime() < Date.now()).length
  }

  get expiringProjectsCount(): number {
    return this.projects.filter((project) => this.getDeadlineDiffInDays(project.deadline) >= 0 && this.getDeadlineDiffInDays(project.deadline) <= 7).length
  }

  get portfolioHealthLabel(): string {
    if (this.projects.length === 0) {
      return 'Sin proyectos cargados'
    }

    if (this.overdueTasks > 0) {
      return 'Requiere atencion inmediata'
    }

    if (this.expiringProjectsCount > 0) {
      return 'Seguimiento prioritario'
    }

    return 'Operacion estable'
  }

  get portfolioHealthTone(): 'critical' | 'warning' | 'healthy' {
    if (this.overdueTasks > 0) {
      return 'critical'
    }

    if (this.expiringProjectsCount > 0) {
      return 'warning'
    }

    return 'healthy'
  }

  get firstName(): string {
    const name = this.authService.currentUser?.name?.trim()
    return name ? name.split(' ')[0] : 'Laura'
  }

  get upcomingTasks(): UpcomingTaskView[] {
    return this.userTasks.slice(0, 4).map((task) => ({
      id: task.id,
      name: task.title,
      project: task.project?.name || 'Proyecto sin nombre',
      due: this.dateFormatter.format(new Date(task.deadline)),
      priority: this.mapPriority(task.priority)
    }))
  }

  get executiveProjects(): ExecutiveProjectCard[] {
    return [...this.projects]
      .sort((left, right) => this.getProjectSortWeight(right) - this.getProjectSortWeight(left))
      .slice(0, 6)
      .map((project) => {
        const daysLeft = this.getDeadlineDiffInDays(project.deadline)

        return {
          id: project.id,
          code: project.publicCode || 'PRJ-000',
          name: project.name,
          leader: project.leader.name,
          status: project.status,
          progress: project.progress,
          completedTasks: project.completedTasks,
          totalTasks: project.totalTasks,
          deadlineLabel: this.dateFormatter.format(new Date(project.deadline)),
          timelineLabel: this.getTimelineLabel(daysLeft),
          alertLabel: this.getProjectAlertLabel(project, daysLeft),
          alertTone: this.getProjectAlertTone(project, daysLeft)
        }
      })
  }

  goToProject(projectId: string): void {
    this.router.navigate(['/projects', projectId])
  }

  statusLabel(status: Project['status']): string {
    if (status === 'ACTIVO') {
      return 'Activo'
    }

    if (status === 'PAUSADO') {
      return 'Pausado'
    }

    return 'Cerrado'
  }

  private mapPriority(priority: Task['priority']): 'alta' | 'media' | 'baja' {
    const map: Record<Task['priority'], 'alta' | 'media' | 'baja'> = {
      ALTA: 'alta',
      MEDIA: 'media',
      BAJA: 'baja'
    }
    return map[priority]
  }

  private getDeadlineDiffInDays(deadline: string): number {
    const millisecondsPerDay = 1000 * 60 * 60 * 24
    return Math.ceil((new Date(deadline).getTime() - Date.now()) / millisecondsPerDay)
  }

  private getProjectSortWeight(project: Project): number {
    const daysLeft = this.getDeadlineDiffInDays(project.deadline)
    const toneWeight = this.getProjectAlertTone(project, daysLeft) === 'critical'
      ? 1000
      : this.getProjectAlertTone(project, daysLeft) === 'warning'
        ? 500
        : 100

    return toneWeight - daysLeft + (100 - project.progress)
  }

  private getTimelineLabel(daysLeft: number): string {
    if (daysLeft < 0) {
      return `Vencido hace ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) === 1 ? '' : 's'}`
    }

    if (daysLeft === 0) {
      return 'Vence hoy'
    }

    return `Vence en ${daysLeft} dia${daysLeft === 1 ? '' : 's'}`
  }

  private getProjectAlertTone(project: Project, daysLeft: number): 'critical' | 'warning' | 'healthy' {
    if (daysLeft < 0 || (daysLeft <= 3 && project.progress < 100)) {
      return 'critical'
    }

    if (daysLeft <= 7 || project.progress < 50) {
      return 'warning'
    }

    return 'healthy'
  }

  private getProjectAlertLabel(project: Project, daysLeft: number): string {
    if (daysLeft < 0) {
      return 'Vencimiento excedido'
    }

    if (daysLeft <= 3 && project.progress < 100) {
      return 'Cierre urgente'
    }

    if (daysLeft <= 7) {
      return 'Seguimiento cercano'
    }

    if (project.progress < 50) {
      return 'Avance por acelerar'
    }

    return 'En curso sin bloqueos'
  }
}
