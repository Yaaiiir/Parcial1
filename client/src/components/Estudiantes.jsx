import React, { useState, useEffect } from 'react';
import '../App.css';

const Estudiantes = ({ usuario }) => {
    const [estudiantes, setEstudiantes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState("");

    // Usamos el nivel que viene de la tabla 'usuarios' (Secundaria/Preparatoria)
    const nivelProfesor = usuario?.nivel;

    useEffect(() => {
        if (nivelProfesor) {
            obtenerEstudiantes();
        }
    }, [nivelProfesor]);

    const obtenerEstudiantes = async () => {
        setCargando(true);
        try {
            // Llamada al endpoint que trae usuarios de la tabla 'usuarios'
            // IMPORTANTE: Asegúrate de que tu backend filtre por rol 'estudiante'
            const res = await fetch(`http://localhost:5000/api/usuarios?rol=estudiante&nivel=${nivelProfesor}`);
            
            if (!res.ok) throw new Error("Error al obtener datos de la BD");
            
            const datos = await res.json();
            
            // Seteamos los datos que vienen directamente de tu tabla SQL
            // Si tu consulta SQL ya hace el filtrado, solo asignamos datos
            setEstudiantes(datos);
        } catch (error) {
            console.error("Error en la conexión con PostgreSQL:", error);
            setEstudiantes([]);
        } finally {
            setCargando(false);
        }
    };

    // Filtro de búsqueda local por nombre (basado en la columna 'nombre' de tu SQL)
    const estudiantesFiltrados = estudiantes.filter(est =>
        est.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="card-mockup fade-in">
            <div className="card-header-flex">
                <div>
                    <h2>Control de Alumnos - {nivelProfesor}</h2>
                    <p>Visualizando registros de la tabla <strong>usuarios</strong></p>
                </div>
                <div className="header-actions">
                    <input 
                        type="text" 
                        placeholder="🔍 Buscar por nombre..." 
                        className="search-input"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-container">
                {cargando ? (
                    <div className="loading-msg">Consultando base de datos ITVE...</div>
                ) : (
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Estudiante</th>
                                <th>Correo</th>
                                <th>Grado</th>
                                <th>Progreso</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {estudiantesFiltrados.length > 0 ? (
                                estudiantesFiltrados.map(est => (
                                    <tr key={est.id}>
                                        <td>
                                            <div className="user-info-cell">
                                                <div className="avatar-mini">
                                                    {est.nombre ? est.nombre.charAt(0).toUpperCase() : '?'}
                                                </div>
                                                <div className="name-stack">
                                                    <span className="user-name-text">{est.nombre}</span>
                                                    <small className="user-id-text">ID: #{est.id}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td><small>{est.correo}</small></td>
                                        <td>
                                            <span className="grado-badge">{est.grado || 'N/A'}</span>
                                        </td>
                                        <td>
                                            <div className="progress-table-container">
                                                <div className="progress-bar-bg-small">
                                                    <div 
                                                        className="progress-bar-fill-small" 
                                                        style={{ width: `${est.progreso || 0}%` }}
                                                    ></div>
                                                </div>
                                                <span className="progress-label">{est.progreso || 0}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <button className="btn-icon-edit" title="Ver Perfil SQL">👁️</button>
                                            <button className="btn-icon-edit" title="Editar Registro">📝</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="no-data-msg">
                                        No hay estudiantes registrados en {nivelProfesor} dentro de la BD.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Estudiantes;