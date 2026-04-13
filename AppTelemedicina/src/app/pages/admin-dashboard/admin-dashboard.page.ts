import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
  IonLabel, IonBadge, IonButton, IonIcon, IonButtons, IonSearchbar,
  IonAlert, IonActionSheet, IonFab, IonFabButton, IonAvatar, IonModal,
  IonRefresher, IonRefresherContent, IonSelect, IonSelectOption, IonInput,
  AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personAddOutline, ellipsisVertical, trashOutline,
  createOutline, powerOutline, shieldCheckmarkOutline,
  personOutline, mailOutline, callOutline, fingerPrintOutline,
  saveOutline, medicalOutline, cardOutline // <-- Nuevos iconos
} from 'ionicons/icons';
import { AuthService } from '../../services/auth/auth';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle,
    IonContent, IonList, IonItem, IonLabel, IonBadge, IonButton,
    IonIcon, IonButtons, IonSearchbar, IonAlert, IonActionSheet,
    IonFab, IonFabButton, IonAvatar, IonModal, IonInput,
    IonRefresher, IonRefresherContent, IonSelect, IonSelectOption
  ]
})
export class AdminDashboardPage implements OnInit {
  private authService = inject(AuthService);
  private navCtrl = inject(NavController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private cdr = inject(ChangeDetectorRef);

  usuarios: any[] = [];
  usuariosFiltrados: any[] = [];
  isModalOpen = false;
  isEditing = false; // <-- Controla si es edición
  usuarioIdActual: number | null = null; // <-- ID para actualizar

  nuevoUsuario = {
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    rol: 'PACIENTE',
    telefono: '',
    especialidad: '',
    cedula: ''
  };

  constructor() {
    addIcons({
      personAddOutline, ellipsisVertical, trashOutline,
      createOutline, powerOutline, shieldCheckmarkOutline,
      personOutline, mailOutline, callOutline, fingerPrintOutline,
      saveOutline, medicalOutline, cardOutline
    });
  }

  ngOnInit() {
    this.cargarUsuarios();
  }

  cargarUsuarios(event?: any) {
    this.authService.getAllUsers().subscribe({
      next: (res: any) => {
        this.usuarios = Array.isArray(res) ? res : (res?.users || []);
        this.usuariosFiltrados = [...this.usuarios];
        this.cdr.detectChanges();
        if (event) event.target.complete();
      },
      error: (err) => {
        console.error('Error al cargar:', err);
        if (event) event.target.complete();
      }
    });
  }

  buscarUsuario(event: any) {
    const texto = event.detail.value?.toLowerCase() || '';
    this.usuariosFiltrados = this.usuarios.filter(u =>
      u.nombre?.toLowerCase().includes(texto) ||
      u.apellido?.toLowerCase().includes(texto) ||
      u.email?.toLowerCase().includes(texto)
    );
  }

  // --- MÉTODOS DE MODAL ---

  abrirModalNuevo() {
    this.isEditing = false;
    this.usuarioIdActual = null;
    this.limpiarFormulario();
    this.isModalOpen = true;
  }

  abrirModalEditar(user: any) {
    this.isEditing = true;
    this.usuarioIdActual = user.id;
    // Cargamos los datos existentes (sin el password por seguridad)
    this.nuevoUsuario = {
      ...user,
      password: ''
    };
    this.isModalOpen = true;
  }

  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
    if (!isOpen) this.limpiarFormulario();
  }

  limpiarFormulario() {
    this.nuevoUsuario = {
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      rol: 'PACIENTE',
      telefono: '',
      especialidad: '',
      cedula: ''
    };
  }

  // --- LÓGICA DE GUARDADO/ACTUALIZACIÓN ---

  async guardarUsuario() {
    // Validación mínima
    if (!this.nuevoUsuario.nombre || !this.nuevoUsuario.email) {
      this.presentToast('Nombre y correo son requeridos', 'warning');
      return;
    }

    if (this.isEditing && this.usuarioIdActual) {
      // ACTUALIZAR
      this.authService.updateUser(this.usuarioIdActual, this.nuevoUsuario).subscribe({
        next: () => {
          this.presentToast('Usuario actualizado con éxito', 'success');
          this.cerrarYRefrescar();
        },
        error: () => this.presentToast('Error al actualizar', 'danger')
      });
    } else {
      // CREAR (Requiere password)
      if (!this.nuevoUsuario.password) {
        this.presentToast('La contraseña es obligatoria para nuevos usuarios', 'warning');
        return;
      }
      this.authService.createUser(this.nuevoUsuario).subscribe({
        next: () => {
          this.presentToast('Usuario creado correctamente', 'success');
          this.cerrarYRefrescar();
        },
        error: () => this.presentToast('Error al crear usuario', 'danger')
      });
    }
  }

  private cerrarYRefrescar() {
    this.setOpen(false);
    this.cargarUsuarios();
  }

  // --- ELIMINACIÓN Y OTROS ---

  async confirmarEliminar(user: any) {
    const alert = await this.alertCtrl.create({
      header: '¿Eliminar usuario?',
      message: `Borrando a ${user.nombre}. Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.eliminarUsuario(user.id)
        }
      ]
    });
    await alert.present();
  }

  async eliminarUsuario(id: number) {
    this.authService.deleteUser(id).subscribe({
      next: () => {
        this.presentToast('Usuario eliminado', 'success');
        this.cargarUsuarios();
      },
      error: () => this.presentToast('No se pudo eliminar el usuario', 'danger')
    });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  logout() {
    this.authService.logout();
    this.navCtrl.navigateRoot('/login');
  }
}
