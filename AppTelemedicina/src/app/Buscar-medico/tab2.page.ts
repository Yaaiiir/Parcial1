import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar,
  IonIcon, IonButton, IonAvatar, IonList, IonItem, IonLabel,
  IonButtons, IonBackButton, NavController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  appsOutline, heartOutline, fitnessOutline, eyeOutline, star,
  searchOutline, timeOutline, locationOutline, chevronForwardOutline
} from 'ionicons/icons';
import { AuthService } from '../services/auth/auth';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle,
    IonContent, IonSearchbar, IonIcon, IonButton, IonAvatar,
    IonList, IonItem, IonLabel, IonButtons, IonBackButton
  ]
})
export class Tab2Page implements OnInit {
  private authService = inject(AuthService);
  private navCtrl = inject(NavController);

  medicosFull: any[] = [];
  medicosFiltrados: any[] = [];
  categoriaSeleccionada: string = 'Todas';
  textoBusqueda: string = '';

  constructor() {
    addIcons({
      appsOutline, heartOutline, fitnessOutline, eyeOutline,
      star, searchOutline, timeOutline, locationOutline, chevronForwardOutline
    });
  }

  ngOnInit() {
    this.cargarMedicos();
  }

  cargarMedicos() {
    this.authService.getMedicos().subscribe({
      next: (res: any) => {
        this.medicosFull = res;
        this.medicosFiltrados = [...this.medicosFull];
      },
      error: (err) => console.error('Error al obtener médicos en Tab2:', err)
    });
  }

  filtrarPorCategoria(categoria: string) {
    this.categoriaSeleccionada = categoria;
    this.aplicarFiltros();
  }

  buscarMedico(event: any) {
    this.textoBusqueda = (event.detail.value || '').toLowerCase();
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    this.medicosFiltrados = this.medicosFull.filter(doc => {
      const nombreCompleto = `${doc.nombre} ${doc.apellido || ''}`.toLowerCase();
      const especialidad = (doc.especialidad || '').toLowerCase();
      const coincideBusqueda = nombreCompleto.includes(this.textoBusqueda) ||
                               especialidad.includes(this.textoBusqueda);
      const coincideCat = this.categoriaSeleccionada === 'Todas' ||
                          doc.especialidad.includes(this.categoriaSeleccionada);
      return coincideBusqueda && coincideCat;
    });
  }

  // MÉTODO ACTUALIZADO: Envía al médico y redirige
  abrirAgendar(medico: any) {
    console.log('Preparando agendamiento para:', medico.nombre);

    // 1. Guardamos el médico en el "puente" del servicio
    this.authService.setMedicoTemporal(medico);

    // 2. Redirigimos al Tab1 (donde está el modal de agendar)
    this.navCtrl.navigateRoot('/tabs/tab1');
  }
}
