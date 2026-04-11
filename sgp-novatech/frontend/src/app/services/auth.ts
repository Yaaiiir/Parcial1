import { DOCUMENT } from '@angular/common'
import { Injectable, Inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Router } from '@angular/router'
import { BehaviorSubject, Observable, tap } from 'rxjs'
import { environment } from '../../environments/environment'

export interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'GERENTE' | 'LIDER' | 'EMPLEADO'
  isActive?: boolean
  createdAt?: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface ChangePasswordDto {
  currentPassword: string
  newPassword: string
}

interface JwtPayload {
  exp?: number
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl
  private readonly tokenKey = 'sgp_token'
  private readonly userKey = 'sgp_user'
  private readonly noticeKey = 'sgp_session_notice'
  private readonly lastActivityKey = 'sgp_last_activity'
  private readonly inactivityLimitMs = 8 * 60 * 60 * 1000
  private readonly sessionCheckMs = 30 * 1000

  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage())
  currentUser$ = this.currentUserSubject.asObservable()

  private activityListenersBound = false
  private inactivityIntervalId: number | null = null
  private lastActivityUpdate = 0

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.ensureSessionIntegrity(false)
    this.initSessionTracking()
  }

  private get windowRef(): Window | null {
    return this.document.defaultView
  }

  private getUserFromStorage(): User | null {
    const user = localStorage.getItem(this.userKey)
    return user ? JSON.parse(user) : null
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value
  }

  get isLoggedIn(): boolean {
    return this.hasValidSession()
  }

  get token(): string | null {
    const token = localStorage.getItem(this.tokenKey)
    if (!token) {
      return null
    }

    if (this.isTokenExpired(token)) {
      this.logout('Tu sesion expiro. Vuelve a iniciar sesion.')
      return null
    }

    return token
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap((response) => {
        this.persistSession(response.token, response.user)
      })
    )
  }

  me(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`).pipe(
      tap((user) => this.setCurrentUser(user))
    )
  }

  changePassword(data: ChangePasswordDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/change-password`, data)
  }

  setCurrentUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user))
    this.currentUserSubject.next(user)
    this.markActivity()
  }

  persistSession(token: string, user: User): void {
    localStorage.setItem(this.tokenKey, token)
    localStorage.setItem(this.userKey, JSON.stringify(user))
    this.currentUserSubject.next(user)
    this.markActivity(true)
  }

  logout(message?: string): void {
    localStorage.removeItem(this.tokenKey)
    localStorage.removeItem(this.userKey)
    localStorage.removeItem(this.lastActivityKey)
    this.currentUserSubject.next(null)

    if (message) {
      sessionStorage.setItem(this.noticeKey, message)
    }

    if (this.router.url !== '/login') {
      this.router.navigate(['/login'])
      return
    }

    this.router.navigate([], { queryParams: {} })
  }

  consumeSessionNotice(): string {
    const notice = sessionStorage.getItem(this.noticeKey) || ''
    sessionStorage.removeItem(this.noticeKey)
    return notice
  }

  hasRole(...roles: string[]): boolean {
    return !!this.currentUser && roles.includes(this.currentUser.role)
  }

  getDefaultRoute(): string {
    if (this.currentUser?.role === 'ADMIN') {
      return '/admin'
    }

    return '/dashboard'
  }

  hasValidSession(): boolean {
    const token = localStorage.getItem(this.tokenKey)
    if (!token) {
      return false
    }

    if (this.isTokenExpired(token)) {
      return false
    }

    return true
  }

  ensureSessionIntegrity(redirectOnFailure = true): boolean {
    if (this.hasValidSession()) {
      return true
    }

    const hasToken = !!localStorage.getItem(this.tokenKey)
    if (hasToken && redirectOnFailure) {
      this.logout('Tu sesion expiro. Vuelve a iniciar sesion.')
    } else if (!hasToken) {
      localStorage.removeItem(this.userKey)
      localStorage.removeItem(this.lastActivityKey)
      this.currentUserSubject.next(null)
    }

    return false
  }

  initSessionTracking(): void {
    if (!this.windowRef || this.activityListenersBound) {
      return
    }

    const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart']
    activityEvents.forEach((eventName) => {
      this.windowRef!.addEventListener(eventName, () => this.markActivity(), { passive: true })
    })

    this.activityListenersBound = true
    this.inactivityIntervalId = this.windowRef.setInterval(() => {
      this.checkSessionTimeouts()
    }, this.sessionCheckMs)
  }

  private markActivity(force = false): void {
    if (!this.hasValidSession()) {
      return
    }

    const now = Date.now()
    if (!force && now - this.lastActivityUpdate < 5000) {
      return
    }

    localStorage.setItem(this.lastActivityKey, String(now))
    this.lastActivityUpdate = now
  }

  private checkSessionTimeouts(): void {
    if (!this.hasValidSession()) {
      return
    }

    const token = localStorage.getItem(this.tokenKey)
    if (token && this.isTokenExpired(token)) {
      this.logout('Tu sesion expiro. Vuelve a iniciar sesion.')
      return
    }

    const lastActivity = Number(localStorage.getItem(this.lastActivityKey) || Date.now())
    if (Date.now() - lastActivity > this.inactivityLimitMs) {
      this.logout('Tu sesion se cerro por inactividad.')
    }
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token)
    if (!payload?.exp) {
      return false
    }

    return payload.exp * 1000 <= Date.now()
  }

  private decodeToken(token: string): JwtPayload | null {
    try {
      const [, payload] = token.split('.')
      if (!payload) {
        return null
      }

      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
      const decoded = atob(normalized)
      return JSON.parse(decoded) as JwtPayload
    } catch {
      return null
    }
  }
}
