import { CommonModule } from '@angular/common'
import { Component, Inject } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatNativeDateModule } from '@angular/material/core'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'
import { CreateTaskDto, Task, TasksService } from '../../../services/tasks'

type MemberOption = {
  id: string
  name: string
  role: string
}

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.scss'
})
export class TaskFormComponent {
  loading = false
  form

  constructor(
    private fb: FormBuilder,
    private tasksService: TasksService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<TaskFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { projectId: string; members: MemberOption[]; task?: Task }
  ) {
    this.form = this.fb.group({
      title: [data.task?.title || '', [Validators.required, Validators.minLength(3)]],
      description: [data.task?.description || ''],
      labels: [data.task?.labels || ''],
      priority: [data.task?.priority || 'MEDIA', Validators.required],
      deadline: [data.task?.deadline ? new Date(data.task.deadline) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), Validators.required],
      assigneeId: [data.task?.assigneeId || '']
    })
  }

  onCancel(): void {
    this.dialogRef.close(false)
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return
    }

    this.loading = true

    const raw = this.form.getRawValue()
    const payload: CreateTaskDto = {
      title: raw.title || '',
      description: raw.description || undefined,
      labels: raw.labels?.trim() || undefined,
      priority: (raw.priority as CreateTaskDto['priority']) || 'MEDIA',
      deadline: raw.deadline ? new Date(raw.deadline).toISOString() : undefined,
      assigneeId: raw.assigneeId || undefined
    }

    const request$ = this.data.task
      ? this.tasksService.update(this.data.task.id, payload)
      : this.tasksService.create(this.data.projectId, payload)

    request$.subscribe({
      next: () => {
        this.loading = false
        this.dialogRef.close(true)
      },
      error: (err) => {
        this.loading = false
        this.snackBar.open(
          err.error?.error || (this.data.task ? 'No fue posible actualizar la tarea' : 'No fue posible crear la tarea'),
          'Cerrar',
          { duration: 3000 }
        )
      }
    })
  }
}
