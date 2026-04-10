import React, { useState, useEffect } from 'react';
import '../App.css';

const GestionMaterias = ({ usuario }) => {
    const [materias, setMaterias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
    const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
    const [vistaActiva, setVistaActiva] = useState('grid'); // 'grid', 'alumnos', 'config', 'reporte'
    const [alumnos, setAlumnos] = useState([]);
    
    // Estado para la configuración de la materia
    const [configData, setConfigData] = useState({ nombre: '', bibliografia: '' });

    // Estado inicial para limpiar el formulario fácilmente
    const estadoInicialReporte = {
        asistencia_escuela: '',
        disciplina_escuela: 'Excelente',
        asistencia_plataforma: 'Muy Activo',
        disciplina_plataforma: 'Excelente',
        comentario: ''
    };

    // Estado para el formulario de reporte
    const [reporte, setReporte] = useState(estadoInicialReporte);

    const profesorId = usuario?.id;

    useEffect(() => {
        if (profesorId) obtenerMateriasAsignadas();
    }, [profesorId]);

    const obtenerMateriasAsignadas = async () => {
        setCargando(true);
        try {
            const res = await fetch(`http://localhost:5000/api/profesor/${profesorId}/materias`);
            const datos = await res.json();
            setMaterias(datos || []);
        } catch (error) { 
            console.error(error); 
        } finally { 
            setCargando(false); 
        }
    };

    const verAlumnosMateria = async (materia) => {
        setMateriaSeleccionada(materia);
        setCargando(true);
        try {
            const res = await fetch(`http://localhost:5000/api/materias/${materia.id}/alumnos`);
            const datos = await res.json();
            setAlumnos(datos || []);
            setVistaActiva('alumnos');
        } catch (error) { 
            alert("Error al cargar alumnos"); 
        } finally { 
            setCargando(false); 
        }
    };

    // --- LÓGICA DE CONFIGURACIÓN ---
    const abrirConfiguracion = (materia) => {
        setMateriaSeleccionada(materia);
        setConfigData({
            nombre: materia.nombre,
            bibliografia: materia.bibliografia || ''
        });
        setVistaActiva('config');
    };

    const handleUpdateConfig = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`http://localhost:5000/api/materias/${materiaSeleccionada.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configData)
            });

            if (res.ok) {
                alert("Configuración de materia actualizada correctamente");
                setVistaActiva('grid');
                obtenerMateriasAsignadas();
            }
        } catch (error) {
            alert("Error al actualizar la configuración");
        }
    };

    // --- LÓGICA DE REPORTES ---
    const abrirReporte = (alumno) => {
        setAlumnoSeleccionado(alumno);
        setReporte(estadoInicialReporte); // Reiniciar valores al abrir nuevo reporte
        setVistaActiva('reporte');
    };

    const enviarReporte = async (e) => {
        e.preventDefault();
        
        // Estructura de datos exacta para el backend
        const payload = {
            asistencia_escuela: parseInt(reporte.asistencia_escuela),
            disciplina_escuela: reporte.disciplina_escuela,
            asistencia_plataforma: reporte.asistencia_plataforma,
            disciplina_plataforma: reporte.disciplina_plataforma,
            comentario: reporte.comentario,
            id_estudiante: alumnoSeleccionado.id,
            id_materia: materiaSeleccionada.id,
            id_profesor: profesorId,
            progreso_actual: alumnoSeleccionado.progreso || 0
        };

        console.log("Enviando reporte...", payload); // Para depuración

        try {
            const res = await fetch('http://localhost:5000/api/reportes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const resultado = await res.json();
                console.log("Respuesta del servidor:", resultado);
                alert(`¡Éxito! El reporte de ${alumnoSeleccionado.nombre} ha sido enviado.`);
                
                // IMPORTANTE: Limpiar y volver a la lista de alumnos
                setReporte(estadoInicialReporte);
                setVistaActiva('alumnos'); 
            } else {
                const errorTexto = await res.text();
                alert(`Error del servidor: ${errorTexto}`);
            }
        } catch (error) { 
            console.error("Error en la petición fetch:", error);
            alert("No se pudo conectar con el servidor. ¿Está encendido el backend?"); 
        }
    };
    
    // --- RENDERIZADO DE VISTAS ---

    // 1. VISTA CONFIGURACIÓN
    if (vistaActiva === 'config') {
        return (
            <div className="gestion-container fade-in">
                <button className="btn-regresar" onClick={() => setVistaActiva('grid')}>
                    <span className="flecha-regresar">←</span> 
                    <span>Volver a Materias</span>
                </button>

                <div className="reporte-card">
                    <header className="reporte-header-estudiante">
                        <div className="info-principal">
                            <h2>Configuración de Materia</h2>
                            <p>Editando detalles para: <strong>{materiaSeleccionada.nombre}</strong></p>
                        </div>
                    </header>

                    <form className="config-form-itve" onSubmit={handleUpdateConfig}>
                        <div className="grupo-input full-width">
                            <label>Nombre de la Materia</label>
                            <input 
                                type="text" 
                                value={configData.nombre} 
                                onChange={(e) => setConfigData({...configData, nombre: e.target.value})}
                                required 
                            />
                        </div>
                        <div className="grupo-input full-width">
                            <label>Bibliografía y Recursos (Markdown soportado)</label>
                            <textarea 
                                rows="6" 
                                value={configData.bibliografia}
                                placeholder="Ej: Libro de Álgebra de Baldor, Capítulos 1-5..."
                                onChange={e => setConfigData({...configData, bibliografia: e.target.value})}
                            ></textarea>
                        </div>
                        <div className="full-width">
                            <button type="submit" className="btn-finalizar-reporte">
                                Actualizar Materia
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // 2. VISTA REPORTE
    if (vistaActiva === 'reporte') {
        return (
            <div className="gestion-container fade-in">
                <button className="btn-regresar" onClick={() => setVistaActiva('alumnos')}>
                    <span className="flecha-regresar">←</span> 
                    <span>Volver a la lista</span>
                </button>

                <div className="reporte-card">
                    <header className="reporte-header-estudiante">
                        <div className="info-principal">
                            <h2>Generar Reporte Oficial</h2>
                            <p>Estudiante: <strong>{alumnoSeleccionado.nombre}</strong></p>
                        </div>
                        <div className="progreso-circulo">
                            <p>Progreso ITVE</p>
                            <span>{alumnoSeleccionado.progreso || 0}%</span>
                        </div>
                    </header>

                    <form className="grid-reporte" onSubmit={enviarReporte}>
                        <div className="form-section">
                            <h3 className="section-title">🏫 Ámbito Escolar</h3>
                            <div className="grupo-input">
                                <label>Asistencia Presencial (%)</label>
                                <input 
                                    type="number" 
                                    placeholder="0-100" 
                                    min="0" max="100" 
                                    required
                                    value={reporte.asistencia_escuela}
                                    onChange={e => setReporte({...reporte, asistencia_escuela: e.target.value})} 
                                />
                            </div>
                            <div className="grupo-input">
                                <label>Disciplina en Clase</label>
                                <select 
                                    value={reporte.disciplina_escuela}
                                    onChange={e => setReporte({...reporte, disciplina_escuela: e.target.value})}
                                >
                                    <option value="Excelente">Excelente</option>
                                    <option value="Buena">Buena</option>
                                    <option value="Regular">Regular</option>
                                    <option value="Mala">Mala</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3 className="section-title">💻 Ámbito Digital</h3>
                            <div className="grupo-input">
                                <label>Uso de ITVE AdaptiMath</label>
                                <select 
                                    value={reporte.asistencia_plataforma}
                                    onChange={e => setReporte({...reporte, asistencia_plataforma: e.target.value})}
                                >
                                    <option value="Muy Activo">Muy Activo</option>
                                    <option value="Frecuente">Frecuente</option>
                                    <option value="Ocasional">Ocasional</option>
                                    <option value="Nulo">Nulo</option>
                                </select>
                            </div>
                            <div className="grupo-input">
                                <label>Comportamiento en Plataforma</label>
                                <select 
                                    value={reporte.disciplina_plataforma}
                                    onChange={e => setReporte({...reporte, disciplina_plataforma: e.target.value})}
                                >
                                    <option value="Excelente">Excelente</option>
                                    <option value="Correcto">Correcto</option>
                                    <option value="Distraído">Distraído</option>
                                </select>
                            </div>
                        </div>

                        <div className="grupo-input full-width">
                            <h3 className="section-title">📝 Observaciones y Recomendaciones</h3>
                            <textarea 
                                rows="4" 
                                placeholder="Escriba aquí los comentarios que verá el profesor en su panel de reportes..."
                                value={reporte.comentario}
                                onChange={e => setReporte({...reporte, comentario: e.target.value})}
                                required
                            ></textarea>
                        </div>

                        <div className="full-width">
                            <button type="submit" className="btn-finalizar-reporte">
                                Guardar y Enviar al Panel de Reportes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // 3. VISTA LISTA DE ALUMNOS
    if (vistaActiva === 'alumnos') {
        return (
            <div className="gestion-container fade-in">
                <button className="btn-regresar" onClick={() => setVistaActiva('grid')}>
                    <span className="flecha-regresar">←</span> 
                    <span>Volver a Materias</span>
                </button>
                <header className="header-acciones">
                    <div className="titulo-seccion">
                        <h2>Alumnos en: {materiaSeleccionada.nombre}</h2>
                        <p>Seleccione un estudiante para generar su reporte de desempeño.</p>
                    </div>
                </header>
                <div className="tabla-responsive">
                    <table className="tabla-itve">
                        <thead>
                            <tr>
                                <th>Nombre del Alumno</th>
                                <th>Progreso en ITVE</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alumnos.length > 0 ? alumnos.map(alumno => (
                                <tr key={alumno.id}>
                                    <td className="td-nombre">{alumno.nombre}</td>
                                    <td>
                                        <div className="progress-bar-container">
                                            <div className="progress-bar" style={{width: `${alumno.progreso || 0}%`}}></div>
                                        </div>
                                        <span className="progreso-texto">{alumno.progreso || 0}%</span>
                                    </td>
                                    <td>
                                        <button className="btn-vincular" onClick={() => abrirReporte(alumno)}>
                                            Crear Reporte
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="3" className="no-data">No hay alumnos inscritos en esta materia.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // 4. VISTA GRID PRINCIPAL (MATERIAS)
    return (
        <div className="materias-container fade-in">
            <header className="seccion-header-profesor">
                <div className="header-info">
                    <h2>Mis Materias Asignadas</h2>
                    <p>Gestión académica para el profesor <strong>{usuario?.nombre}</strong></p>
                </div>
            </header>

            {cargando ? (
                <div className="loader-container">Cargando materias...</div>
            ) : (
                <div className="materias-grid">
                    {materias.map((materia) => (
                        <div key={materia.id} className="materia-card shadow-sm">
                            <div className={`materia-badge ${materia.nivel?.toLowerCase()}`}>
                                {materia.grado} - {materia.nivel}
                            </div>
                            <img src={materia.imagen_url || '/images/default_math.png'} className="materia-img" alt={materia.nombre} />
                            <div className="materia-body">
                                <h3>{materia.nombre}</h3>
                                <div className="materia-footer">
                                    <button className="btn-vincular" onClick={() => verAlumnosMateria(materia)}>
                                        Ver Alumnos
                                    </button>
                                    <button className="btn-icon-edit" title="Configurar Materia" onClick={() => abrirConfiguracion(materia)}>
                                        ⚙️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GestionMaterias;