import React, { useState, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

const PanelEjercicio = ({ ejercicio, alVolver }) => {
  const [dificultad, setDificultad] = useState(null);
  const [segundos, setSegundos] = useState(0);
  const [activo, setActivo] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [problemas, setProblemas] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [respuestaUsuario, setRespuestaUsuario] = useState("");
  const [mensajeFeedback, setMensajeFeedback] = useState("");
  
  // NUEVO: Estado para contar ejercicios completados correctamente
  const [completados, setCompletados] = useState(0);

  useEffect(() => {
    let intervalo = null;
    if (activo) {
      intervalo = setInterval(() => setSegundos((s) => s + 1), 1000);
    }
    return () => clearInterval(intervalo);
  }, [activo]);

  const cargarProblemas = async (nivel) => {
    setCargando(true);
    setDificultad(nivel);
    try {
      const response = await fetch(`http://localhost:5000/api/ejercicios-detallados/${ejercicio.id}/${nivel}`);
      if (!response.ok) throw new Error("No hay ejercicios.");
      const data = await response.json();
      
      if (data && data.length > 0) {
        setProblemas(data);
        setIndiceActual(0);
        setCompletados(0); // Reiniciar al cargar nuevo nivel
        setActivo(true);
      }
    } catch (error) {
      alert(error.message);
      setDificultad(null);
    } finally {
      setCargando(false);
    }
  };

  const verificarRespuesta = () => {
    if (!respuestaUsuario.trim() || cargando) return;
    const correcta = problemas[indiceActual]?.respuesta_correcta;
    
    if (respuestaUsuario.trim().toLowerCase() === correcta.toLowerCase()) {
      // Sumamos un acierto
      const nuevosCompletados = completados + 1;
      setCompletados(nuevosCompletados);
      setMensajeFeedback("¡Correcto! ✨");

      setTimeout(() => {
        if (indiceActual < problemas.length - 1) {
          setIndiceActual(prev => prev + 1);
          setRespuestaUsuario("");
          setMensajeFeedback("");
        } else {
          finalizarSesion();
        }
      }, 1000);
    } else {
      setMensajeFeedback("Incorrecto ❌");
      setTimeout(() => setMensajeFeedback(""), 1500);
    }
  };

  const finalizarSesion = () => {
    setActivo(false);
    setMostrarResumen(true);
  };

  const formatearTiempo = (totalSegundos) => {
    const min = Math.floor(totalSegundos / 60);
    const seg = totalSegundos % 60;
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
  };

  // CÁLCULO CORREGIDO: Basado en aciertos reales
  const porcentajeProgreso = problemas.length > 0 
    ? Math.round((completados / problemas.length) * 100) 
    : 0;

  if (mostrarResumen) {
    return (
      <div className="panel-ejercicio resumen-container fade-in">
        <div className="resolucion-card">
          <h2>Reto Finalizado</h2>
          <div className="resumen-stats">
            <div className="stat-item">
              <span className="stat-label">Progreso alcanzado:</span>
              <span className="stat-value">{porcentajeProgreso}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Tiempo total:</span>
              <span className="stat-value">{formatearTiempo(segundos)}</span>
            </div>
          </div>
          <button onClick={alVolver} className="btn-enviar">Regresar al Catálogo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-ejercicio fade-in-up">
      <div className="panel-nav">
        <button onClick={alVolver} className="btn-volver">← Salir</button>
        {dificultad && (
          <div className="progress-container">
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${porcentajeProgreso}%` }}
              ></div>
            </div>
            <span className="progress-text">{porcentajeProgreso}%</span>
          </div>
        )}
      </div>

      <div className="config-header">
        <div className="header-text">
          <h2>{ejercicio.titulo}</h2>
          <span className="subtitle">Nivel {dificultad}</span>
        </div>
        <div className="timer-badge">⏱ {formatearTiempo(segundos)}</div>
      </div>

      {!dificultad ? (
        <div className="dificultad-selection">
          <div className="dificultad-row">
            <button className="diff-btn facil" onClick={() => cargarProblemas('Fácil')}>
              <span className="diff-text">FÁCIL</span>
            </button>
            <button className="diff-btn media" onClick={() => cargarProblemas('Media')}>
              <span className="diff-text">MEDIA</span>
            </button>
            <button className="diff-btn dificil" onClick={() => cargarProblemas('Difícil')}>
              <span className="diff-text">DIFÍCIL</span>
            </button>
          </div>
        </div>
      ) : cargando ? (
        <div className="loading-area">Cargando retos...</div>
      ) : (
        <div className="area-resolucion">
          <div className="resolucion-card">
            <div className="enunciado-box">
              <p>Pregunta {indiceActual + 1} de {problemas.length}</p>
              <p className="enunciado-texto">{problemas[indiceActual]?.enunciado}</p>
              <div className="math-display">
                <BlockMath math={problemas[indiceActual]?.formula_latex || "0"} />
              </div>
            </div>

            <div className="input-respuesta">
              <input 
                type="text" 
                className="math-input-field"
                value={respuestaUsuario}
                onChange={(e) => setRespuestaUsuario(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verificarRespuesta()}
                placeholder="Respuesta..."
                autoFocus
              />
              <button className="btn-enviar" onClick={verificarRespuesta}>
                {indiceActual === problemas.length - 1 ? "Finalizar" : "Verificar"}
              </button>
            </div>

            {mensajeFeedback && (
              <div className={`feedback-msg ${mensajeFeedback.includes('Correcto') ? 'success' : 'error'}`}>
                {mensajeFeedback}
              </div>
            )}

            <div className="acciones-ejercicio">
              <button onClick={finalizarSesion} className="btn-terminar">
                Abandonar Reto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelEjercicio;