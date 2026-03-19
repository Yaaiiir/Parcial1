import React, { useState, useEffect } from 'react';
import './App.css';
import PanelEjercicio from './components/PanelEjercicio.jsx';
import SeccionLibros from './components/SeccionLibros.jsx'; // Asegúrate de crear este archivo

function App() {
  const [isMaximized, setIsMaximized] = useState(true);
  const [ejercicios, setEjercicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  
  // ESTADOS PARA NAVEGACIÓN MEJORADA
  const [vistaActual, setVistaActual] = useState("inicio"); // 'inicio', 'libros', 'reto'
  const [ejercicioSeleccionado, setEjercicioSeleccionado] = useState(null);

  const toggleSidebar = () => setIsMaximized(!isMaximized);

  useEffect(() => {
    const obtenerEjercicios = async () => {
      try {
        const respuesta = await fetch('http://localhost:5000/api/ejercicios');
        const datos = await respuesta.json();
        setEjercicios(datos);
      } catch (error) {
        console.error("Error al conectar con el servidor:", error);
      } finally {
        setCargando(false);
      }
    };
    obtenerEjercicios();
  }, []);

  const iniciarReto = (ejercicio) => {
    setEjercicioSeleccionado(ejercicio);
    setVistaActual("reto");
  };

  const irAInicio = () => {
    setVistaActual("inicio");
    setEjercicioSeleccionado(null);
  };

  const ejerciciosFiltrados = ejercicios.filter(ex => 
    ex.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
    ex.nivel.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="app-container">
      {/* NAVBAR SUPERIOR */}
      <nav className="navbar">
        <div className="logo-container" onClick={irAInicio}>
          <img 
            src="/images/logo_itve.png" 
            alt="Logo ITVE" 
            className="nav-logo-img" 
          />
          <span className="logo-text">ITVE | AdaptiMath Academy</span>
        </div>
        
        <div className="nav-tools">
          {vistaActual === "inicio" && (
            <input 
              type="text" 
              placeholder="🔍 Buscar tema o nivel..." 
              className="search-input" 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)} 
            />
          )}
          <button className="nav-btn">Filtrar</button>
          <button className="nav-btn">Ayuda</button>
          <button className="nav-btn">Contactos</button>
        </div>
      </nav>

      <div className="main-content">
        {/* SIDEBAR IZQUIERDA */}
        <aside className={`sidebar ${isMaximized ? 'maximized' : 'minimized'}`}>
          <button className="menu-icon" onClick={toggleSidebar}>
            <div className="menu-line"></div>
            <div className="menu-line"></div>
            <div className="menu-line"></div>
          </button>
          
          <ul className="side-menu">
            <li 
              className={vistaActual === "inicio" ? "active" : ""} 
              onClick={irAInicio} 
              title="Inicio"
            >
              <span className="icon-box">🏠</span>
              {isMaximized && <span className="menu-text">Inicio</span>}
            </li>
            <li 
              className={vistaActual === "libros" ? "active" : ""} 
              onClick={() => setVistaActual("libros")} 
              title="Libros"
            >
              <span className="icon-box">📚</span>
              {isMaximized && <span className="menu-text">Libros</span>}
            </li>
            <li title="Videos">
              <span className="icon-box">🎥</span>
              {isMaximized && <span className="menu-text">Videos</span>}
            </li>
            <li title="Formulas">
              <span className="icon-box">📐</span>
              {isMaximized && <span className="menu-text">Fórmulas</span>}
            </li>
            <li title="Problemas Resueltos">
              <span className="icon-box">✅</span>
              {isMaximized && <span className="menu-text">Problemas Resueltos</span>}
            </li>
          </ul>
        </aside>

        {/* AREA DE CONTENIDO DINÁMICO */}
        <main className="content-area">
          {vistaActual === "reto" ? (
            <PanelEjercicio 
              ejercicio={ejercicioSeleccionado} 
              alVolver={irAInicio} 
            />
          ) : vistaActual === "libros" ? (
            <SeccionLibros />
          ) : (
            <>
              <section className="hero-section">
                <div className="hero-text-content">
                  <h1>INSTITUTO TECNOLÓGICO DE VANGUARDIA EDUCATIVA</h1>
                  <p>Potenciando tu aprendizaje con tecnología adaptativa y precisión matemática</p>
                </div>
              </section>

              {cargando ? (
                <div className="loading-msg">Conectando con la base de datos ITVE...</div>
              ) : (
                <div className="exercise-grid">
                  {ejerciciosFiltrados.length > 0 ? (
                    ejerciciosFiltrados.map((ex, index) => (
                      <div 
                        key={ex.id} 
                        className="level-card fade-in-up"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <span className={`level-badge ${ex.badge}`}>{ex.nivel}</span>
                        <img src={ex.imagen_url} className="card-image" alt={ex.titulo} />
                        <div className="card-body">
                          <h3>{ex.titulo}</h3>
                          <p>{ex.descripcion}</p>
                          <button className="btn-exercise" onClick={() => iniciarReto(ex)}>
                            Empezar Reto
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">No se encontraron resultados para "{busqueda}"</div>
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