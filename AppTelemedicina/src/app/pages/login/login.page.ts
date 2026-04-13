import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonIcon, IonLabel, IonItem, IonInput,
  IonButton, IonText, IonSpinner, ToastController
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth';
import { addIcons } from 'ionicons';
import { mailOutline, lockClosedOutline, heart, logInOutline } from 'ionicons/icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon,
    IonLabel, IonItem, IonInput, IonButton, IonText, IonSpinner
  ]
})
export class LoginPage implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);

  isLoading = false;

  // Campos vacíos por defecto
  loginData = {
    email: '',
    password: ''
  };

  constructor() {
    addIcons({ mailOutline, lockClosedOutline, heart, logInOutline });
  }

  ngOnInit() {}

  async onLogin() {
    // Validación básica antes de enviar
    if (!this.loginData.email || !this.loginData.password) {
      this.presentToast('Por favor, rellena todos los campos', 'warning');
      return;
    }

    this.isLoading = true;

    this.authService.login(this.loginData).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          console.log('Login exitoso:', res.user.rol);

          this.authService.setUserData(res.user);
          this.handleNavigation(res.user);
        } else {
          this.isLoading = false;
          this.presentToast(res.message || 'Correo o contraseña incorrectos', 'danger');
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error de conexión:', err);
        this.presentToast('No se pudo conectar con el servidor', 'danger');
      }
    });
  }

  private handleNavigation(user: any) {
    let targetRoute = '';

    // Enrutamiento dinámico según el rol de la base de datos
    switch (user.rol) {
      case 'ADMIN':
        targetRoute = '/admin-dashboard';
        break;
      case 'MEDICO':
        targetRoute = '/inicio-doctor';
        break;
      case 'PACIENTE':
        targetRoute = '/tabs/tab1';
        break;
      default:
        targetRoute = '/login';
        break;
    }

    this.router.navigateByUrl(targetRoute, { replaceUrl: true }).then(() => {
      this.isLoading = false;
    });
  }

  // Helper para mostrar mensajes elegantes en lugar de 'alert'
  async presentToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
      mode: 'ios'
    });
    await toast.present();
  }
}
