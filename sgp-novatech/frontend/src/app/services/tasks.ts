import { Injectable } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../environments/environment'

export type TaskStatus = 'PENDIENTE' | 'EN_PROGRESO' | 'EN_REVISION' | 'COMPLETADA'
export type TaskPriority = 'ALTA' | 'MEDIA' | 'BAJA'
export type TaskDueRange = 'TODAS' | 'HOY' | 'ESTA_SEMANA' | 'VENCIDAS'

export interface Task {
  id: string
  publicCode?: string | null
  title: string
  description?: string | null
  labels?: string | null
  status: TaskStatus
  priority: TaskPriority
  deadline: string
  completedAt?: string | null
  createdAt: string
  sortOrder?: number
  projectId: string
  assigneeId?: string | null
  assignee?: {
    id: string
    name: string
    email: string
    role: string
  } | null
  project?: {
    id: string
    publicCode?: string | null
    name: string
    status: string
  }
  _count?: {
    comments: number
  }
}

export interface TaskComment {
  id: string
  content: string
  createdAt: string
  deletedAt?: string | null
  author: {
    id: string
    name: string
    email: string
    role: string
  }
}

export interface CreateTaskDto {
  title: string
  description?: string
  labels?: string
  priority?: TaskPriority
  deadline?: string
  assigneeId?: string
}

export interface MyTasksFilters {
  search?: string
  status?: TaskStatus | ''
  priority?: TaskPriority | ''
  projectId?: string
  assigneeId?: string
  dueRange?: TaskDueRange
}

export interface ReorderTasksColumnDto {
  status: TaskStatus
  taskIds: string[]
}

@Injectable({ providedIn: 'root' })
export class TasksService {
  private api = environment.apiUrl

  constructor(private http: HttpClient) {}

  getByProject(projectId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.api}/projects/${projectId}/tasks`)
  }

  getMine(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.api}/tasks/my`)
  }

  getList(filters: MyTasksFilters = {}): Observable<Task[]> {
    let params = new HttpParams()

    if (filters.search?.trim()) {
      params = params.set('search', filters.search.trim())
    }
    if (filters.status) {
      params = params.set('status', filters.status)
    }
    if (filters.priority) {
      params = params.set('priority', filters.priority)
    }
    if (filters.projectId) {
      params = params.set('projectId', filters.projectId)
    }
    if (filters.assigneeId) {
      params = params.set('assigneeId', filters.assigneeId)
    }
    if (filters.dueRange && filters.dueRange !== 'TODAS') {
      params = params.set('dueRange', filters.dueRange)
    }

    return this.http.get<Task[]>(`${this.api}/tasks`, { params })
  }

  create(projectId: string, data: CreateTaskDto): Observable<Task> {
    return this.http.post<Task>(`${this.api}/projects/${projectId}/tasks`, data)
  }

  reorder(projectId: string, columns: ReorderTasksColumnDto[]): Observable<Task[]> {
    return this.http.patch<Task[]>(`${this.api}/projects/${projectId}/tasks/reorder`, { columns })
  }

  update(taskId: string, data: Partial<CreateTaskDto & { status: TaskStatus }>): Observable<Task> {
    return this.http.put<Task>(`${this.api}/tasks/${taskId}`, data)
  }

  updateStatus(taskId: string, status: TaskStatus): Observable<Task> {
    return this.http.patch<Task>(`${this.api}/tasks/${taskId}/status`, { status })
  }

  delete(taskId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/tasks/${taskId}`)
  }

  getComments(taskId: string): Observable<TaskComment[]> {
    return this.http.get<TaskComment[]>(`${this.api}/tasks/${taskId}/comments`)
  }

  createComment(taskId: string, content: string): Observable<TaskComment> {
    return this.http.post<TaskComment>(`${this.api}/tasks/${taskId}/comments`, { content })
  }

  updateComment(commentId: string, content: string): Observable<TaskComment> {
    return this.http.put<TaskComment>(`${this.api}/tasks/comments/${commentId}`, { content })
  }

  deleteComment(commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/tasks/comments/${commentId}`)
  }
}
