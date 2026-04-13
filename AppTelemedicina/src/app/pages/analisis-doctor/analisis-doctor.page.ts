import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth/auth';
import { HttpClient } from '@angular/common/http';
import { addIcons } from 'ionicons';
import {
  peopleOutline, timeOutline, trash, addCircle, clipboardOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-analisis-doctor',
  templateUrl: './analisis-doctor.page.html',
  styleUrls: ['./analisis-doctor.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class AnalisisDoctorPage implements OnInit {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private toastCtrl = inject(ToastController);

  apiUrl = 'http://192.168.56.1:3000/api';
  medicoId: number = 0;
  totalCitas = 0;
  totalPacientes = 0;
  metas: any[] = [];
  nuevaMetaTitulo: string = '';

  constructor() {
    addIcons({ peopleOutline, timeOutline, trash, addCircle, clipboardOutline });
  }

  ngOnInit() {
    const user = this.authService.getUserData();
    if (user) {
      this.medicoId = Number(user.id);
      this.cargarMetas();
      this.cargarMetricas();
    }
  }

  cargarMetas() {
    this.http.get<any[]>(`${this.apiUrl}/analisis/metas/${this.medicoId}`).subscribe({
      next: (res) => this.metas = res,
      error: (err) => console.error('Error:', err)
    });
  }

  async agregarMeta() {
    if (!this.nuevaMetaTitulo.trim()) return;
    const body = { titulo: this.nuevaMetaTitulo, medicoId: this.medicoId, completada: false };
    this.http.post(`${this.apiUrl}/analisis/metas`, body).subscribe({
      next: () => {
        this.nuevaMetaTitulo = '';
        this.cargarMetas();
        this.presentToast('Meta añadida');
      }
    });
  }

  toggleMeta(meta: any) {
    const nuevoEstado = !meta.completada;
    this.http.put(`${this.apiUrl}/analisis/metas/${meta.id}`, { completada: nuevoEstado }).subscribe({
      next: () => {
        meta.completada = nuevoEstado;
        this.presentToast(nuevoEstado ? '¡Cumplida!' : 'Pendiente');
      }
    });
  }

  borrarMeta(id: number) {
    this.http.delete(`${this.apiUrl}/analisis/metas/${id}`).subscribe({
      next: () => {
        this.metas = this.metas.filter(m => m.id !== id);
        this.presentToast('Objetivo eliminado');
      }
    });
  }

  cargarMetricas() {
    this.authService.getAgendaDoctor(this.medicoId).subscribe(data => {
      this.totalCitas = data.length;
      this.totalPacientes = new Set(data.map((c: any) => c.usuarioId)).size;
    });
  }

  async presentToast(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 1500,
      position: 'bottom',
      color: 'dark'
    });
    toast.present();
  }
}
