import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { BehaviorSubject, Observable } from 'rxjs'
import { environment } from '../../environments/environment'

export interface NotificationItem {
  id: string
  title: string
  message: string
  link?: string | null
  readAt?: string | null
  createdAt: string
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private api = `${environment.apiUrl}/notifications`
  private notificationsSubject = new BehaviorSubject<NotificationItem[]>([])
  notifications$ = this.notificationsSubject.asObservable()

  constructor(private http: HttpClient) {}

  get current(): NotificationItem[] {
    return this.notificationsSubject.value
  }

  load(): void {
    this.http.get<NotificationItem[]>(this.api).subscribe({
      next: (notifications) => this.notificationsSubject.next(notifications),
      error: () => this.notificationsSubject.next([])
    })
  }

  markAsRead(id: string): Observable<NotificationItem> {
    return this.http.patch<NotificationItem>(`${this.api}/${id}/read`, {})
  }

  replaceNotification(updated: NotificationItem): void {
    this.notificationsSubject.next(
      this.current.map((item) => item.id === updated.id ? updated : item)
    )
  }
}
