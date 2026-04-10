import React, { useState, useEffect } from 'react';
import '../App.css';

const GestionDocente = () => {
    const [profesores, setProfesores] = useState([]);
    const [materiasDisponibles, setMateriasDisponibles] = useState([]);
    const [ejerciciosDisponibles, setEjerciciosDisponibles] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [mostrarModal, setMostrarModal] = useState(false);
    const [editando, setEditando] = useState(null);
    const [cargando, setCargando] = useState(true);
    
    const [modoEjercicio, setModoEjercicio] = useState(false);
    const [esEjercicioExistente, setEsEjercicioExistente] = useState(false);

    const [formData, setFormData] = useState({
        nombre: '',
        correo: '',
        password: '',
        nivel: 'Secundaria',
        materiasAsignadas: []
    });

    const [ejercicioData, setEjercicioData] = useState({
        id_existente: '',
        titulo: '',
        descripcion: '',
        tema_padre: '',
        dificultad_base: 1,
        imagen_url: ''
    });

    useEffect(() => {
        cargarTodo();
    }, []);

    const cargarTodo = async () => {
        setCargando(true);
        try {
            // CORRECCIÓN: Rutas unificadas con index.js
            const resultados = await Promise.allSettled([
                fetch('http://localhost:5000/api/usuarios?rol=profesor'),
                fetch('http://localhost:5000/api/admin/materias'),
                fetch('http://localhost:5000/api/ejercicios') // Sin el /admin/ intermedio
            ]);
            
            if (resultados[0].status === 'fulfilled' && resultados[0].value.ok) {
                const data = await resultados[0].value.json();
                setProfesores(Array.isArray(data) ? data : []);
            }

            if (resultados[1].status === 'fulfilled' && resultados[1].value.ok) {
                const data = await resultados[1].value.json();
                setMateriasDisponibles(Array.isArray(data) ? data : []);
            }

            if (resultados[2].status === 'fulfilled' && resultados[2].value.ok) {
                const data = await resultados[2].value.json();
                setEjerciciosDisponibles(Array.isArray(data) ? data : []);
            } else {
                setEjerciciosDisponibles([]);
            }

        } catch (err) {
            console.error("Error crítico en carga:", err);
        } finally {
            setCargando(false);
        }
    };

    const docentesFiltrados = profesores.filter(profe =>
        profe.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        profe.correo?.toLowerCase().includes(busqueda.toLowerCase())
    );

    const abrirEdicion = async (profe) => {
        setEditando(profe.id);
        try {
            const res = await fetch(`http://localhost:5000/api/usuarios/${profe.id}/materias`);
            const materiasDocente = res.ok ? await res.json() : [];
            
            setFormData({
                nombre: profe.nombre,
                correo: profe.correo,
                password: '', 
                nivel: profe.nivel || 'Secundaria',
                materiasAsignadas: Array.isArray(materiasDocente) ? materiasDocente.map(m => m.id_materia) : []
            });
            setMostrarModal(true);
        } catch (err) {
            setMostrarModal(true);
        }
    };

    const cerrarModal = () => {
        setMostrarModal(false);
        setEditando(null);
        setModoEjercicio(false);
        setEsEjercicioExistente(false);
        setFormData({ nombre: '', correo: '', password: '', nivel: 'Secundaria', materiasAsignadas: [] });
        setEjercicioData({ id_existente: '', titulo: '', descripcion: '', tema_padre: '', dificultad_base: 1, imagen_url: '' });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            materiasAsignadas: name === 'nivel' ? [] : prev.materiasAsignadas
        }));
    };

    const handleEjercicioChange = (e) => {
        const { name, value } = e.target;
        setEjercicioData(prev => ({ ...prev, [name]: value }));
    };

    const handleMateriaCheck = (materia) => {
        const idMateria = materia.id;
        const yaAsignada = formData.materiasAsignadas.includes(idMateria);
        
        setFormData(prev => ({
            ...prev,
            materiasAsignadas: yaAsignada 
                ? prev.materiasAsignadas.filter(id => id !== idMateria)
                : [...prev.materiasAsignadas, idMateria]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const urlProfe = editando 
                ? `http://localhost:5000/api/usuarios/${editando}` 
                : 'http://localhost:5000/api/usuarios/registro';
            
            const resProfe = await fetch(urlProfe, {
                method: editando ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, rol: 'profesor' })
            });

            if (resProfe.ok) {
                const resultado = await resProfe.json();
                const profeId = editando || resultado.id;

                // Sincronizar Materias
                await fetch(`http://localhost:5000/api/admin/asignar-materias-profesor`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_profesor: profeId, materias: formData.materiasAsignadas })
                });

                // Si se activó la opción de ejercicio
                if (modoEjercicio) {
                    if (esEjercicioExistente && ejercicioData.id_existente) {
                        // ACTUALIZAR ejercicio existente para asignarle este profesor
                        await fetch(`http://localhost:5000/api/admin/ejercicios/${ejercicioData.id_existente}/asignar`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id_profesor: profeId })
                        });
                    } else if (!esEjercicioExistente && ejercicioData.titulo) {
                        // CREAR uno nuevo con el ID del creador
                        await fetch('http://localhost:5000/api/admin/ejercicios', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                ...ejercicioData,
                                id_creador: profeId, // <--- Vinculación clave
                                nivel: formData.nivel,
                                badge: formData.nivel === 'Secundaria' ? 'badge-secundaria' : 'badge-prepa'
                            })
                        });
                    }
                }

                alert("Operación completada con éxito");
                cerrarModal();
                cargarTodo();
            }
        } catch (err) {
            alert("Error al procesar la solicitud");
        }
    };

    return (
        <div className="gestion-container fade-in">
            <div className="header-acciones">
                <div className="titulo-seccion">
                    <h2>Gestión de Personal Docente</h2>
                    <p>Administración de cuentas y recursos educativos</p>
                </div>
                <button className="btn-agregar-profe" onClick={() => { setEditando(null); setMostrarModal(true); }}>
                    ➕ Nuevo Profesor
                </button>
            </div>

            <div className="search-bar-container">
                <input type="text" placeholder="Buscar docente..." className="search-input-docente" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>

            {cargando ? <div className="loading-spinner">Cargando datos...</div> : (
                <div className="tabla-responsive">
                    <table className="tabla-itve">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Email</th>
                                <th>Nivel</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {docentesFiltrados.map(profe => (
                                <tr key={profe.id}>
                                    <td className="td-nombre">{profe.nombre}</td>
                                    <td>{profe.correo}</td>
                                    <td><span className={`badge-nivel ${profe.nivel?.toLowerCase()}`}>{profe.nivel}</span></td>
                                    <td className="acciones-btns">
                                        <button className="btn-table-edit" onClick={() => abrirEdicion(profe)}>✏️</button>
                                        <button className="btn-table-delete">🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {mostrarModal && (
                <div className="modal-overlay">
                    <div className="modal-content-grande animate-up">
                        <div className="modal-header">
                            <h3>{editando ? "Modificar Docente" : "Nuevo Registro"}</h3>
                            <button className="close-x" onClick={cerrarModal}>&times;</button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="form-grid">
                            <div className="form-main-data">
                                <label className="form-label-destaque">Información General</label>
                                <input type="text" name="nombre" placeholder="Nombre" value={formData.nombre} onChange={handleChange} required />
                                <input type="email" name="correo" placeholder="Correo" value={formData.correo} onChange={handleChange} required />
                                <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required={!editando} />
                                
                                <select name="nivel" value={formData.nivel} onChange={handleChange}>
                                    <option value="Secundaria">Secundaria</option>
                                    <option value="Preparatoria">Preparatoria</option>
                                </select>

                                <div className="opcion-ejercicio-box">
                                    <div className="toggle-container">
                                        <label>¿Asignar un ejercicio?</label>
                                        <input type="checkbox" checked={modoEjercicio} onChange={() => setModoEjercicio(!modoEjercicio)} />
                                    </div>

                                    {modoEjercicio && (
                                        <div className="ejercicio-selector-area fade-in">
                                            <div className="tabs-ejercicio">
                                                <button type="button" className={!esEjercicioExistente ? 'active' : ''} onClick={() => setEsEjercicioExistente(false)}>Nuevo</button>
                                                <button type="button" className={esEjercicioExistente ? 'active' : ''} onClick={() => setEsEjercicioExistente(true)}>Existente</button>
                                            </div>

                                            {esEjercicioExistente ? (
                                                <div className="container-selector-ejercicios">
                                                    <label className="label-mini">Lista de Ejercicios Disponibles:</label>
                                                    <select 
                                                        name="id_existente" 
                                                        value={ejercicioData.id_existente} 
                                                        onChange={handleEjercicioChange}
                                                        className="select-itve-ejercicio"
                                                        required={esEjercicioExistente}
                                                    >
                                                        <option value="">-- Selecciona un ejercicio --</option>
                                                        {ejerciciosDisponibles
                                                            .filter(e => e.nivel.toLowerCase() === formData.nivel.toLowerCase())
                                                            .map(e => (
                                                                <option key={e.id} value={e.id}>
                                                                    {e.titulo} | {e.tema_padre || 'General'}
                                                                </option>
                                                            ))
                                                        }
                                                    </select>
                                                    {ejerciciosDisponibles.filter(e => e.nivel.toLowerCase() === formData.nivel.toLowerCase()).length === 0 && (
                                                        <p className="error-text-mini">No hay ejercicios registrados para nivel {formData.nivel}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="nuevo-ejercicio-inputs">
                                                    <input type="text" name="titulo" placeholder="Título del ejercicio" value={ejercicioData.titulo} onChange={handleEjercicioChange} required={!esEjercicioExistente} />
                                                    <textarea name="descripcion" placeholder="Descripción de la actividad..." value={ejercicioData.descripcion} onChange={handleEjercicioChange}></textarea>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-materias-selection">
                                <label>Materias Asignadas</label>
                                <div className="materias-scroll-list">
                                    {materiasDisponibles.filter(m => m.nivel === formData.nivel).map(m => (
                                        <div 
                                            key={m.id} 
                                            className={`materia-check-item ${formData.materiasAsignadas.includes(m.id) ? 'active' : ''}`}
                                            onClick={() => handleMateriaCheck(m)}
                                        >
                                            <input type="checkbox" checked={formData.materiasAsignadas.includes(m.id)} readOnly />
                                            <span>{m.nombre} - {m.grado}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="modal-footer-full">
                                <button type="button" className="btn-cancelar" onClick={cerrarModal}>Cancelar</button>
                                <button type="submit" className="btn-guardar-profe">Guardar Todo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionDocente;