import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonAvatar,
  IonList, IonItem, IonLabel, IonIcon, IonButton, IonBadge,
  IonButtons, NavController, AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline, settingsOutline, logOutOutline,
  shieldCheckmarkOutline, cardOutline, helpCircleOutline,
  chevronForwardOutline, waterOutline, mailOutline, locationOutline,
  lockClosedOutline
} from 'ionicons/icons';
import { AuthService } from '../services/auth/auth';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonAvatar,
    IonList, IonItem, IonLabel, IonIcon, IonButton, IonBadge,
    IonButtons
  ]
})
export class Tab3Page implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private navCtrl = inject(NavController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  userNombre: string = '';
  userApellido: string = '';
  userEmail: string = '';
  userRol: string = '';
  userInicial: string = '';

  constructor() {
    addIcons({
      personOutline, settingsOutline, logOutOutline,
      shieldCheckmarkOutline, cardOutline, helpCircleOutline,
      chevronForwardOutline, waterOutline, mailOutline, locationOutline,
      lockClosedOutline
    });
  }

  ngOnInit() {
    this.cargarDatosPerfil();
  }

  cargarDatosPerfil() {
    const userData = this.authService.getUserData();
    if (userData) {
      this.userNombre = userData.nombre;
      this.userApellido = userData.apellido || '';
      this.userEmail = userData.email;
      this.userRol = userData.rol;
      this.userInicial = userData.nombre ? userData.nombre.charAt(0).toUpperCase() : 'U';
    }
  }

  async irAInformacionPersonal() {
    const alert = await this.alertCtrl.create({
      header: 'Información Personal',
      subHeader: 'Datos de tu cuenta',
      message: `
        <strong>Nombre:</strong> ${this.userNombre} ${this.userApellido}<br>
        <strong>Email:</strong> ${this.userEmail}<br>
        <strong>Rol:</strong> ${this.userRol}
      `,
      buttons: ['Entendido']
    });
    await alert.present();
  }

  // --- LÓGICA DE SEGURIDAD ACTUALIZADA ---
  async irASeguridad() {
    const alert = await this.alertCtrl.create({
      header: 'Cambiar Contraseña',
      inputs: [
        {
          name: 'currentPassword',
          type: 'password',
          placeholder: 'Contraseña actual'
        },
        {
          name: 'newPassword',
          type: 'password',
          placeholder: 'Nueva contraseña'
        },
        {
          name: 'confirmPassword',
          type: 'password',
          placeholder: 'Confirmar nueva contraseña'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Actualizar',
          handler: (data) => {
            this.procesarCambioPassword(data);
          }
        }
      ]
    });

    await alert.present();
  }

  async procesarCambioPassword(data: any) {
    // Validaciones básicas antes de enviar al servidor
    if (!data.currentPassword || !data.newPassword) {
      this.mostrarToast('Por favor, completa todos los campos', 'warning');
      return false;
    }

    if (data.newPassword !== data.confirmPassword) {
      this.mostrarToast('Las nuevas contraseñas no coinciden', 'danger');
      return false;
    }

    // Llamada al servicio (Asegúrate de tener updatePassword en tu AuthService)
    this.authService.updatePassword(this.userEmail, data.currentPassword, data.newPassword).subscribe({
      next: (res) => {
        this.mostrarToast('Contraseña actualizada correctamente', 'success');
      },
      error: (err) => {
        this.mostrarToast(err.error?.message || 'Error al actualizar', 'danger');
      }
    });
    return true;
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  irAMetodosPago() {
    alert('Sección de Métodos de Pago en mantenimiento.');
  }

  irAAyuda() {
    window.open('https://wa.me/521234567890', '_blank');
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
