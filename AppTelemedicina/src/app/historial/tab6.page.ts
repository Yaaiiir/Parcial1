import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList,
  IonIcon, IonLabel, IonBadge, IonButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  videocamOutline, businessOutline, calendarOutline,
  chevronForwardOutline, medicalOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-tab6',
  templateUrl: 'tab6.page.html',
  styleUrls: ['tab6.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonIcon, IonLabel, IonBadge, IonButton
  ]
})
export class Tab6Page {
  consultas = [
    {
      id: 201,
      doctor: 'Dr. Alan Martínez',
      especialidad: 'Cardiología',
      fecha: '20 Mar 2026',
      tipo: 'Videollamada',
      motivo: 'Seguimiento de presión arterial'
    },
    {
      id: 202,
      doctor: 'Dra. Elena Ríos',
      especialidad: 'Medicina General',
      fecha: '15 Feb 2026',
      tipo: 'Presencial',
      motivo: 'Chequeo anual'
    },
    {
      id: 203,
      doctor: 'Dr. Alan Martínez',
      especialidad: 'Cardiología',
      fecha: '10 Ene 2026',
      tipo: 'Presencial',
      motivo: 'Consulta inicial'
    }
  ];

  constructor() {
    addIcons({ videocamOutline, businessOutline, calendarOutline, chevronForwardOutline, medicalOutline });
  }
}
