import { HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { catchError, throwError } from 'rxjs'
import { AuthService } from '../services/auth'

// Agrega el token JWT automaticamente a todas las peticiones HTTP
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService)
  const token = authService.token

  const handleError = (error: { status?: number; error?: { error?: string } }) => {
    if (error.status === 401 && !req.url.endsWith('/auth/login')) {
      authService.logout('Tu sesion expiro o ya no es valida.')
    }

    return throwError(() => error)
  }

  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    })
    return next(authReq).pipe(
      catchError(handleError)
    )
  }

  return next(req).pipe(
    catchError(handleError)
  )
}
