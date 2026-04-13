import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList,
  IonItem, IonLabel, IonIcon, IonButton, IonBadge, IonProgressBar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  flaskOutline, documentAttachOutline, checkmarkCircleOutline,
  hourglassOutline, chevronForwardOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-tab5',
  templateUrl: 'tab5.page.html',
  styleUrls: ['tab5.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonIcon, IonButton, IonBadge, IonProgressBar
  ]
})
export class Tab5Page {
  estudios = [
    {
      id: 101,
      nombre: 'Biometría Hemática',
      laboratorio: 'Laboratorios San José',
      fecha: '24 Mar 2026',
      estado: 'Listo',
      progreso: 1.0
    },
    {
      id: 102,
      nombre: 'Perfil de Lípidos',
      laboratorio: 'Análisis Oaxaca',
      fecha: '25 Mar 2026',
      estado: 'En Proceso',
      progreso: 0.6
    }
  ];

  constructor() {
    addIcons({
      flaskOutline, documentAttachOutline, checkmarkCircleOutline,
      hourglassOutline, chevronForwardOutline
    });
  }
}
