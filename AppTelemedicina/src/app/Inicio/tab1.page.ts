import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http'; // Para la descarga de PDFs
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonAvatar, IonList, IonItem, IonLabel, IonModal, IonSelect, IonSelectOption,
  IonDatetime, IonDatetimeButton, IonPopover, IonTextarea, NavController,
  AlertController, IonBadge // Inyectamos Badge y AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  notificationsOutline, videocam, videocamOutline, calendarNumberOutline,
  calendarOutline, documentTextOutline, receiptOutline, medkitOutline,
  chevronForwardOutline, calendar, people, receipt, time, medkit,
  water, arrowBackOutline, businessOutline, timeOutline, chevronForward,
  star, heartOutline, eyeOutline, fitnessOutline, appsOutline, peopleOutline,
  downloadOutline // Añadimos icono de descarga
} from 'ionicons/icons';
import { AuthService } from '../services/auth/auth';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, IonHeader, IonToolbar, IonTitle,
    IonContent, IonButtons, IonButton, IonIcon, IonAvatar, IonList, IonItem,
    IonLabel, IonModal, IonSelect, IonSelectOption, IonDatetime, IonDatetimeButton,
    IonPopover, IonTextarea, IonBadge // Asegúrate de incluir IonBadge aquí
  ],
})
export class Tab1Page implements OnInit {
  private authService = inject(AuthService);
  private navCtrl = inject(NavController);
  private http = inject(HttpClient); // Inyectamos para el PDF
  private alertCtrl = inject(AlertController); // Inyectamos para ver detalles

  @ViewChild('modalAgendar') modalAgendar!: IonModal;

  userName: string = '';
  userId: number = 0;
  consultas: any[] = [];
  recetas: any[] = []; // <--- SE AGREGÓ ESTA PROPIEDAD PARA SOLUCIONAR EL ERROR

  // --- ESTADO DEL FORMULARIO DE AGENDADO ---
  medicoSeleccionado: any = null;
  tipoConsulta: string = 'VIDEOLLAMADA';
  horaSeleccionada: string = '10:00 AM';
  fechaSeleccionada: string = new Date().toISOString();
  motivoConsulta: string = '';

  horasDisponibles: string[] = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM'
  ];

  medicosBD: any[] = [];

  constructor() {
    addIcons({
      notificationsOutline, videocam, videocamOutline, calendarNumberOutline,
      calendarOutline, documentTextOutline, receiptOutline, medkitOutline,
      chevronForwardOutline, calendar, people, receipt, time, medkit,
      water, arrowBackOutline, businessOutline, timeOutline, chevronForward,
      star, heartOutline, eyeOutline, fitnessOutline, appsOutline, peopleOutline,
      downloadOutline
    });
  }

  ngOnInit() {
    this.cargarDatosUsuario();
    this.cargarMedicosDesdeBD();
  }

  async ionViewWillEnter() {
    this.actualizarListaConsultas();
    this.cargarRecetas(); // Cargamos recetas al entrar a la vista

    const medicoDesdeBuscador = this.authService.getMedicoTemporal();
    if (medicoDesdeBuscador) {
      this.medicoSeleccionado = { ...medicoDesdeBuscador };
      setTimeout(() => this.modalAgendar.present(), 300);
    }
  }

  cargarDatosUsuario() {
    const user = this.authService.getUserData();
    if (user) {
      this.userName = user.nombre;
      this.userId = Number(user.id);
    }
  }

  // --- NUEVA LÓGICA PARA RECETAS (Igual que Tab4) ---
  cargarRecetas() {
    if (!this.userId) return;
    this.authService.getRecetasUsuario(this.userId).subscribe({
      next: (data: any[]) => {
        this.recetas = data.map(r => ({
          id: r.id,
          doctor: r.doctorNombre,
          fecha: r.fechaEmision,
          medicamento: r.medicamento,
          indicaciones: r.indicaciones,
          estado: r.estatus ? (r.estatus.charAt(0).toUpperCase() + r.estatus.slice(1).toLowerCase()) : 'Activa'
        }));
      },
      error: (err) => console.error('Error al cargar recetas:', err)
    });
  }

  descargarReceta(receta: any) {
    const urlPdf = `http://192.168.56.1:3000/api/recetas/generar-pdf/${receta.id}`;

    this.http.get(urlPdf, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Receta_${receta.medicamento.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      },
      error: (err) => {
        console.error('Error en descarga:', err);
        alert('No se pudo generar el PDF.');
      }
    });
  }

  async verDetalles(receta: any) {
    const alert = await this.alertCtrl.create({
      header: 'Indicaciones Médicas',
      subHeader: `Medicamento: ${receta.medicamento}`,
      message: receta.indicaciones || 'No hay indicaciones adicionales.',
      buttons: ['Entendido']
    });
    await alert.present();
  }

  // --- LÓGICA DE CITAS ---
  cargarMedicosDesdeBD() {
    this.authService.getMedicos().subscribe({
      next: (res: any) => { this.medicosBD = res; },
      error: (err) => console.error('Error al cargar médicos:', err)
    });
  }

  actualizarListaConsultas() {
    if (this.userId) {
      this.authService.getConsultas(this.userId).subscribe({
        next: (data: any) => { this.consultas = data; },
        error: (err) => console.error('Error al cargar consultas:', err)
      });
    }
  }

  onMedicoChange(event: any) { this.medicoSeleccionado = event.detail.value; }
  setTipoConsulta(tipo: string) { this.tipoConsulta = tipo; }
  setHora(hora: string) { this.horaSeleccionada = hora; }

  confirmarCita() {
    if (!this.medicoSeleccionado || !this.medicoSeleccionado.id) {
      alert('Por favor, selecciona un médico antes de confirmar.');
      return;
    }

    const fechaFinal = new Date(this.fechaSeleccionada);
    const timeMatch = this.horaSeleccionada.match(/\d+|AM|PM/g);

    if (timeMatch) {
      let [hora, minutos, periodo] = timeMatch;
      let h = parseInt(hora);
      if (periodo === 'PM' && h < 12) h += 12;
      if (periodo === 'AM' && h === 12) h = 0;
      fechaFinal.setHours(h, parseInt(minutos), 0, 0);
    }

    const payloadCita = {
      usuarioId: this.userId,
      medicoId: Number(this.medicoSeleccionado.id),
      fecha: fechaFinal.toISOString(),
      motivo: this.motivoConsulta || 'Consulta médica',
      tipo: this.tipoConsulta
    };

    this.authService.agendarCita(payloadCita).subscribe({
      next: (res) => {
        alert('✅ Cita agendada correctamente.');
        this.modalAgendar.dismiss();
        this.actualizarListaConsultas();
        this.limpiarFormulario();
      },
      error: (err) => {
        console.error('Error al agendar:', err);
        alert('❌ Error al conectar con el servidor.');
      }
    });
  }

  private limpiarFormulario() {
    this.medicoSeleccionado = null;
    this.motivoConsulta = '';
    this.tipoConsulta = 'VIDEOLLAMADA';
    this.horaSeleccionada = '10:00 AM';
    this.fechaSeleccionada = new Date().toISOString();
  }
}
