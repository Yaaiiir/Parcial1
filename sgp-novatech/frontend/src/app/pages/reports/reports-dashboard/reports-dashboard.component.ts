import { CommonModule } from '@angular/common'
import { ChangeDetectorRef, Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSelectModule } from '@angular/material/select'
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'
import { MatTableModule } from '@angular/material/table'
import { BaseChartDirective } from 'ng2-charts'
import { Chart, ChartConfiguration, ChartOptions, registerables } from 'chart.js'
import { ProjectsService } from '../../../services/projects'
import { DashboardData, OverdueTask, PortfolioProjectSummary, ReportsService } from '../../../services/reports'

Chart.register(...registerables)

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    BaseChartDirective
  ],
  templateUrl: './reports-dashboard.component.html',
  styleUrl: './reports-dashboard.component.scss'
})
export class ReportsDashboardComponent implements OnInit {
  @ViewChild('reportContent') reportContent!: ElementRef<HTMLElement>

  isLoading = true
  isExporting = false
  errorMessage = ''
  data: DashboardData | null = null
  projects: { id: string; name: string }[] = []
  selectedProjectId = ''
  overdueColumns = ['title', 'project', 'assignee', 'deadline', 'priority']

  statusChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [{ data: [], backgroundColor: ['#98A4B8', '#2E5EB6', '#F59E0B', '#27AE44'] }]
  }

  priorityChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{ label: 'Tareas', data: [], backgroundColor: ['#D63A3A', '#F59E0B', '#27AE44'] }]
  }

  productivityChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      { label: 'Completadas', data: [], backgroundColor: '#2E5EB6' },
      { label: 'Pendientes', data: [], backgroundColor: '#DDE2EB' }
    ]
  }

  doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, boxWidth: 10 }
      }
    }
  }

  barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, beginAtZero: true }
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, boxWidth: 10 }
      }
    }
  }

  priorityBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { precision: 0 } }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  }

  constructor(
    private reportsService: ReportsService,
    private projectsService: ProjectsService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.selectedProjectId = this.route.snapshot.queryParamMap.get('projectId') || ''

    this.projectsService.getAll().subscribe({
      next: (projects) => {
        this.ngZone.run(() => {
          this.projects = projects.map((project) => ({ id: project.id, name: project.name }))
          this.cdr.detectChanges()
        })
      }
    })

    this.loadDashboard()
  }

  loadDashboard(): void {
    this.ngZone.run(() => {
      this.isLoading = true
      this.errorMessage = ''
      this.cdr.detectChanges()
    })

    const projectId = this.selectedProjectId || undefined

    this.reportsService.getDashboard(projectId).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.data = data
          this.updateCharts(data)
          this.isLoading = false
          this.cdr.detectChanges()
        })
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.data = null
          this.isLoading = false
          this.errorMessage = error.status === 403
            ? 'No tienes permisos para ver reportes.'
            : 'No fue posible cargar el dashboard de reportes.'
          this.snackBar.open(this.errorMessage, 'Cerrar', { duration: 3500 })
          this.cdr.detectChanges()
        })
      }
    })
  }

  onProjectChange(): void {
    this.router.navigate([], {
      queryParams: {
        projectId: this.selectedProjectId || null
      },
      queryParamsHandling: 'merge'
    })
    this.loadDashboard()
  }

  get portfolioProjects(): PortfolioProjectSummary[] {
    return this.data?.portfolioSummary?.projects || []
  }

  get showPortfolioSummary(): boolean {
    return !this.selectedProjectId && this.portfolioProjects.length > 0
  }

  openProjectDetail(projectId: string): void {
    this.router.navigate(['/projects', projectId])
  }

  updateCharts(data: DashboardData): void {
    this.statusChartData = {
      labels: data.tasksByStatus.map((item) => item.name),
      datasets: [
        {
          data: data.tasksByStatus.map((item) => item.value),
          backgroundColor: ['#98A4B8', '#2E5EB6', '#F59E0B', '#27AE44']
        }
      ]
    }

    this.priorityChartData = {
      labels: data.tasksByPriority.map((item) => item.name),
      datasets: [
        {
          label: 'Tareas',
          data: data.tasksByPriority.map((item) => item.value),
          backgroundColor: ['#D63A3A', '#F59E0B', '#27AE44']
        }
      ]
    }

    this.productivityChartData = {
      labels: data.productivityByMember.map((item) => item.name),
      datasets: [
        {
          label: 'Completadas',
          data: data.productivityByMember.map((item) => item.completed),
          backgroundColor: '#2E5EB6'
        },
        {
          label: 'Pendientes',
          data: data.productivityByMember.map((item) => item.total - item.completed),
          backgroundColor: '#DDE2EB'
        }
      ]
    }
  }

  getDueDateClass(task: OverdueTask): string {
    const days = Math.floor((Date.now() - new Date(task.deadline).getTime()) / (1000 * 60 * 60 * 24))
    return days > 7 ? 'overdue-critical' : 'overdue-warning'
  }

  getPriorityLabel(priority: string): string {
    const map: Record<string, string> = {
      ALTA: 'Alta',
      MEDIA: 'Media',
      BAJA: 'Baja'
    }

    return map[priority] ?? priority
  }

  getPortfolioAlert(project: PortfolioProjectSummary): string {
    if (project.hasDelayAlert) {
      return 'Mas de 20% vencido'
    }

    if (project.daysRemaining < 0) {
      return 'Fecha comprometida vencida'
    }

    if (project.daysRemaining <= 7) {
      return 'Seguimiento cercano'
    }

    return 'En curso'
  }

  getPortfolioTone(project: PortfolioProjectSummary): 'danger' | 'warning' | 'success' {
    if (project.hasDelayAlert || project.daysRemaining < 0) {
      return 'danger'
    }

    if (project.daysRemaining <= 7) {
      return 'warning'
    }

    return 'success'
  }

  getDaysRemainingLabel(daysRemaining: number): string {
    if (daysRemaining < 0) {
      return `${Math.abs(daysRemaining)} dia(s) de atraso`
    }

    if (daysRemaining === 0) {
      return 'Vence hoy'
    }

    return `${daysRemaining} dia(s) restantes`
  }

  getOverdueTasksLabel(overdueTasks: number): string {
    return `${overdueTasks} tarea${overdueTasks === 1 ? '' : 's'} vencida${overdueTasks === 1 ? '' : 's'}`
  }

  async exportToPDF(): Promise<void> {
    if (!this.reportContent || !this.data) {
      return
    }

    this.isExporting = true

    try {
      const { default: jsPDF } = await import('jspdf')
      const data = this.data
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 14
      const contentWidth = pageWidth - margin * 2
      const chartWidth = (contentWidth - 8) / 2
      const chartHeight = 62
      const projectName = this.selectedProjectId
        ? this.projects.find((project) => project.id === this.selectedProjectId)?.name || 'Proyecto seleccionado'
        : 'Vista global del portafolio'
      const generatedAt = new Date().toLocaleString('es-MX')
      const dateLabel = new Date().toLocaleDateString('es-MX').replace(/\//g, '-')
      const reportScope = this.selectedProjectId ? 'Reporte especifico de proyecto' : 'Reporte consolidado de portafolio'
      const dominantStatus = [...data.tasksByStatus].sort((a, b) => b.value - a.value)[0]
      const dominantPriority = [...data.tasksByPriority].sort((a, b) => b.value - a.value)[0]
      const overdueCount = data.overdueTasks.length
      const canvasElements = Array.from(this.reportContent.nativeElement.querySelectorAll('canvas')) as HTMLCanvasElement[]
      const [statusCanvas, priorityCanvas, productivityCanvas] = canvasElements
      const portfolioSummary = data.portfolioSummary

      const formatDate = (value: string) => new Date(value).toLocaleDateString('es-MX')

      const drawHeaderBand = (title: string, subtitle?: string) => {
        pdf.setFillColor(22, 41, 97)
        pdf.roundedRect(margin, 12, contentWidth, 20, 4, 4, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(17)
        pdf.setTextColor(255, 255, 255)
        pdf.text(title, margin + 7, 22)
        if (subtitle) {
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(9.5)
          pdf.text(subtitle, margin + 7, 28)
        }
        pdf.setTextColor(22, 41, 97)
      }

      const drawCover = () => {
        pdf.setFillColor(22, 41, 97)
        pdf.rect(0, 0, pageWidth, 46, 'F')
        pdf.setFillColor(46, 94, 182)
        pdf.rect(0, 46, pageWidth, 8, 'F')

        pdf.setTextColor(255, 255, 255)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(25)
        pdf.text('NovaTech SGP', margin, 25)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(13)
        pdf.text('Reporte formal de avance y analitica operativa', margin, 35)

        pdf.setTextColor(22, 41, 97)
        pdf.setFillColor(255, 255, 255)
        pdf.roundedRect(margin, 64, contentWidth, 42, 5, 5, 'F')
        pdf.setDrawColor(221, 226, 235)
        pdf.roundedRect(margin, 64, contentWidth, 42, 5, 5, 'S')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(18)
        pdf.text('Informe de seguimiento del proyecto', margin + 6, 79)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(11)
        pdf.setTextColor(60, 72, 88)
        pdf.text(projectName, margin + 6, 89)
        pdf.text(`Fecha de emision: ${generatedAt}`, margin + 6, 98)

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(12)
        pdf.setTextColor(22, 41, 97)
        pdf.text('Ficha tecnica del documento', margin, 122)

        pdf.setFillColor(247, 249, 252)
        pdf.roundedRect(margin, 128, contentWidth, 44, 4, 4, 'F')
        pdf.setDrawColor(221, 226, 235)
        pdf.roundedRect(margin, 128, contentWidth, 44, 4, 4, 'S')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9.5)
        pdf.text('Sistema', margin + 5, 138)
        pdf.text('Alcance', margin + 5, 149)
        pdf.text('Generado por', margin + 5, 160)
        pdf.text('Corte de analisis', 105, 138)
        pdf.text('Tareas evaluadas', 105, 149)
        pdf.text('Tareas vencidas', 105, 160)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(60, 72, 88)
        pdf.text('NovaTech SGP', margin + 34, 138)
        pdf.text(reportScope, margin + 34, 149)
        pdf.text('Modulo de reportes', margin + 34, 160)
        pdf.text(generatedAt, 145, 138)
        pdf.text(String(data.globalProgress.total), 145, 149)
        pdf.text(String(overdueCount), 145, 160)

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(12)
        pdf.setTextColor(22, 41, 97)
        pdf.text('Resumen ejecutivo', margin, 188)

        const executiveSummary = `Este reporte presenta una sintesis del estado actual del trabajo registrado en NovaTech SGP. El avance general alcanza ${data.globalProgress.percentage}%, con ${data.globalProgress.completed} tareas completadas de un total de ${data.globalProgress.total}. El estado predominante es ${dominantStatus?.name || 'Sin datos'} y la prioridad mas frecuente es ${dominantPriority?.name || 'Sin datos'}.`
        drawParagraph(executiveSummary, margin, 196, contentWidth, 5.2)
      }

      const drawKpiCard = (
        x: number,
        y: number,
        width: number,
        title: string,
        value: string,
        subtitle: string,
        accent: [number, number, number]
      ) => {
        pdf.setDrawColor(221, 226, 235)
        pdf.setFillColor(255, 255, 255)
        pdf.roundedRect(x, y, width, 32, 4, 4, 'FD')
        pdf.setFillColor(...accent)
        pdf.roundedRect(x, y, width, 4, 4, 4, 'F')
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.setTextColor(100, 116, 139)
        pdf.text(title, x + 4, y + 11)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(18)
        pdf.setTextColor(22, 41, 97)
        pdf.text(value, x + 4, y + 21)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(124, 137, 161)
        pdf.text(subtitle, x + 4, y + 28)
      }

      const drawSectionTitle = (text: string, y: number) => {
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(13.5)
        pdf.setTextColor(22, 41, 97)
        pdf.text(text, margin, y)
        pdf.setDrawColor(46, 94, 182)
        pdf.line(margin, y + 2, margin + 56, y + 2)
      }

      const drawParagraph = (text: string, x: number, y: number, maxWidth = contentWidth, lineHeight = 5) => {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.setTextColor(60, 72, 88)
        const lines = pdf.splitTextToSize(text, maxWidth)
        pdf.text(lines, x, y)
        return y + lines.length * lineHeight
      }

      const drawFooter = (pageNumber: number, totalPages: number) => {
        pdf.setDrawColor(221, 226, 235)
        pdf.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(124, 137, 161)
        pdf.text('NovaTech SGP | Reporte ejecutivo de seguimiento', margin, pageHeight - 5)
        pdf.text(`Pagina ${pageNumber} de ${totalPages}`, pageWidth - margin - 26, pageHeight - 5)
      }

      const addChartIfPresent = (canvas: HTMLCanvasElement | null, x: number, y: number, width: number, height: number) => {
        if (!canvas) {
          return
        }
        const img = canvas.toDataURL('image/png', 1.0)
        pdf.setDrawColor(221, 226, 235)
        pdf.roundedRect(x, y, width, height, 4, 4, 'S')
        pdf.addImage(img, 'PNG', x + 3, y + 4, width - 6, height - 8, undefined, 'FAST')
      }

      const reportLabel = `${projectName} | ${reportScope}`

      if (!this.selectedProjectId && portfolioSummary) {
        const drawPortfolioHeader = (title: string, subtitle?: string) => {
          pdf.setFillColor(22, 41, 97)
          pdf.roundedRect(margin, 12, contentWidth, 20, 4, 4, 'F')
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(17)
          pdf.setTextColor(255, 255, 255)
          pdf.text(title, margin + 7, 22)
          if (subtitle) {
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(9.5)
            pdf.text(subtitle, margin + 7, 28)
          }
          pdf.setTextColor(22, 41, 97)
        }

        const drawPortfolioFooter = (pageNumber: number, totalPages: number) => {
          pdf.setDrawColor(221, 226, 235)
          pdf.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10)
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(8)
          pdf.setTextColor(124, 137, 161)
          pdf.text('NovaTech SGP | Resumen ejecutivo del portafolio', margin, pageHeight - 5)
          pdf.text(`Pagina ${pageNumber} de ${totalPages}`, pageWidth - margin - 26, pageHeight - 5)
        }

        const drawPortfolioParagraph = (text: string, x: number, y: number, maxWidth = contentWidth, lineHeight = 5) => {
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(10)
          pdf.setTextColor(60, 72, 88)
          const lines = pdf.splitTextToSize(text, maxWidth)
          pdf.text(lines, x, y)
          return y + lines.length * lineHeight
        }

        const drawPortfolioSection = (text: string, y: number) => {
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(13.5)
          pdf.setTextColor(22, 41, 97)
          pdf.text(text, margin, y)
          pdf.setDrawColor(46, 94, 182)
          pdf.line(margin, y + 2, margin + 56, y + 2)
        }

        pdf.setFillColor(22, 41, 97)
        pdf.rect(0, 0, pageWidth, 46, 'F')
        pdf.setFillColor(46, 94, 182)
        pdf.rect(0, 46, pageWidth, 8, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(25)
        pdf.text('NovaTech SGP', margin, 25)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(13)
        pdf.text('Resumen ejecutivo consolidado del portafolio', margin, 35)

        pdf.setTextColor(22, 41, 97)
        pdf.setFillColor(255, 255, 255)
        pdf.roundedRect(margin, 64, contentWidth, 42, 5, 5, 'F')
        pdf.setDrawColor(221, 226, 235)
        pdf.roundedRect(margin, 64, contentWidth, 42, 5, 5, 'S')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(18)
        pdf.text('Informe general de proyectos activos', margin + 6, 79)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(11)
        pdf.setTextColor(60, 72, 88)
        pdf.text(`Fecha de emision: ${generatedAt}`, margin + 6, 89)
        pdf.text(`Proyectos activos analizados: ${portfolioSummary.activeProjects}`, margin + 6, 98)

        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(12)
        pdf.setTextColor(22, 41, 97)
        pdf.text('Lectura ejecutiva', margin, 122)
        drawPortfolioParagraph(
          `El portafolio activo presenta un avance promedio de ${portfolioSummary.averageProgress}%. Actualmente hay ${portfolioSummary.atRiskProjects} proyecto(s) en riesgo por atraso y ${portfolioSummary.onTrackProjects} con comportamiento estable. Las metricas consolidadas mostradas en este documento corresponden solo a proyectos activos para mantener consistencia con la vista ejecutiva del sistema.`,
          margin,
          130
        )

        let yPortfolio = 162
        const topCardWidth = (contentWidth - 8) / 3
        ;[
          {
            title: 'Proyectos activos',
            value: `${portfolioSummary.activeProjects}`,
            subtitle: 'En ejecucion actualmente',
            accent: [46, 94, 182] as [number, number, number]
          },
          {
            title: 'Promedio de avance',
            value: `${portfolioSummary.averageProgress}%`,
            subtitle: 'Media consolidada del portafolio',
            accent: [39, 174, 68] as [number, number, number]
          },
          {
            title: 'Proyectos en riesgo',
            value: `${portfolioSummary.atRiskProjects}`,
            subtitle: 'Con mas de 20% abierto y vencido',
            accent: [214, 58, 58] as [number, number, number]
          }
        ].forEach((card, index) => {
          const x = margin + index * (topCardWidth + 4)
          drawKpiCard(x, yPortfolio, topCardWidth, card.title, card.value, card.subtitle, card.accent)
        })

        pdf.addPage()
        drawPortfolioHeader('Portafolio por proyecto', reportLabel)
        yPortfolio = 42
        drawPortfolioSection('1. Tarjetas ejecutivas del portafolio', yPortfolio)
        yPortfolio += 10

        portfolioSummary.projects.forEach((project, index) => {
          if (yPortfolio > pageHeight - 40) {
            pdf.addPage()
            drawPortfolioHeader('Portafolio por proyecto', reportLabel)
            yPortfolio = 42
          }

          pdf.setFillColor(255, 255, 255)
          pdf.setDrawColor(project.hasDelayAlert ? 235 : 221, project.hasDelayAlert ? 87 : 226, project.hasDelayAlert ? 87 : 235)
          pdf.roundedRect(margin, yPortfolio - 4, contentWidth, 34, 4, 4, 'FD')
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(10.5)
          pdf.setTextColor(22, 41, 97)
          pdf.text(`${project.publicCode || 'PRJ-000'} | ${project.name}`, margin + 4, yPortfolio + 2)
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(8.5)
          pdf.setTextColor(60, 72, 88)
          pdf.text(`Lider: ${project.leader.name}`, margin + 4, yPortfolio + 9)
          pdf.text(`Avance: ${project.progress}%`, margin + 58, yPortfolio + 9)
          pdf.text(`Abiertas: ${project.openTasks}`, margin + 92, yPortfolio + 9)
          pdf.text(`Vencidas: ${project.overdueTasks}`, margin + 126, yPortfolio + 9)
          pdf.text(`Alta prioridad: ${project.highPriorityTasks}`, margin + 160, yPortfolio + 9)
          pdf.text(this.getDaysRemainingLabel(project.daysRemaining), margin + 4, yPortfolio + 16)
          pdf.text(`${project.overdueRate}% de las tareas abiertas estan vencidas`, margin + 64, yPortfolio + 16)
          pdf.setFont('helvetica', 'bold')
          pdf.setTextColor(project.hasDelayAlert ? 179 : 39, project.hasDelayAlert ? 52 : 126, project.hasDelayAlert ? 76 : 61)
          pdf.text(this.getPortfolioAlert(project), pageWidth - margin - 4, yPortfolio + 16, { align: 'right' })
          yPortfolio += 40

          if (index === portfolioSummary.projects.length - 1) {
            yPortfolio += 2
          }
        })

        pdf.addPage()
        drawPortfolioHeader('Metricas consolidadas', reportLabel)
        drawPortfolioSection('2. Distribucion consolidada del trabajo activo', 42)
        addChartIfPresent(statusCanvas || null, margin, 48, chartWidth, chartHeight)
        addChartIfPresent(priorityCanvas || null, margin + chartWidth + 8, 48, chartWidth, chartHeight)

        yPortfolio = 120
        drawPortfolioSection('3. Lectura consolidada de hallazgos', yPortfolio)
        yPortfolio = drawPortfolioParagraph(
          `El estado predominante del trabajo activo es ${dominantStatus?.name || 'Sin datos'} y la prioridad con mayor peso es ${dominantPriority?.name || 'Sin datos'}. El tablero consolidado muestra ${data.globalProgress.completed} tareas completadas de ${data.globalProgress.total}, con ${overdueCount} tarea(s) vencida(s) distribuidas en el portafolio actual.`,
          margin,
          yPortfolio + 8
        ) + 4

        const findingRows = [
          `Estado predominante: ${dominantStatus?.name || 'Sin datos'} (${dominantStatus?.value || 0})`,
          `Prioridad predominante: ${dominantPriority?.name || 'Sin datos'} (${dominantPriority?.value || 0})`,
          `Proyectos en riesgo: ${portfolioSummary.atRiskProjects}`,
          `Tareas vencidas activas: ${overdueCount}`
        ]
        pdf.setFillColor(250, 251, 253)
        pdf.roundedRect(margin, yPortfolio, contentWidth, 34, 4, 4, 'F')
        pdf.setDrawColor(221, 226, 235)
        pdf.roundedRect(margin, yPortfolio, contentWidth, 34, 4, 4, 'S')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9.5)
        pdf.setTextColor(22, 41, 97)
        pdf.text('Resumen de hallazgos clave', margin + 4, yPortfolio + 7)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8.8)
        pdf.setTextColor(60, 72, 88)
        pdf.text(findingRows, margin + 4, yPortfolio + 14)

        const productivityY = yPortfolio + 46
        drawPortfolioSection('4. Productividad consolidada por miembro', productivityY)
        addChartIfPresent(productivityCanvas || null, margin, productivityY + 6, contentWidth, 62)

        pdf.addPage()
        drawPortfolioHeader('Pendientes criticos del portafolio', reportLabel)
        drawPortfolioSection('5. Tareas vencidas activas', 42)
        let lineY = 50
        const columns = [
          { label: 'Tarea', x: margin, width: 58 },
          { label: 'Proyecto', x: margin + 60, width: 42 },
          { label: 'Responsable', x: margin + 104, width: 34 },
          { label: 'Fecha', x: margin + 140, width: 24 },
          { label: 'Prioridad', x: margin + 166, width: 20 }
        ]

        pdf.setFillColor(240, 243, 248)
        pdf.roundedRect(margin, lineY, contentWidth, 10, 2, 2, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor(22, 41, 97)
        columns.forEach((column) => pdf.text(column.label, column.x + 2, lineY + 6.5))
        lineY += 14
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8.5)

        if (data.overdueTasks.length === 0) {
          pdf.setTextColor(100, 116, 139)
          pdf.text('No hay tareas vencidas dentro del portafolio activo.', margin, lineY)
        } else {
          data.overdueTasks.forEach((task) => {
            if (lineY > pageHeight - 18) {
              pdf.addPage()
              drawPortfolioHeader('Pendientes criticos del portafolio', reportLabel)
              lineY = 42
            }

            pdf.setDrawColor(232, 236, 242)
            pdf.line(margin, lineY + 8, margin + contentWidth, lineY + 8)
            pdf.setTextColor(60, 72, 88)
            pdf.text(pdf.splitTextToSize(task.title, 54), columns[0].x + 2, lineY)
            pdf.text(pdf.splitTextToSize(task.project.name, 38), columns[1].x + 2, lineY)
            pdf.text(pdf.splitTextToSize(task.assignee?.name || 'Sin asignar', 30), columns[2].x + 2, lineY)
            pdf.text(formatDate(task.deadline), columns[3].x + 2, lineY)
            pdf.text(this.getPriorityLabel(task.priority), columns[4].x + 2, lineY)
            lineY += 14
          })
        }

        const totalPages = pdf.getNumberOfPages()
        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
          pdf.setPage(pageNumber)
          drawPortfolioFooter(pageNumber, totalPages)
        }

        pdf.save(`reporte-portafolio-${dateLabel}.pdf`)
        this.snackBar.open('PDF exportado correctamente', 'Cerrar', { duration: 2500 })
        return
      }

      drawCover()

      let y = 220
      const cardWidth = (contentWidth - 8) / 3
      drawKpiCard(
        margin,
        y,
        cardWidth,
        'Avance global',
        `${data.globalProgress.percentage}%`,
        `${data.globalProgress.completed} completadas`,
        [46, 94, 182]
      )
      drawKpiCard(
        margin + cardWidth + 4,
        y,
        cardWidth,
        'Tareas vencidas',
        `${overdueCount}`,
        'Pendientes fuera de fecha',
        overdueCount > 0 ? [214, 58, 58] : [39, 174, 68]
      )
      drawKpiCard(
        margin + (cardWidth + 4) * 2,
        y,
        cardWidth,
        'Total de tareas',
        `${data.globalProgress.total}`,
        'Dentro del alcance',
        [245, 158, 11]
      )

      pdf.addPage()
      drawHeaderBand('Analisis grafico y distribucion', reportLabel)
      drawSectionTitle('1. Distribucion de tareas por estado y prioridad', 42)
      addChartIfPresent(statusCanvas || null, margin, 48, chartWidth, chartHeight)
      addChartIfPresent(priorityCanvas || null, margin + chartWidth + 8, 48, chartWidth, chartHeight)

      y = 120
      drawSectionTitle('2. Interpretacion de resultados', y)
      y = drawParagraph(
        'Las graficas permiten identificar rapidamente la distribucion del trabajo, el peso de las prioridades criticas y el ritmo de cierre de actividades dentro del periodo analizado.',
        margin,
        y + 8
      ) + 3

      const completionRate = `${data.globalProgress.completed}/${data.globalProgress.total} tareas finalizadas`
      const findingsLines = [
        `Estado predominante: ${dominantStatus?.name || 'Sin datos'} (${dominantStatus?.value || 0})`,
        `Prioridad predominante: ${dominantPriority?.name || 'Sin datos'} (${dominantPriority?.value || 0})`,
        `Rendimiento de cierre: ${completionRate}`,
        `Pendientes criticos: ${overdueCount} tarea(s) vencida(s)`
      ]
      const findingsHeight = 36

      pdf.setFillColor(250, 251, 253)
      pdf.roundedRect(margin, y, contentWidth, findingsHeight, 4, 4, 'F')
      pdf.setDrawColor(221, 226, 235)
      pdf.roundedRect(margin, y, contentWidth, findingsHeight, 4, 4, 'S')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9.5)
      pdf.setTextColor(22, 41, 97)
      pdf.text('Resumen de hallazgos', margin + 4, y + 7)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8.8)
      pdf.setTextColor(60, 72, 88)
      pdf.text(findingsLines, margin + 4, y + 14)

      const productivityTitleY = y + findingsHeight + 10
      drawSectionTitle('3. Productividad por miembro', productivityTitleY)
      addChartIfPresent(productivityCanvas || null, margin, productivityTitleY + 6, contentWidth, 62)

      pdf.addPage()
      drawHeaderBand('Seguimiento de pendientes criticos', reportLabel)
      drawSectionTitle('4. Relacion de tareas vencidas', 42)
      let lineY = 50
      const columns = [
        { label: 'Tarea', x: margin, width: 58 },
        { label: 'Proyecto', x: margin + 60, width: 42 },
        { label: 'Responsable', x: margin + 104, width: 34 },
        { label: 'Fecha', x: margin + 140, width: 24 },
        { label: 'Prioridad', x: margin + 166, width: 20 }
      ]

      pdf.setFillColor(240, 243, 248)
      pdf.roundedRect(margin, lineY, contentWidth, 10, 2, 2, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(22, 41, 97)
      columns.forEach((column) => pdf.text(column.label, column.x + 2, lineY + 6.5))
      lineY += 14

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8.5)

      if (data.overdueTasks.length === 0) {
        pdf.setTextColor(100, 116, 139)
        pdf.text('No hay tareas vencidas para el filtro seleccionado.', margin, lineY)
        lineY += 14
      } else {
        data.overdueTasks.forEach((task) => {
          if (lineY > pageHeight - 18) {
            pdf.addPage()
            drawHeaderBand('Seguimiento de pendientes criticos', reportLabel)
            lineY = 42
          }

          pdf.setDrawColor(232, 236, 242)
          pdf.line(margin, lineY + 8, margin + contentWidth, lineY + 8)
          pdf.setTextColor(60, 72, 88)
          pdf.text(pdf.splitTextToSize(task.title, 54), columns[0].x + 2, lineY)
          pdf.text(pdf.splitTextToSize(task.project.name, 38), columns[1].x + 2, lineY)
          pdf.text(pdf.splitTextToSize(task.assignee?.name || 'Sin asignar', 30), columns[2].x + 2, lineY)
          pdf.text(formatDate(task.deadline), columns[3].x + 2, lineY)
          pdf.text(this.getPriorityLabel(task.priority), columns[4].x + 2, lineY)
          lineY += 14
        })
      }

      lineY += 6
      drawSectionTitle('5. Conclusiones y recomendaciones', lineY)
      lineY = drawParagraph(
        overdueCount > 0
          ? 'Se recomienda priorizar la regularizacion de tareas vencidas, revisar la distribucion de responsables y establecer un seguimiento semanal sobre las actividades de mayor impacto para reducir el riesgo de retrasos acumulados.'
          : 'No se identifican tareas vencidas en el corte actual. Se recomienda mantener el seguimiento del avance, validar el ritmo de cierre de actividades y conservar la revision periodica de prioridades para sostener el desempeno observado.',
        margin,
        lineY + 8
      )
      lineY += 6
      drawParagraph(
        'Este documento fue generado automaticamente a partir de la informacion registrada en el sistema NovaTech SGP y puede utilizarse como evidencia de seguimiento, control operativo y apoyo para entregables academicos del proyecto.',
        margin,
        lineY
      )

      const totalPages = pdf.getNumberOfPages()
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        pdf.setPage(pageNumber)
        drawFooter(pageNumber, totalPages)
      }

      pdf.save(`reporte-novatech-${dateLabel}.pdf`)
      this.snackBar.open('PDF exportado correctamente', 'Cerrar', { duration: 2500 })
    } catch {
      this.snackBar.open('No fue posible exportar el PDF completo', 'Cerrar', { duration: 3200 })
    } finally {
      this.isExporting = false
    }
  }
}
