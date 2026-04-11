import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AuthService } from '../services/auth'

// Protege rutas que requieren estar autenticado
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService)
  const router = inject(Router)

  if (authService.ensureSessionIntegrity()) {
    return true
  }

  router.navigate(['/login'])
  return false
}
