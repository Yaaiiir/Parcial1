import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth/auth';
import { addIcons } from 'ionicons';
import {
  add, medical, trashBinOutline, personCircleOutline,
  calendarClearOutline, personOutline, medkitOutline,
  readerOutline, checkmarkDoneCircle, chevronDownOutline,
  documentTextOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-recetas-doctor',
  templateUrl: './recetas-doctor.page.html',
  styleUrls: ['./recetas-doctor.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class RecetasDoctorPage implements OnInit {
  private authService = inject(AuthService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  recetas: any[] = [];
  pacientes: any[] = [];
  isModalOpen = false;
  medicoId: number = 0;
  nombreDoctorFull: string = '';

  nuevaReceta = {
    pacienteId: null,
    medicamento: '',
    indicaciones: ''
  };

  constructor() {
    addIcons({
      add, medical, trashBinOutline, personCircleOutline,
      calendarClearOutline, personOutline, medkitOutline,
      readerOutline, checkmarkDoneCircle, chevronDownOutline,
      documentTextOutline
    });
  }

  ngOnInit() {
    const user = this.authService.getUserData();
    if (user) {
      this.medicoId = Number(user.id);
      // Guardamos el nombre completo para el campo doctorNombre de Prisma
      this.nombreDoctorFull = `${user.nombre} ${user.apellido}`;
      this.cargarRecetas();
      this.cargarPacientes();
    }
  }

  cargarRecetas() {
    this.authService.getRecetasPorMedico(this.medicoId).subscribe({
      next: (data) => this.recetas = data,
      error: (e) => console.error('Error cargando recetas:', e)
    });
  }

  cargarPacientes() {
    this.authService.getAgendaDoctor(this.medicoId).subscribe({
      next: (data) => {
        const map = new Map();
        data.forEach((c: any) => {
          if (c.usuario) map.set(c.usuario.id, c.usuario);
        });
        this.pacientes = Array.from(map.values());
      },
      error: (e) => console.error('Error cargando pacientes:', e)
    });
  }

  abrirModalReceta() {
    this.isModalOpen = true;
  }

  async guardarReceta() {
    // Verificamos que el ID del paciente exista y sea válido para evitar el NaN
    const idPacienteCasteado = Number(this.nuevaReceta.pacienteId);

    if (isNaN(idPacienteCasteado) || !this.nuevaReceta.medicamento) {
      const alert = await this.alertCtrl.create({
        header: 'Atención',
        message: 'Debes seleccionar un paciente y un medicamento válidos.',
        buttons: ['OK'],
        mode: 'ios'
      });
      await alert.present();
      return;
    }

    // Objeto ajustado a tu Prisma Schema
    const data = {
      usuarioId: idPacienteCasteado,
      medicamento: this.nuevaReceta.medicamento,
      indicaciones: this.nuevaReceta.indicaciones,
      doctorNombre: this.nombreDoctorFull, // Campo obligatorio en tu modelo Prisma
      estatus: "ACTIVA"
    };

    console.log('Enviando receta validada:', data);

    this.authService.crearReceta(data).subscribe({
      next: async () => {
        this.isModalOpen = false;
        this.nuevaReceta = { pacienteId: null, medicamento: '', indicaciones: '' };
        this.cargarRecetas();

        const toast = await this.toastCtrl.create({
          message: 'Receta emitida correctamente',
          duration: 2000,
          color: 'success',
          position: 'bottom',
          mode: 'ios'
        });
        toast.present();
      },
      error: async (err) => {
        console.error('Error Prisma/Server:', err);
        const alert = await this.alertCtrl.create({
          header: 'Error de validación',
          message: 'El servidor no pudo crear la receta. Revisa que todos los campos coincidan con el modelo.',
          buttons: ['OK'],
          mode: 'ios'
        });
        await alert.present();
      }
    });
  }

  async borrarReceta(id: number) {
    const alert = await this.alertCtrl.create({
      header: '¿Eliminar receta?',
      message: 'Esta acción no se puede deshacer.',
      mode: 'ios',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.authService.eliminarReceta(id).subscribe(() => this.cargarRecetas());
          }
        }
      ]
    });
    await alert.present();
  }
}
