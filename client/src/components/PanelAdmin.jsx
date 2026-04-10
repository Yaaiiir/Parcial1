import React, { useState, useEffect } from 'react';
import '../App.css';
import Estudiantes from './Estudiantes.jsx';
import TemasMatematicosProfesor from './TemasMatematicosProfesor.jsx';
import GestionDocente from './GestionDocente.jsx';
import ReportesAdmin from './ReportesAdmin.jsx';
import GestionMateriasAdmin from './GestionMateriasAdmin.jsx';

// --- COMPONENTE INTERNO PARA EL CRUD DE USUARIOS ---
const GestionUsuariosAdmin = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [form, setForm] = useState({ nombre: '', correo: '', password: '', rol: 'estudiante' });

    const cargarUsuarios = () => {
        fetch('http://localhost:5000/api/usuarios')
            .then(res => res.json())
            .then(data => setUsuarios(data))
            .catch(err => console.error("Error:", err));
    };

    useEffect(() => { cargarUsuarios(); }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        fetch('http://localhost:5000/api/usuarios/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        }).then(() => {
            alert("Usuario registrado con éxito");
            setForm({ nombre: '', correo: '', password: '', rol: 'estudiante' });
            cargarUsuarios();
        });
    };

    const eliminarUsuario = (id) => {
        if (window.confirm("¿Seguro que deseas eliminar este usuario?")) {
            fetch(`http://localhost:5000/api/usuarios/${id}`, { method: 'DELETE' })
                .then(() => cargarUsuarios());
        }
    };

    return (
        <div className="crud-usuarios-container fade-in">
            <div className="header-flex">
                <h3><span className="icon-circle">👤</span> Gestión de Cuentas</h3>
                <p className="text-muted">Administra el acceso de profesores y estudiantes al sistema.</p>
            </div>

            <div className="form-card shadow-sm">
                <form onSubmit={handleSubmit} className="row g-3 align-items-end">
                    <div className="col-md-3">
                        <label className="form-label-custom">Nombre Completo</label>
                        <input type="text" className="form-control-custom" placeholder="Ej. Juan Pérez" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label-custom">Correo Institucional</label>
                        <input type="email" className="form-control-custom" placeholder="correo@itve.com" value={form.correo} onChange={e => setForm({...form, correo: e.target.value})} required />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label-custom">Contraseña</label>
                        <input type="password" className="form-control-custom" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
                    </div>
                    <div className="col-md-2">
                        <label className="form-label-custom">Rol de Usuario</label>
                        <select className="form-select-custom" value={form.rol} onChange={e => setForm({...form, rol: e.target.value})}>
                            <option value="estudiante">Estudiante</option>
                            <option value="profesor">Profesor</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <button type="submit" className="btn-registrar-modern">
                            <span>+</span> Registrar
                        </button>
                    </div>
                </form>
            </div>

            <div className="table-card shadow-sm mt-4">
                <table className="table-modern">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Contacto</th>
                            <th>Tipo de Rol</th>
                            <th className="text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map(u => (
                            <tr key={u.id}>
                                <td className="td-name">
                                    <div className="user-avatar">{u.nombre?.charAt(0)}</div>
                                    {u.nombre}
                                </td>
                                <td>{u.correo}</td>
                                <td>
                                    <span className={`badge-modern ${u.rol}`}>
                                        {u.rol}
                                    </span>
                                </td>
                                <td className="text-center">
                                    <button className="btn-delete-icon" onClick={() => eliminarUsuario(u.id)} title="Eliminar Usuario">
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---
const PanelAdmin = ({ usuario, cerrarSesion }) => {
    const [isMaximized, setIsMaximized] = useState(true);
    const [vistaActual, setVistaActual] = useState("inicio");
    const [notificaciones, setNotificaciones] = useState([]);
    const [solicitudesPass, setSolicitudesPass] = useState([]); 
    const [showPopOver, setShowPopOver] = useState(false);
    const [stats, setStats] = useState({
        total_estudiantes: 0,
        total_profesores: 0,
        total_ejercicios: 0
    });

    const toggleSidebar = () => setIsMaximized(!isMaximized);

    const cargarDatos = () => {
        // Estadísticas generales
        fetch('http://localhost:5000/api/admin/estadisticas')
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error("Error en stats:", err));

        // Reportes académicos (originales)
        fetch('http://localhost:5000/api/admin/reportes-detallados')
            .then(res => res.json())
            .then(data => setNotificaciones(data || []))
            .catch(err => console.error("Error en notificaciones:", err));

        // Solicitudes de sistema (Categoría: Actualización / Soporte)
        fetch('http://localhost:5000/api/reportes-admin?categoria=Actualización')
            .then(res => res.json())
            .then(data => setSolicitudesPass(data.filter(r => r.estado === 'pendiente') || []))
            .catch(err => console.error("Error en solicitudes pass:", err));
    };

    useEffect(() => {
        cargarDatos();
        const intervalo = setInterval(cargarDatos, 15000); // Recarga cada 15s para sentirlo "en vivo"
        return () => clearInterval(intervalo);
    }, [vistaActual]);

    // Función para limpiar notificaciones al ver los reportes
    const marcarTodoComoVisto = async () => {
        try {
            // 1. Marcar reportes de contraseña/sistema como revisados
            for (const s of solicitudesPass) {
                await fetch(`http://localhost:5000/api/reportes-admin/${s.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: 'revisado' })
                });
            }

            // Nota: Los reportes académicos usualmente se archivan individualmente dentro de ReportesAdmin.jsx
            // Pero aquí refrescamos la vista para que el contador baje.
            cargarDatos();
            setShowPopOver(false);
            setVistaActual("reportes");
        } catch (error) {
            console.error("Error al atender notificaciones:", error);
        }
    };

    const handleVerReportes = () => {
        marcarTodoComoVisto();
    };

    return (
        <div className="app-container admin-theme">
            <nav className="navbar" style={{ borderBottom: '3px solid #007bff' }}>
                <div className="logo-container" onClick={() => setVistaActual("inicio")} style={{cursor: 'pointer'}}>
                    <img src="/images/logo_itve.png" alt="Logo ITVE" className="nav-logo-img" />
                    <span className="logo-text">ITVE | Administrador</span>
                </div>
                
                <div className="nav-tools">
                    <div className="notification-wrapper">
                        <div className="notification-container" onClick={() => setShowPopOver(!showPopOver)}>
                            <span className="bell-icon">🔔</span>
                            {(notificaciones.length + solicitudesPass.length) > 0 && (
                                <span className="bell-badge">{notificaciones.length + solicitudesPass.length}</span>
                            )}
                        </div>

                        {showPopOver && (
                            <div className="notifications-popover shadow-lg">
                                <div className="popover-header">
                                    <span style={{ color: '#1a1a1a', fontWeight: 'bold' }}>Centro de Notificaciones</span>
                                    <button className="close-notif" onClick={() => setShowPopOver(false)}>×</button>
                                </div>
                                <div className="popover-body">
                                    {/* SECCIÓN DE SOLICITUDES DE CONTRASEÑA */}
                                    {solicitudesPass.length > 0 && (
                                        <div className="notif-section">
                                            <p className="section-title">🔑 Recuperación de cuenta</p>
                                            {solicitudesPass.map(s => (
                                                <div key={s.id} className="notif-item highlight-pass" onClick={handleVerReportes}>
                                                    <p>Solicitud de: <strong>{s.autor_nombre}</strong></p>
                                                    <small>{s.descripcion.substring(0, 50)}...</small>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* SECCIÓN DE REPORTES ACADÉMICOS */}
                                    <p className="section-title">📊 Reportes Académicos</p>
                                    {notificaciones.length === 0 && solicitudesPass.length === 0 ? (
                                        <div className="no-notif text-center p-3">
                                            <strong style={{ color: '#444' }}>Buzón vacío</strong>
                                        </div>
                                    ) : (
                                        notificaciones.slice(0, 3).map(n => (
                                            <div key={n.id} className="notif-item" onClick={handleVerReportes}>
                                                <div className="notif-bullet enviado"></div>
                                                <div className="notif-content">
                                                    <p className="notif-title">Reporte: {n.nombre_estudiante}</p>
                                                    <small className="text-muted">{n.nombre_materia}</small>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="popover-footer" onClick={handleVerReportes}>
                                    Atender todas las solicitudes
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="user-info-badge">
                        <span className="user-badge">🛡️ Admin: {usuario.nombre}</span>
                    </div>
                    <button className="nav-btn logout-admin" onClick={cerrarSesion}>Cerrar Sistema</button>
                </div>
            </nav>

            <div className="main-content">
                <aside className={`sidebar ${isMaximized ? 'maximized' : 'minimized'}`}>
                    <button className="menu-icon" onClick={toggleSidebar}>
                        <div className="menu-line"></div>
                        <div className="menu-line"></div>
                        <div className="menu-line"></div>
                    </button>
                    
                    <ul className="side-menu">
                        <li className={vistaActual === "inicio" ? "active" : ""} onClick={() => setVistaActual("inicio")}>
                            <span className="icon-box">🏠</span>
                            {isMaximized && <span className="menu-text">Panel Control</span>}
                        </li>
                        <li className={vistaActual === "usuarios_crud" ? "active" : ""} onClick={() => setVistaActual("usuarios_crud")}>
                            <span className="icon-box">🆔</span>
                            {isMaximized && <span className="menu-text">Gestionar Cuentas</span>}
                        </li>
                        <li className={vistaActual === "materias" ? "active" : ""} onClick={() => setVistaActual("materias")}>
                            <span className="icon-box">📓</span>
                            {isMaximized && <span className="menu-text">Materias</span>}
                        </li>
                        <li className={vistaActual === "estudiantes" ? "active" : ""} onClick={() => setVistaActual("estudiantes")}>
                            <span className="icon-box">👥</span>
                            {isMaximized && <span className="menu-text">Alumnos Global</span>}
                        </li>
                        <li className={vistaActual === "profesores" ? "active" : ""} onClick={() => setVistaActual("profesores")}>
                            <span className="icon-box">👨‍🏫</span>
                            {isMaximized && <span className="menu-text">Gestión Docente</span>}
                        </li>
                        <li className={vistaActual === "temas" ? "active" : ""} onClick={() => setVistaActual("temas")}>
                            <span className="icon-box">📚</span>
                            {isMaximized && <span className="menu-text">Contenido App</span>}
                        </li>
                        <li className={vistaActual === "reportes" ? "active" : ""} onClick={() => setVistaActual("reportes")}>
                            <span className="icon-box">📊</span>
                            {isMaximized && <span className="menu-text">Reportes</span>}
                        </li>
                    </ul>
                </aside>

                <main className="content-area">
                    {vistaActual === "inicio" && (
                        <>
                            <section className="hero-section admin-hero">
                                <div className="hero-text-content">
                                    <h1>Estado del Sistema ITVE</h1>
                                    <p>Panel de supervisión para <strong>{usuario.nombre}</strong></p>
                                </div>
                            </section>

                            <div className="admin-dashboard-grid">
                                <div className="stat-card card-blue">
                                    <h3>{stats.total_estudiantes}</h3>
                                    <p>Estudiantes Totales</p>
                                </div>
                                <div className="stat-card card-green">
                                    <h3>{stats.total_profesores}</h3>
                                    <p>Cuerpo Docente</p>
                                </div>
                                <div className="stat-card card-yellow">
                                    <h3>{stats.total_ejercicios}</h3>
                                    <p>Temas Cargados</p>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="panel-dinamico-content" style={{ padding: '20px' }}>
                        {vistaActual === "usuarios_crud" && <GestionUsuariosAdmin />}
                        {vistaActual === "materias" && <GestionMateriasAdmin />}
                        {vistaActual === "estudiantes" && <Estudiantes usuario={{...usuario, nivel: 'todos'}} />}
                        {vistaActual === "profesores" && <GestionDocente />}
                        {vistaActual === "temas" && <TemasMatematicosProfesor usuario={{...usuario, nivel: 'todos'}} />}
                        {vistaActual === "reportes" && <ReportesAdmin />}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PanelAdmin;