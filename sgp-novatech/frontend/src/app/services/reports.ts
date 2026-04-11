import { Injectable } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../environments/environment'

export interface DashboardMetric {
  total: number
  completed: number
  percentage: number
}

export interface NamedValue {
  name: string
  value: number
}

export interface ProductivityItem {
  name: string
  completed: number
  total: number
  percentage: number
}

export interface OverdueTask {
  id: string
  title: string
  deadline: string
  priority: string
  project: { id: string; name: string }
  assignee: { id: string; name: string } | null
}

export interface DashboardData {
  globalProgress: DashboardMetric
  tasksByStatus: NamedValue[]
  tasksByPriority: NamedValue[]
  overdueTasks: OverdueTask[]
  productivityByMember: ProductivityItem[]
  portfolioSummary: PortfolioSummary | null
}

export interface PortfolioProjectSummary {
  id: string
  publicCode?: string | null
  name: string
  leader: { id: string; name: string; email: string }
  deadline: string
  progress: number
  totalTasks: number
  completedTasks: number
  openTasks: number
  overdueTasks: number
  overdueRate: number
  daysRemaining: number
  highPriorityTasks: number
  hasDelayAlert: boolean
}

export interface PortfolioSummary {
  activeProjects: number
  atRiskProjects: number
  onTrackProjects: number
  averageProgress: number
  projects: PortfolioProjectSummary[]
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private api = environment.apiUrl

  constructor(private http: HttpClient) {}

  getDashboard(projectId?: string): Observable<DashboardData> {
    let params = new HttpParams()

    if (projectId) {
      params = params.set('projectId', projectId)
    }

    return this.http.get<DashboardData>(`${this.api}/reports/dashboard`, { params })
  }

  getOverdue(projectId?: string): Observable<OverdueTask[]> {
    let params = new HttpParams()

    if (projectId) {
      params = params.set('projectId', projectId)
    }

    return this.http.get<OverdueTask[]>(`${this.api}/reports/overdue`, { params })
  }
}
