import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule],
  templateUrl: './forbidden.component.html',
  styleUrl: './forbidden.component.scss'
})
export class ForbiddenComponent {
  readonly code: string
  readonly source: string
  readonly message: string

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.code = this.route.snapshot.queryParamMap.get('code') || '403'
    this.source = this.route.snapshot.queryParamMap.get('from') || 'esta vista'
    this.message = this.route.snapshot.queryParamMap.get('message')
      || `No tienes permisos para abrir ${this.source}. Esta vista solo esta disponible para los roles autorizados.`
  }

  goBack(): void {
    this.router.navigate(['/dashboard'])
  }
}
