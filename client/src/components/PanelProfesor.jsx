import React, { useState } from 'react';
import '../App.css';
// Importamos los componentes especializados
import TemasMatematicosProfesor from './TemasMatematicosProfesor.jsx';
import GestionMaterias from './GestionMaterias.jsx'; 
import Estudiantes from './Estudiantes.jsx';
import Reportes from './Reportes.jsx'; // Nuevo componente importado

const PanelProfesor = ({ usuario, cerrarSesion }) => {
    const [isMaximized, setIsMaximized] = useState(true);
    // Vistas: 'inicio', 'estudiantes', 'temas', 'materia', 'reporte'
    const [vistaActual, setVistaActual] = useState("inicio");

    const toggleSidebar = () => setIsMaximized(!isMaximized);

    return (
        <div className="app-container">
            {/* NAVBAR SUPERIOR */}
            <nav className="navbar">
                <div className="logo-container" onClick={() => setVistaActual("inicio")} style={{cursor: 'pointer'}}>
                    <img src="/images/logo_itve.png" alt="Logo ITVE" className="nav-logo-img" />
                    <span className="logo-text">ITVE | Panel Profesor</span>
                </div>
                
                <div className="nav-tools">
                    <div className="user-info-badge">
                        <span className="user-badge">👨‍🏫 Prof. {usuario.nombre}</span>
                        <small className="user-sub" style={{color: '#ccc', marginLeft: '10px'}}>{usuario.nivel}</small>
                    </div>
                    <button className="nav-btn" onClick={cerrarSesion}>Salir</button>
                </div>
            </nav>

            <div className="main-content">
                {/* SIDEBAR NAVEGACIÓN */}
                <aside className={`sidebar ${isMaximized ? 'maximized' : 'minimized'}`}>
                    <button className="menu-icon" onClick={toggleSidebar}>
                        <div className="menu-line"></div>
                        <div className="menu-line"></div>
                        <div className="menu-line"></div>
                    </button>
                    
                    <ul className="side-menu">
                        <li className={vistaActual === "inicio" ? "active" : ""} onClick={() => setVistaActual("inicio")}>
                            <span className="icon-box">🏠</span>
                            {isMaximized && <span className="menu-text">Inicio</span>}
                        </li>
                        <li className={vistaActual === "estudiantes" ? "active" : ""} onClick={() => setVistaActual("estudiantes")}>
                            <span className="icon-box">👥</span>
                            {isMaximized && <span className="menu-text">Estudiantes</span>}
                        </li>
                        <li className={vistaActual === "temas" ? "active" : ""} onClick={() => setVistaActual("temas")}>
                            <span className="icon-box">📐</span>
                            {isMaximized && <span className="menu-text">Temas Matemáticos</span>}
                        </li>
                        <li className={vistaActual === "materia" ? "active" : ""} onClick={() => setVistaActual("materia")}>
                            <span className="icon-box">📖</span>
                            {isMaximized && <span className="menu-text">Materia</span>}
                        </li>
                        <li className={vistaActual === "reporte" ? "active" : ""} onClick={() => setVistaActual("reporte")}>
                            <span className="icon-box">📊</span>
                            {isMaximized && <span className="menu-text">Reporte</span>}
                        </li>
                    </ul>
                </aside>

                {/* AREA DE CONTENIDO DINÁMICO */}
                <main className="content-area">
                    {vistaActual === "inicio" && (
                        <section className="hero-section">
                            <div className="hero-text-content">
                                <h1>Bienvenido, {usuario.nombre}</h1>
                                <p>Gestione sus materias y analice el progreso de sus alumnos de <strong>{usuario.nivel}</strong>.</p>
                            </div>
                        </section>
                    )}

                    <div className="panel-dinamico-content" style={{ padding: '20px' }}>
                        
                        {/* 1. SECCIÓN DE TEMAS (EJERCICIOS) */}
                        {vistaActual === "temas" && <TemasMatematicosProfesor usuario={usuario} />}

                        {/* 2. SECCIÓN DE MATERIA */}
                        {vistaActual === "materia" && <GestionMaterias usuario={usuario} />}

                        {/* 3. SECCIÓN DE ESTUDIANTES */}
                        {vistaActual === "estudiantes" && <Estudiantes usuario={usuario} />}

                        {/* 4. SECCIÓN DE REPORTE (Vinculado al historial de reportes) */}
                        {vistaActual === "reporte" && <Reportes usuario={usuario} />}

                    </div>
                </main>
            </div>
        </div>
    );
};

export default PanelProfesor;