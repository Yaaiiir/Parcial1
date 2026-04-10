import React, { useState, useEffect, useCallback } from 'react';
import '../App.css';

const TemasMatematicosProfesor = ({ usuario }) => {
    const [temas, setTemas] = useState([]);
    const [temaSeleccionado, setTemaSeleccionado] = useState(null);
    const [estudiantes, setEstudiantes] = useState([]);
    const [cargandoTemas, setCargandoTemas] = useState(true);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [busqueda, setBusqueda] = useState("");

    const obtenerTemasAsignados = useCallback(async () => {
        if (!usuario?.id) return;
        
        try {
            setCargandoTemas(true);
            const respuesta = await fetch(`http://localhost:5000/api/ejercicios/profesor/${usuario.id}`);
            
            if (!respuesta.ok) throw new Error("Error en la respuesta del servidor");
            
            const datos = await respuesta.json();
            setTemas(Array.isArray(datos) ? datos : []);
        } catch (error) {
            console.error("Error al cargar temas vinculados:", error);
            setTemas([]);
        } finally {
            setCargandoTemas(false);
        }
    }, [usuario]);

    useEffect(() => {
        obtenerTemasAsignados();
    }, [obtenerTemasAsignados]);

    const verDetalleTema = async (tema) => {
        setTemaSeleccionado(tema);
        setCargandoDetalle(true);
        try {
            const respuesta = await fetch(`http://localhost:5000/api/ejercicios/${tema.id}/progreso`);
            if (!respuesta.ok) throw new Error("Error al obtener progreso");
            const datos = await respuesta.json();
            
            // MAPEO CRÍTICO: Aseguramos que el porcentaje sea numérico y se muestre siempre
            const datosNormalizados = Array.isArray(datos) ? datos.map(est => ({
                ...est,
                porcentaje: Number(est.porcentaje) || 0,
                calificacion: est.calificacion !== null ? Number(est.calificacion) : null,
                // Normalizamos el booleano por si viene como string de la DB
                esCompletado: est.completado === true || est.completado === "true"
            })) : [];

            setEstudiantes(datosNormalizados);
        } catch (error) {
            console.error("Error al conectar con la tabla de progreso:", error);
            setEstudiantes([]);
        } finally {
            setCargandoDetalle(false);
        }
    };

    const temasFiltrados = temas.filter(t => 
        (t.titulo?.toLowerCase() || "").includes(busqueda.toLowerCase()) ||
        (t.nombre_materia?.toLowerCase() || "").includes(busqueda.toLowerCase())
    );

    if (cargandoTemas) return (
        <div className="loader-container">
            <div className="spinner"></div>
            <p>Sincronizando módulos para el Prof. {usuario?.nombre}...</p>
        </div>
    );

    return (
        <div className="temas-profesor-container fade-in">
            <header className="seccion-header-profesor">
                <div className="header-text">
                    <h2>Módulos de Enseñanza Asignados</h2>
                    <p>Monitoreo de ejercicios basados en tus materias ({usuario?.nivel})</p>
                </div>
                <div className="search-box-profesor">
                    <input 
                        type="text" 
                        placeholder="🔍 Buscar por tema o materia..." 
                        className="search-input-profesor"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
            </header>

            <div className="temas-layout">
                <div className="temas-sidemenu">
                    <h3>Módulos Activos ({temasFiltrados.length})</h3>
                    <div className="temas-scroll-area">
                        {temasFiltrados.length === 0 ? (
                            <div className="no-data-side">
                                <p>No hay ejercicios asignados.</p>
                            </div>
                        ) : (
                            temasFiltrados.map((tema) => (
                                <div 
                                    key={`tema-${tema.id}`} 
                                    className={`tema-item-profesor ${temaSeleccionado?.id === tema.id ? 'active' : ''}`}
                                    onClick={() => verDetalleTema(tema)}
                                >
                                    <div className="tema-status-indicator"></div>
                                    <div className="tema-info-profesor">
                                        <h4>{tema.titulo}</h4>
                                        <div className="tema-meta-tags">
                                            <span className={`badge-nivel ${tema.nivel?.toLowerCase()}`}>
                                                {tema.nivel}
                                            </span>
                                            <span className="subject-tag">{tema.nombre_materia}</span>
                                        </div>
                                    </div>
                                    <span className="arrow-icon">➔</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="detalle-rendimiento-panel">
                    {!temaSeleccionado ? (
                        <div className="empty-state-profesor">
                            <div className="empty-icon-circle">📊</div>
                            <h3>Análisis de Resultados</h3>
                            <p>Selecciona un ejercicio para ver el avance de los alumnos en tiempo real.</p>
                        </div>
                    ) : (
                        <div className="detalle-content fade-in">
                            <div className="detalle-header-tema">
                                <div className="header-info-main">
                                    <h3>{temaSeleccionado.titulo}</h3>
                                    <p className="subtitle-detalle">
                                        <strong>Materia:</strong> {temaSeleccionado.nombre_materia} | 
                                        <strong> Dificultad Base:</strong> {temaSeleccionado.dificultad_base}/5
                                    </p>
                                </div>
                                <button className="btn-refresh-mini" onClick={() => verDetalleTema(temaSeleccionado)}>🔄 Actualizar</button>
                            </div>
                            
                            {cargandoDetalle ? (
                                <div className="loading-msg-mini">Consultando progreso...</div>
                            ) : (
                                <div className="tabla-container-itve fade-in">
                                    <table className="tabla-itve-profesor">
                                        <thead>
                                            <tr>
                                                <th>Estudiante</th>
                                                <th>Estado</th>
                                                <th>Avance Real</th>
                                                <th>Calificación</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {estudiantes.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" style={{ textAlign: 'center', padding: '30px' }}>
                                                        Aún no hay registros de progreso para este tema.
                                                    </td>
                                                </tr>
                                            ) : (
                                                estudiantes.map((est) => (
                                                    <tr key={`est-${temaSeleccionado.id}-${est.id_estudiante}`}>
                                                        <td className="student-name-td">
                                                            <div className="avatar-mini">
                                                                {est.nombre_estudiante?.charAt(0) || '?'}
                                                            </div>
                                                            {est.nombre_estudiante}
                                                        </td>
                                                        <td>
                                                            <span className={`status-pill ${est.esCompletado ? 'status-done' : 'status-doing'}`}>
                                                                {est.esCompletado ? 'Finalizado' : 'En proceso'}
                                                            </span>
                                                        </td>
                                                        <td className="progress-td">
                                                            {/* Barra de progreso siempre visible con el valor actual */}
                                                            <div className="progress-bar-itve">
                                                                <div 
                                                                    className={`progress-fill-itve ${est.porcentaje >= 90 ? 'fill-green' : 'fill-blue'}`} 
                                                                    style={{ 
                                                                        width: `${Math.min(est.porcentaje, 100)}%`,
                                                                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                                                                    }}
                                                                ></div>
                                                            </div>
                                                            <span className="percent-text">{est.porcentaje}%</span>
                                                        </td>
                                                        <td className={`score-text ${est.calificacion >= 70 ? 'score-good' : 'score-bad'}`}>
                                                            {est.calificacion !== null ? `${est.calificacion}/100` : '—'}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TemasMatematicosProfesor;