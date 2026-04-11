import { CommonModule } from '@angular/common'
import { ChangeDetectorRef, Component, Inject, NgZone, OnInit } from '@angular/core'
import { MatNativeDateModule } from '@angular/material/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSelectModule } from '@angular/material/select'
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'
import { Project, ProjectsService } from '../../../services/projects'
import { User, UsersService } from '../../../services/users'

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './project-form.component.html',
  styleUrl: './project-form.component.scss'
})
export class ProjectFormComponent implements OnInit {
  form: FormGroup
  leaders: User[] = []
  loading = false
  isEdit: boolean

  constructor(
    private fb: FormBuilder,
    private projectsService: ProjectsService,
    private usersService: UsersService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<ProjectFormComponent>,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: { project: Project | null }
  ) {
    this.isEdit = !!data.project

    this.form = this.fb.group({
      name: [data.project?.name || '', [Validators.required, Validators.minLength(3)]],
      description: [data.project?.description || ''],
      startDate: [data.project?.startDate ? new Date(data.project.startDate) : '', Validators.required],
      deadline: [data.project?.deadline ? new Date(data.project.deadline) : '', Validators.required],
      leaderId: [data.project?.leaderId || '', Validators.required],
    }, { validators: this.dateRangeValidator })
  }

  ngOnInit(): void {
    this.usersService.getLeaders().subscribe({
      next: (users) => {
        this.ngZone.run(() => {
          this.leaders = users
          this.cdr.detectChanges()
        })
      }
    })
  }

  dateRangeValidator(group: FormGroup) {
    const start = group.get('startDate')?.value
    const deadline = group.get('deadline')?.value

    if (start && deadline && new Date(deadline) <= new Date(start)) {
      return { dateRange: true }
    }

    return null
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return
    }

    this.loading = true

    const formData = {
      ...this.form.value,
      startDate: new Date(this.form.value.startDate).toISOString(),
      deadline: new Date(this.form.value.deadline).toISOString(),
    }

    const request$ = this.isEdit
      ? this.projectsService.update(this.data.project!.id, formData)
      : this.projectsService.create(formData)

    request$.subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.loading = false
          this.cdr.detectChanges()
          this.dialogRef.close(true)
        })
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loading = false
          this.snackBar.open(err.error?.error || 'No fue posible guardar el proyecto', 'Cerrar', {
            duration: 3500
          })
          this.cdr.detectChanges()
        })
      }
    })
  }

  onCancel(): void {
    this.dialogRef.close(false)
  }
}
