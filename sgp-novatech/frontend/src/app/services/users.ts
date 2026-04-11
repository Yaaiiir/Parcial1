import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../environments/environment'

export interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'GERENTE' | 'LIDER' | 'EMPLEADO'
  isActive: boolean
  createdAt?: string
}

export interface CreateUserDto {
  name: string
  email: string
  password?: string
  role: User['role']
}

export interface CreateUserResponse extends User {
  temporaryPassword: string
}

export interface UpdateUserDto {
  name: string
  email: string
  role: User['role']
  isActive?: boolean
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private api = `${environment.apiUrl}/users`

  constructor(private http: HttpClient) {}

  getAll(includeInactive = false): Observable<User[]> {
    const suffix = includeInactive ? '?includeInactive=true' : ''
    return this.http.get<User[]>(`${this.api}${suffix}`)
  }

  getLeaders(): Observable<User[]> {
    return this.http.get<User[]>(`${this.api}?role=LIDER`)
  }

  create(data: CreateUserDto): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(this.api, data)
  }

  update(id: string, data: UpdateUserDto): Observable<User> {
    return this.http.put<User>(`${this.api}/${id}`, data)
  }

  updateStatus(id: string, isActive: boolean): Observable<User> {
    return this.http.patch<User>(`${this.api}/${id}/status`, { isActive })
  }
}
