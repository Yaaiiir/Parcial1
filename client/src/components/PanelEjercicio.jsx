import React, { useState, useEffect, useCallback } from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

const PanelEjercicio = ({ ejercicio, alVolver, usuario }) => {
  const [dificultad, setDificultad] = useState(null);
  const [segundos, setSegundos] = useState(0);
  const [activo, setActivo] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [problemas, setProblemas] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [respuestaUsuario, setRespuestaUsuario] = useState("");
  const [mensajeFeedback, setMensajeFeedback] = useState("");
  const [completados, setCompletados] = useState(0);
  const [enviandoProgreso, setEnviandoProgreso] = useState(false);

  // Reloj del ejercicio
  useEffect(() => {
    let intervalo = null;
    if (activo) {
      intervalo = setInterval(() => setSegundos((s) => s + 1), 1000);
    }
    return () => clearInterval(intervalo);
  }, [activo]);

  // Función para sincronizar con el backend con Rastreo (Debug)
  const guardarProgresoEnBaseDeDatos = useCallback(async (porcentajeFinal, estaCompletado, tiempoActual) => {
    const urlDestino = 'http://localhost:5000/api/progreso/actualizar';
    
    // Objeto que se enviará
    const payload = {
      id_usuario: usuario?.id,
      id_ejercicio: ejercicio?.id,
      porcentaje: porcentajeFinal,
      completado: estaCompletado,
      tiempo_empleado: tiempoActual || segundos, 
      calificacion: porcentajeFinal 
    };

    // LOG DE RASTREO EN CONSOLA
    console.log("%c--- 📡 INTENTO DE SINCRONIZACIÓN ---", "color: #007bff; font-weight: bold;");
    console.log("📍 URL:", urlDestino);
    console.log("📦 PAYLOAD:", payload);
    console.log("👤 USUARIO ACTUAL:", usuario);

    if (!usuario?.id || !ejercicio?.id) {
      console.warn("%c⚠️ ABORTO: No hay ID de usuario o ejercicio en el componente.", "color: orange;");
      return;
    }

    setEnviandoProgreso(true);
    try {
      const response = await fetch(urlDestino, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();

      if (response.ok) {
        console.log("%c✅ ÉXITO DB:", "color: green; font-weight: bold;", data.message);
      } else {
        console.error("%c❌ ERROR DB:", "color: red; font-weight: bold;", data.error);
      }
    } catch (error) {
      console.error("%c🌐 ERROR RED:", "color: red; font-weight: bold;", error.message);
    } finally {
      setEnviandoProgreso(false);
      console.log("%c--- 🏁 FIN DE SINCRONIZACIÓN ---", "color: #007bff; font-weight: bold;");
    }
  }, [usuario, ejercicio, segundos]);

  const cargarProblemas = async (nivel) => {
    setCargando(true);
    setDificultad(nivel);
    try {
      const response = await fetch(`http://localhost:5000/api/ejercicios-detallados/${ejercicio.id}/${nivel}`);
      if (!response.ok) throw new Error("No hay ejercicios disponibles para este nivel.");
      const data = await response.json();
      
      if (data && data.length > 0) {
        setProblemas(data);
        setIndiceActual(0);
        setCompletados(0);
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
    if (!respuestaUsuario.trim() || cargando || enviandoProgreso) return;
    
    const correcta = problemas[indiceActual]?.respuesta_correcta;
    const respuestaLimpia = respuestaUsuario.trim().toLowerCase();
    
    if (respuestaLimpia === correcta.toLowerCase()) {
      const nuevosCompletados = completados + 1;
      setCompletados(nuevosCompletados);
      setMensajeFeedback("¡Correcto! ✨");

      const porcentajeParcial = Math.round((nuevosCompletados / problemas.length) * 100);
      guardarProgresoEnBaseDeDatos(porcentajeParcial, porcentajeParcial === 100);

      setTimeout(() => {
        if (indiceActual < problemas.length - 1) {
          setIndiceActual(prev => prev + 1);
          setRespuestaUsuario("");
          setMensajeFeedback("");
        } else {
          finalizarSesion(nuevosCompletados);
        }
      }, 1000);
    } else {
      setMensajeFeedback("Incorrecto ❌");
      setTimeout(() => setMensajeFeedback(""), 1500);
    }
  };

  const finalizarSesion = (aciertosFinales = completados) => {
    setActivo(false);
    const totalP = problemas.length > 0 ? problemas.length : 1;
    const porcentajeFinal = Math.round((aciertosFinales / totalP) * 100);
    const completadoTotal = aciertosFinales === problemas.length && problemas.length > 0;

    guardarProgresoEnBaseDeDatos(porcentajeFinal, completadoTotal);
    setMostrarResumen(true);
  };

  const formatearTiempo = (totalSegundos) => {
    const min = Math.floor(totalSegundos / 60);
    const seg = totalSegundos % 60;
    return `${min}:${seg < 10 ? '0' : ''}${seg}`;
  };

  const porcentajeProgreso = problemas.length > 0 
    ? Math.round((completados / problemas.length) * 100) 
    : 0;

  if (mostrarResumen) {
    return (
      <div className="panel-ejercicio resumen-container fade-in">
        <div className="resolucion-card">
          <div className="success-icon">{porcentajeProgreso === 100 ? "🏆" : "📈"}</div>
          <h2>Reto Finalizado</h2>
          <div className="resumen-stats">
            <div className="stat-item">
              <span className="stat-label">Tu Calificación:</span>
              <span className="stat-value">{porcentajeProgreso}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Tiempo total:</span>
              <span className="stat-value">{formatearTiempo(segundos)}</span>
            </div>
          </div>
          <p className="msg-sync">✅ Tu progreso ha sido procesado.</p>
          <button onClick={alVolver} className="btn-enviar">Regresar al Catálogo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-ejercicio fade-in-up">
      <div className="panel-nav">
        <button onClick={() => finalizarSesion()} className="btn-volver">← Salir y Guardar</button>
        {dificultad && (
          <div className="progress-container">
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${porcentajeProgreso}%`, transition: 'width 0.5s ease' }}
              ></div>
            </div>
            <span className="progress-text">{porcentajeProgreso}%</span>
          </div>
        )}
      </div>

      <div className="config-header">
        <div className="header-text">
          <h2>{ejercicio.titulo}</h2>
          <span className="subtitle">Nivel: {dificultad || 'Seleccionando...'}</span>
        </div>
        <div className="timer-badge">⏱ {formatearTiempo(segundos)}</div>
      </div>

      {!dificultad ? (
        <div className="dificultad-selection">
          <h3>Elige una dificultad:</h3>
          <div className="dificultad-row">
            {['Fácil', 'Media', 'Difícil'].map((lvl) => (
              <button key={lvl} className={`diff-btn ${lvl.toLowerCase()}`} onClick={() => cargarProblemas(lvl)}>
                <span className="diff-text">{lvl.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>
      ) : cargando ? (
        <div className="loading-area">
          <div className="spinner"></div>
          <p>Preparando problemas...</p>
        </div>
      ) : (
        <div className="area-resolucion">
          <div className="resolucion-card">
            <div className="enunciado-box">
              <p className="counter-text">Pregunta {indiceActual + 1} de {problemas.length}</p>
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
                placeholder="Respuesta aquí..."
                disabled={enviandoProgreso}
                autoFocus
              />
              <button 
                className="btn-enviar" 
                onClick={verificarRespuesta}
                disabled={enviandoProgreso}
              >
                {enviandoProgreso ? "..." : (indiceActual === problemas.length - 1 ? "Finalizar" : "Siguiente")}
              </button>
            </div>

            {mensajeFeedback && (
              <div className={`feedback-msg ${mensajeFeedback.includes('Correcto') ? 'success' : 'error'}`}>
                {mensajeFeedback}
              </div>
            )}

            <div className="acciones-ejercicio">
              <button onClick={() => finalizarSesion()} className="btn-terminar">
                Guardar avance y salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelEjercicio;