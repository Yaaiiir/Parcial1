import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'inicio-doctor', // 👈 Movida arriba para que Angular la encuentre primero
    loadComponent: () => import('./pages/inicio-doctor/inicio-doctor.page').then(m => m.InicioDoctorPage)
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'tab4',
    loadComponent: () => import('./recetas/tab4.page').then( m => m.Tab4Page)
  },
  {
    path: 'tab5',
    loadComponent: () => import('./analisis/tab5.page').then( m => m.Tab5Page)
  },
  {
    path: 'tab6',
    loadComponent: () => import('./historial/tab6.page').then( m => m.Tab6Page)
  },
   {
    path: 'pacientes-doctor',
    loadComponent: () => import('./pages/pacientes-doctor/pacientes-doctor.page').then( m => m.PacientesDoctorPage)
  },
  {
    path: 'pacientes-doctor',
    loadComponent: () => import('./pages/pacientes-doctor/pacientes-doctor.page').then( m => m.PacientesDoctorPage)
  },
  {
    path: 'recetas-doctor',
    loadComponent: () => import('./pages/recetas-doctor/recetas-doctor.page').then( m => m.RecetasDoctorPage)
  },
  {
    path: 'analisis-doctor',
    loadComponent: () => import('./pages/analisis-doctor/analisis-doctor.page').then( m => m.AnalisisDoctorPage)
  },
  {
    path: 'admin-dashboard',
    loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.page').then( m => m.AdminDashboardPage)
  },
  {
    path: '**', // 👈 Siempre debe ir al final de todo
    redirectTo: 'login'
  },
];
