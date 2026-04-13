import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList,
  IonItem, IonLabel, IonIcon, IonButton, IonBadge, IonText,
  IonRefresher, IonRefresherContent, IonSkeletonText,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  receiptOutline, downloadOutline, timeOutline,
  documentTextOutline, chevronForwardOutline, alertCircleOutline,
  medkitOutline
} from 'ionicons/icons';
import { AuthService } from '../services/auth/auth';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonIcon, IonButton, IonBadge, IonText,
    IonRefresher, IonRefresherContent, IonSkeletonText
  ]
})
export class Tab4Page implements OnInit {
  private authService = inject(AuthService);
  private alertCtrl = inject(AlertController);
  private http = inject(HttpClient);

  recetas: any[] = [];
  userId: number = 0;
  isLoading: boolean = true;

  constructor() {
    addIcons({
      receiptOutline, downloadOutline, timeOutline,
      documentTextOutline, chevronForwardOutline, alertCircleOutline,
      medkitOutline
    });
  }

  ngOnInit() {
    const user = this.authService.getUserData();
    if (user) {
      this.userId = Number(user.id);
      this.cargarRecetas();
    }
  }

  handleRefresh(event: any) {
    this.cargarRecetas();
    setTimeout(() => {
      event.target.complete();
    }, 1500);
  }

  cargarRecetas() {
    this.isLoading = true;
    this.authService.getRecetasUsuario(this.userId).subscribe({
      next: (data: any[]) => {
        this.recetas = data.map(r => ({
          id: r.id,
          doctor: r.doctorNombre,
          especialidad: 'Medicina General',
          fecha: r.fechaEmision,
          medicamento: r.medicamento,
          indicaciones: r.indicaciones,
          estado: r.estatus ? (r.estatus.charAt(0).toUpperCase() + r.estatus.slice(1).toLowerCase()) : 'Activa'
        }));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar recetas:', err);
        this.isLoading = false;
      }
    });
  }

  async verDetalles(receta: any) {
    const alert = await this.alertCtrl.create({
      header: 'Indicaciones Médicas',
      subHeader: `Medicamento: ${receta.medicamento}`,
      message: receta.indicaciones || 'No hay indicaciones adicionales.',
      buttons: ['Entendido'],
      cssClass: 'custom-alert'
    });
    await alert.present();
  }

  descargarReceta(receta: any) {
    // Usamos la misma IP que tienes configurada en tu servidor
    const API_URL = 'http://192.168.56.1:3000/api';
    const urlPdf = `${API_URL}/recetas/generar-pdf/${receta.id}`;

    console.log('Solicitando PDF a:', urlPdf);

    this.http.get(urlPdf, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        // Crear un enlace temporal para los datos binarios del PDF
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;

        // Formatear nombre del archivo (quitar espacios)
        const nombreArchivo = `Receta_${receta.medicamento.replace(/\s+/g, '_')}.pdf`;
        link.download = nombreArchivo;

        // Simular clic para iniciar descarga
        document.body.appendChild(link);
        link.click();

        // Limpieza
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      },
      error: (err) => {
        console.error('Error en la descarga:', err);
        alert('No se pudo generar el PDF. Verifica que el servidor esté encendido y pdfkit configurado.');
      }
    });
  }
}
