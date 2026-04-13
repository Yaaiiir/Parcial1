import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'tab1', // Inicio / Dashboard (Carpeta: Inicio)
        loadComponent: () => import('../Inicio/tab1.page').then((m) => m.Tab1Page),
      },
      {
        path: 'tab2', // Buscador de Médicos (Carpeta: Buscar-medico)
        loadComponent: () => import('../Buscar-medico/tab2.page').then((m) => m.Tab2Page),
      },
      {
        path: 'tab3', // Mi Perfil (Carpeta: perfil)
        loadComponent: () => import('../perfil/tab3.page').then((m) => m.Tab3Page),
      },
      {
        path: 'tab4', // Historial Clínico (Carpeta: recetas - Nota: revisa si el nombre de carpeta es correcto)
        loadComponent: () => import('../recetas/tab4.page').then((m) => m.Tab4Page),
      },
      {
        path: 'tab5', // Recetas Digitales (Carpeta: analisis)
        loadComponent: () => import('../analisis/tab5.page').then((m) => m.Tab5Page),
      },
      {
        path: 'tab6', // Análisis de Laboratorio (Carpeta: historial)
        loadComponent: () => import('../historial/tab6.page').then((m) => m.Tab6Page),
      },
      {
        path: '',
        redirectTo: '/tabs/tab1',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/tab1',
    pathMatch: 'full',
  },
];
