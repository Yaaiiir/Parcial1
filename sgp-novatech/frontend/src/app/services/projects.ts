import { Injectable } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../environments/environment'

export interface Project {
  id: string
  publicCode?: string | null
  name: string
  description?: string
  startDate: string
  deadline: string
  status: 'ACTIVO' | 'PAUSADO' | 'CERRADO'
  creatorId: string
  leaderId: string
  leader: { id: string; name: string; email: string }
  creator: { id: string; name: string }
  members: { userId: string; user: { id: string; name: string; role: string } }[]
  tasks: {
    id: string
    publicCode?: string | null
    title: string
    description?: string | null
    status: string
    priority?: string
    deadline?: string
    assignee?: { id: string; name: string } | null
    comments?: { id: string }[]
    _count?: { comments: number }
  }[]
  progress: number
  totalTasks: number
  completedTasks: number
  createdAt: string
  auditLogs?: ProjectAuditLog[]
}

export interface ProjectAuditLog {
  id: string
  action: string
  summary: string
  createdAt: string
  actor: {
    id: string
    name: string
    email: string
    role: string
  }
}

export interface CreateProjectDto {
  name: string
  description?: string
  startDate: string
  deadline: string
  leaderId: string
}

export interface ProjectsPageParams {
  search?: string
  status?: string
  leaderId?: string
  deadlineFrom?: string
  deadlineTo?: string
  page?: number
  pageSize?: number
}

export interface ProjectsPageResponse {
  items: Project[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private api = `${environment.apiUrl}/projects`

  constructor(private http: HttpClient) {}

  getAll(status?: string): Observable<Project[]> {
    let params = new HttpParams()
    if (status) {
      params = params.set('status', status)
    }

    return this.http.get<Project[]>(this.api, { params })
  }

  getPage(paramsInput: ProjectsPageParams = {}): Observable<ProjectsPageResponse> {
    let params = new HttpParams()

    if (paramsInput.search?.trim()) {
      params = params.set('search', paramsInput.search.trim())
    }
    if (paramsInput.status && paramsInput.status !== 'TODOS') {
      params = params.set('status', paramsInput.status)
    }
    if (paramsInput.leaderId) {
      params = params.set('leaderId', paramsInput.leaderId)
    }
    if (paramsInput.deadlineFrom) {
      params = params.set('deadlineFrom', paramsInput.deadlineFrom)
    }
    if (paramsInput.deadlineTo) {
      params = params.set('deadlineTo', paramsInput.deadlineTo)
    }

    params = params.set('page', String(paramsInput.page || 1))
    params = params.set('pageSize', String(paramsInput.pageSize || 10))

    return this.http.get<ProjectsPageResponse>(this.api, { params })
  }

  getById(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.api}/${id}`)
  }

  create(data: CreateProjectDto): Observable<Project> {
    return this.http.post<Project>(this.api, data)
  }

  update(id: string, data: Partial<CreateProjectDto>): Observable<Project> {
    return this.http.put<Project>(`${this.api}/${id}`, data)
  }

  changeStatus(id: string, status: string): Observable<Project> {
    return this.http.patch<Project>(`${this.api}/${id}/status`, { status })
  }
}
