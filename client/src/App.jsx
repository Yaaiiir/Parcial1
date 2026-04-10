import React, { useState, useEffect } from 'react';
import './App.css';

// Componentes
import Login from './components/Login.jsx';
import PanelEjercicio from './components/PanelEjercicio.jsx';
import SeccionLibros from './components/SeccionLibros.jsx'; 
import SeccionVideos from './components/SeccionVideos.jsx'; 
import SeccionFormulas from './components/SeccionFormulas.jsx'; 
import ProblemasResueltos from './components/ProblemasResueltos.jsx';
import PanelProfesor from './components/PanelProfesor.jsx';
import PanelAdmin from './components/PanelAdmin.jsx';

function App() {
  // --- ESTADOS ---
  const [usuario, setUsuario] = useState(null);
  const [isMaximized, setIsMaximized] = useState(true);
  const [ejercicios, setEjercicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [vistaActual, setVistaActual] = useState("inicio"); 
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState(null);

  // --- EFECTOS ---
  useEffect(() => {
    // Solo cargamos ejercicios si el usuario es un estudiante
    if (usuario && usuario.rol?.toLowerCase().trim() === 'estudiante') {
      const obtenerEjerciciosPersonalizados = async () => {
        setCargando(true);
        try {
          // MODIFICACIÓN: Ahora pedimos los ejercicios generales (puedes filtrar por nivel si quieres)
          const respuesta = await fetch('http://localhost:5000/api/ejercicios');
          const datos = await respuesta.json();
          setEjercicios(datos || []);
        } catch (error) {
          console.error("Error al conectar con el servidor ITVE:", error);
        } finally {
          setCargando(false);
        }
      };
      obtenerEjerciciosPersonalizados();
    }
  }, [usuario]);

  // --- FUNCIONES ---
  const cerrarSesion = () => {
    setUsuario(null);
    setVistaActual("inicio");
    setEjercicioSeleccionado(null);
    setBusqueda("");
  };

  const irAInicio = () => {
    setVistaActual("inicio");
    setEjercicioSeleccionado(null);
  };

  const iniciarReto = (ejercicio) => {
    setEjercicioSeleccionado(ejercicio);
    setVistaActual("reto");
  };

  const ejerciciosFiltrados = ejercicios.filter(ex => 
    ex.titulo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    ex.nivel?.toLowerCase().includes(busqueda.toLowerCase()) ||
    ex.tema_padre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // 1. Pantalla de Login (Si no hay usuario)
  if (!usuario) {
    return <Login alLoguear={setUsuario} />;
  }

  const ROL = usuario.rol.toLowerCase().trim();

  // 2. Renderizado condicional por Rol
  if (ROL === 'admin') {
    return <PanelAdmin usuario={usuario} cerrarSesion={cerrarSesion} />;
  }

  if (ROL === 'profesor') {
    return <PanelProfesor usuario={usuario} cerrarSesion={cerrarSesion} />;
  }

  // 4. Interfaz de Estudiante (Default)
  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="logo-container" onClick={irAInicio} style={{cursor: 'pointer'}}>
          <img src="/images/logo_itve.png" alt="Logo ITVE" className="nav-logo-img" />
          <span className="logo-text">ITVE | AdaptiMath</span>
        </div>
        <div className="nav-tools">
          {vistaActual === "inicio" && (
            <div className="search-wrapper">
              <input 
                type="text" 
                placeholder="🔍 Buscar tema o nivel..." 
                className="search-input" 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)} 
              />
            </div>
          )}
          <div className="user-profile-nav">
             <span className="user-badge">👤 {usuario.nombre}</span>
             <span className="user-level-tag">{usuario.nivel}</span>
             <button className="logout-btn" onClick={cerrarSesion}>Cerrar Sesión</button>
          </div>
        </div>
      </nav>

      <div className="main-content">
        <aside className={`sidebar ${isMaximized ? 'maximized' : 'minimized'}`}>
          <button className="toggle-sidebar" onClick={() => setIsMaximized(!isMaximized)}>
            {isMaximized ? '❮' : '❯'}
          </button>
          <ul className="side-menu">
            <li className={vistaActual === "inicio" ? "active" : ""} onClick={irAInicio}>
              <span className="icon-box">🏠</span>
              {isMaximized && <span className="menu-text">Mi Ruta</span>}
            </li>
            <li className={vistaActual === "libros" ? "active" : ""} onClick={() => setVistaActual("libros")}>
              <span className="icon-box">📚</span>
              {isMaximized && <span className="menu-text">Biblioteca</span>}
            </li>
            <li className={vistaActual === "videos" ? "active" : ""} onClick={() => setVistaActual("videos")}>
              <span className="icon-box">🎥</span>
              {isMaximized && <span className="menu-text">Videoteca</span>}
            </li>
            <li className={vistaActual === "formulas" ? "active" : ""} onClick={() => setVistaActual("formulas")}>
              <span className="icon-box">📐</span>
              {isMaximized && <span className="menu-text">Fórmulas</span>}
            </li>
            <li className={vistaActual === "resueltos" ? "active" : ""} onClick={() => setVistaActual("resueltos")}>
              <span className="icon-box">✅</span>
              {isMaximized && <span className="menu-text">Resueltos</span>}
            </li>
          </ul>
        </aside>

        <main className="content-area">
          {vistaActual === "reto" ? (
            <PanelEjercicio 
                ejercicio={ejercicioSeleccionado} 
                usuario={usuario} 
                alVolver={irAInicio} 
            />
          ) : vistaActual === "libros" ? (
            <SeccionLibros />
          ) : vistaActual === "videos" ? (
            <SeccionVideos /> 
          ) : vistaActual === "formulas" ? (
            <SeccionFormulas />
          ) : vistaActual === "resueltos" ? (
            <ProblemasResueltos />
          ) : (
            <>
              <header className="hero-section">
                <div className="hero-text-content">
                  <h1>¡Hola, {usuario.nombre}! 👋</h1>
                  <p>Continuemos con tu aprendizaje de <strong>{usuario.nivel}</strong>.</p>
                </div>
              </header>

              {cargando ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Sincronizando con ITVE Cloud...</p>
                </div>
              ) : (
                <div className="exercise-grid">
                  {ejerciciosFiltrados.length > 0 ? (
                    ejerciciosFiltrados.map((ex, index) => (
                      <div key={ex.id || index} className="level-card fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                        <div className="card-header">
                            <span className={`level-badge ${ex.badge || 'normal'}`}>{ex.nivel}</span>
                            <span className="topic-tag">{ex.tema_padre}</span>
                        </div>
                        <img src={ex.imagen_url || "/images/placeholder.png"} className="card-image" alt={ex.titulo} />
                        <div className="card-body">
                          <h3>{ex.titulo}</h3>
                          <p className="card-desc">{ex.descripcion}</p>
                          <button className="btn-exercise-start" onClick={() => iniciarReto(ex)}>
                            Practicar Ahora
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <p>No hay temas disponibles que coincidan con tu búsqueda.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;