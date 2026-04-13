import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth/auth';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  videocam,
  people,
  medical,
  flask,
  timeOutline,
  calendarClearOutline,
  calendarOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-inicio-doctor',
  templateUrl: './inicio-doctor.page.html',
  styleUrls: ['./inicio-doctor.page.scss'],
  standalone: true,
  // Asegúrate de incluir IonicModule para que reconozca ion-content, ion-card, etc.
  imports: [IonicModule, CommonModule, FormsModule]
})
export class InicioDoctorPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  doctorName: string = '';
  agenda: any[] = [];

  constructor() {
    // Registramos todos los iconos que usa tu nuevo diseño UI
    addIcons({
      logOutOutline,
      videocam,
      people,
      medical,
      flask,
      timeOutline,
      calendarClearOutline,
      calendarOutline
    });
  }

  ngOnInit() {
    const user = this.authService.getUserData();
    console.log('Usuario en Inicio Doctor:', user);

    if (user && user.rol === 'MEDICO') {
      this.doctorName = user.nombre;
      this.cargarAgenda(user.id);
    } else {
      // Si por alguna razón el rol no es médico, lo regresamos al login
      console.warn('Acceso no autorizado o sesión expirada');
      this.logout();
    }
  }

  /**
   * Carga las citas desde el backend usando la IP configurada en el AuthService
   */
  cargarAgenda(medicoId: number) {
    this.authService.getAgendaDoctor(medicoId).subscribe({
      next: (data) => {
        // Ordenar: Las más próximas primero
        this.agenda = data.sort((a, b) =>
          new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );
        console.log('Agenda del doctor cargada:', this.agenda);
      },
      error: (err) => {
        console.error('Error al conectar con el servidor:', err);
        this.agenda = [];
      }
    });
  }

  // --- NAVEGACIÓN ---

  irAPacientes() {
    console.log('Navegando a Gestión de Pacientes...');
    this.router.navigate(['/pacientes-doctor']);
  }

  irARecetas() {
    console.log('Navegando a CRUD Recetas...');
    // Cuando crees la página con: ionic g page pages/recetas-doctor
    this.router.navigate(['/recetas-doctor']);
  }

  irAAnalisis() {
    console.log('Navegando a CRUD Análisis...');
    // Cuando crees la página con: ionic g page pages/analisis-doctor
    this.router.navigate(['/analisis-doctor']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
