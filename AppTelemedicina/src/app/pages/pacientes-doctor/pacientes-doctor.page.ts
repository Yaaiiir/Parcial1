import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth/auth';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  callOutline,
  videocam,
  calendarOutline, // 👈 Importante
  timeOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-pacientes-doctor',
  templateUrl: './pacientes-doctor.page.html',
  styleUrls: ['./pacientes-doctor.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class PacientesDoctorPage implements OnInit {
  private authService = inject(AuthService);
  private toastCtrl = inject(ToastController);

  citasPendientes: any[] = [];

  constructor() {
    // 👈 Registra el icono de calendario para el estado vacío
    addIcons({ checkmarkCircleOutline, callOutline, videocam, calendarOutline, timeOutline });
  }

  ngOnInit() {
    const user = this.authService.getUserData();
    if (user) {
      this.cargarDatos(user.id);
    }
  }

  cargarDatos(medicoId: number) {
    this.authService.getAgendaDoctor(medicoId).subscribe({
      next: (data) => {
        // Ordenamos: Las citas más próximas primero
        this.citasPendientes = data.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      },
      error: (err) => console.error('Error al cargar datos', err)
    });
  }

  async atenderCita(cita: any) {
    if (cita.tipo === 'VIDEOLLAMADA') {
      window.open('https://meet.google.com/new', '_blank'); // Abre Google Meet
    }

    this.authService.completarCita(cita.id).subscribe(async () => {
      const toast = await this.toastCtrl.create({
        message: `Consulta de ${cita.usuario.nombre} marcada como atendida`,
        duration: 2000,
        color: 'success',
        position: 'top',
        mode: 'ios'
      });
      toast.present();

      // Recargar la lista inmediatamente
      const user = this.authService.getUserData();
      this.cargarDatos(user.id);
    });
  }
}
