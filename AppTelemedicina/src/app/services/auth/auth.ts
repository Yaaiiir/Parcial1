import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);

  // IP configurada según tu entorno local
  private apiUrl = 'http://192.168.0.188:3000/api';

  private currentUser: any = null;
  private medicoSeleccionado: any = null;

  /**
   * --- AUTENTICACIÓN & SESIÓN ---
   */
  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((res: any) => {
        if (res && res.success) {
          this.setUserData(res.user);
        }
      })
    );
  }

  setUserData(user: any) {
    this.currentUser = user;
    localStorage.setItem('user_telemed', JSON.stringify(user));
  }

  getUserData() {
    if (!this.currentUser) {
      const saved = localStorage.getItem('user_telemed');
      try {
        this.currentUser = saved ? JSON.parse(saved) : null;
      } catch (e) {
        this.currentUser = null;
      }
    }
    return this.currentUser;
  }

  logout() {
    this.currentUser = null;
    this.medicoSeleccionado = null;
    localStorage.removeItem('user_telemed');
  }

  /**
   * --- SEGURIDAD (PERFIL) ---
   */
  updatePassword(email: string, oldPass: string, newPass: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-password`, {
      email,
      oldPass,
      newPass
    });
  }

  /**
   * --- PACIENTES & CITAS ---
   */
  getMedicos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/medicos`);
  }

  getConsultas(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/consultas/${userId}`);
  }

  agendarCita(citaData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/consultas`, citaData);
  }

  /**
   * --- GESTIÓN DE MÉDICO TEMPORAL ---
   */
  setMedicoTemporal(medico: any) {
    this.medicoSeleccionado = medico;
  }

  getMedicoTemporal() {
    const medico = this.medicoSeleccionado;
    this.medicoSeleccionado = null;
    return medico;
  }

  /**
   * --- DASHBOARD DOCTOR ---
   */
  getAgendaDoctor(medicoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/doctor/agenda/${medicoId}`);
  }

  completarCita(citaId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/consultas/${citaId}/completar`, {});
  }

  getAnalisis(medicoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/doctor/analisis/${medicoId}`);
  }

  /**
   * --- CRUD & CONSULTA DE RECETAS ---
   */
  getRecetasUsuario(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/recetas/usuario/${userId}`);
  }

  getRecetasPorMedico(medicoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/recetas/medico/${medicoId}`);
  }

  crearReceta(recetaData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/recetas`, recetaData);
  }

  eliminarReceta(recetaId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/recetas/${recetaId}`);
  }

  /**
   * --- MÓDULO DE ADMINISTRACIÓN (CRUD DE USUARIOS) ---
   */

  // Obtener todos los usuarios de la base de datos
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios`);
  }

  // Crear un nuevo usuario (Médico o Paciente) desde el panel de Admin
  createUser(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/usuarios`, userData);
  }

  // Actualizar datos de un usuario existente
  updateUser(id: number, userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/usuarios/${id}`, userData);
  }

  // Eliminar usuario permanentemente
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/usuarios/${id}`);
  }
}
