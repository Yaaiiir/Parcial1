import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'

@Component({
  selector: 'app-project-status-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 24px; font-family: sans-serif;">
      <h2>Cambio de Estado</h2>
      <p>Componente base listo para confirmar cambios de estado del proyecto.</p>
    </div>
  `
})
export class ProjectStatusDialogComponent {}
