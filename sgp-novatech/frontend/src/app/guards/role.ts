import { inject } from '@angular/core'
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router'
import { AuthService } from '../services/auth'

// Protege rutas que requieren un rol especifico
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService)
  const router = inject(Router)

  const allowedRoles: string[] = route.data['roles'] || []

  if (authService.hasRole(...allowedRoles)) {
    return true
  }

  return router.createUrlTree(['/forbidden'], {
    queryParams: {
      code: 403,
      from: route.routeConfig?.path || ''
    }
  })
}
