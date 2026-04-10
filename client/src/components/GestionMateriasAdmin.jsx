import React, { useState, useEffect } from 'react';

const GestionMateriasAdmin = () => {
    const [materiasGlobales, setMateriasGlobales] = useState([]);
    const [asignaciones, setAsignaciones] = useState([]);
    const [estudiantes, setEstudiantes] = useState([]); 
    const [tabActual, setTabActual] = useState('catalogo');
    const [loading, setLoading] = useState(true);

    const [showModalMateria, setShowModalMateria] = useState(false);
    const [showModalAsignar, setShowModalAsignar] = useState(false);
    
    // Estados para el buscador
    const [busquedaEstudiante, setBusquedaEstudiante] = useState('');
    const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);

    const [editandoId, setEditandoId] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '', nivel: 'Secundaria', grado: '1ro', descripcion: ''
    });

    const [formAsignar, setFormAsignar] = useState({
        id_materia: '', id_estudiante: '', id_profesor_asignador: '1'
    });

    const API_URL = 'http://localhost:5000/api/admin';

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
    setLoading(true);
    try {
        const [resMat, resAsig, resEst] = await Promise.all([
            fetch(`http://localhost:5000/api/admin/materias`),
            fetch(`http://localhost:5000/api/admin/materias-destinadas`),
            // NOTA: Añadimos ?rol=estudiante para que NO traiga profesores aquí
            fetch(`http://localhost:5000/api/usuarios?rol=estudiante`) 
        ]);

        const dataMat = await resMat.json();
        const dataAsig = await resAsig.json();
        const dataUser = await resEst.json();

        setMateriasGlobales(dataMat);
        setAsignaciones(dataAsig);
        setEstudiantes(dataUser); 

    } catch (err) { 
        console.error("Error cargando datos:", err); 
    } finally { 
        setLoading(false); 
    }
};

    const handleNuevaAsignacion = async (e) => {
        e.preventDefault();
        if(!estudianteSeleccionado) return alert("Selecciona un estudiante");

        try {
            const res = await fetch(`${API_URL}/materias-destinadas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_materia: formAsignar.id_materia,
                    id_estudiante: estudianteSeleccionado.id,
                    id_profesor_asignador: 1 // Admin
                })
            });
            if (res.ok) { 
                cargarDatos(); 
                setShowModalAsignar(false); 
                setEstudianteSeleccionado(null);
                setBusquedaEstudiante('');
            }
        } catch (err) { console.error(err); }
    };

    // Buscador sensible a nombre y nivel (Secundaria/Preparatoria)
    const estudiantesFiltrados = estudiantes.filter(est => 
        est.nombre.toLowerCase().includes(busquedaEstudiante.toLowerCase()) ||
        est.nivel?.toLowerCase().includes(busquedaEstudiante.toLowerCase())
    );

    const styles = {
        headerActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
        addBtn: { background: '#007bff', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' },
        searchBox: { 
            width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', 
            marginBottom: '5px', outline: 'none', transition: '0.3s' 
        },
        resultsList: { 
            background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', 
            maxHeight: '180px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' 
        },
        resultItem: { padding: '12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: '0.2s' },
        selectedBadge: { 
            background: '#f0f9ff', border: '1px solid #bae6fd', padding: '15px', 
            borderRadius: '12px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
        }
    };

    return (
        <div className="gestion-materias-container" style={{ padding: '30px' }}>
            <header style={{ marginBottom: '30px' }}>
                <h2 style={{ color: '#1e293b', fontSize: '1.8rem' }}>📓 Panel de Control de Materias</h2>
                <div className="tab-menu" style={{ display: 'flex', gap: '8px', marginTop: '20px', background: '#f1f5f9', padding: '5px', borderRadius: '12px', width: 'fit-content' }}>
                    <button className={`tab-btn ${tabActual === 'catalogo' ? 'active-tab' : ''}`} onClick={() => setTabActual('catalogo')}>Catálogo General</button>
                    <button className={`tab-btn ${tabActual === 'asignaciones' ? 'active-tab' : ''}`} onClick={() => setTabActual('asignaciones')}>Materias Asignadas</button>
                </div>
            </header>

            <div className="admin-card-panel shadow-sm" style={{ background: 'white', borderRadius: '20px', padding: '25px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {tabActual === 'catalogo' ? (
                    <section>
                        <div style={styles.headerActions}>
                            <h3 style={{ margin: 0, color: '#334155' }}>📚 Materias Disponibles</h3>
                            <button style={styles.addBtn} onClick={() => { setEditandoId(null); setFormData({nombre:'', nivel:'Secundaria', grado:'1ro', descripcion:''}); setShowModalMateria(true); }}>+ Crear Materia</button>
                        </div>
                        <table className="admin-table">
                            <thead><tr><th>ID</th><th>Materia</th><th>Nivel</th><th>Grado</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {materiasGlobales.map(m => (
                                    <tr key={m.id}>
                                        <td>#{m.id}</td>
                                        <td><strong>{m.nombre}</strong></td>
                                        <td><span className={`tag ${m.nivel.toLowerCase()}`}>{m.nivel}</span></td>
                                        <td>{m.grado}</td>
                                        <td>
                                            <button className="btn-icon" onClick={() => { setEditandoId(m.id); setFormData(m); setShowModalMateria(true); }}>✏️</button>
                                            <button className="btn-icon delete" onClick={() => { if(window.confirm("¿Borrar materia?")) fetch(`${API_URL}/materias/${m.id}`, {method:'DELETE'}).then(()=>cargarDatos()) }}>🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                ) : (
                    <section>
                        <div style={styles.headerActions}>
                            <h3 style={{ margin: 0, color: '#334155' }}>🎯 Estudiantes Asignados</h3>
                            <button style={styles.addBtn} onClick={() => setShowModalAsignar(true)}>+ Asignar a Estudiante</button>
                        </div>
                        <table className="admin-table">
                            <thead><tr><th>Estudiante</th><th>Materia</th><th>Fecha</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {asignaciones.map(a => (
                                    <tr key={a.id}>
                                        <td>{a.nombre_estudiante}</td>
                                        <td><strong>{a.nombre_materia}</strong></td>
                                        <td>{new Date(a.fecha_asignacion).toLocaleDateString()}</td>
                                        <td><button className="btn-icon delete" onClick={() => { if(window.confirm("¿Revocar acceso?")) fetch(`${API_URL}/materias-destinadas/${a.id}`, {method:'DELETE'}).then(()=>cargarDatos()) }}>Revocar</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}
            </div>

            {/* MODAL ASIGNAR CON BUSCADOR DINÁMICO */}
            {showModalAsignar && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <h3 style={{ marginBottom: '20px' }}>🎯 Nueva Asignación</h3>
                        <form onSubmit={handleNuevaAsignacion}>
                            <label style={{ fontWeight: '600', color: '#64748b' }}>1. ¿Qué materia asignaremos?</label>
                            <select required onChange={e => setFormAsignar({...formAsignar, id_materia: e.target.value})}>
                                <option value="">Selecciona una materia...</option>
                                {materiasGlobales.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.nivel})</option>)}
                            </select>
                            
                            <label style={{ fontWeight: '600', color: '#64748b', marginTop: '15px', display: 'block' }}>2. ¿A qué estudiante?</label>
                            {estudianteSeleccionado ? (
                                <div style={styles.selectedBadge}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#0369a1' }}>{estudianteSeleccionado.nombre}</div>
                                        <div style={{ fontSize: '0.8rem' }}>{estudianteSeleccionado.nivel} - {estudianteSeleccionado.grado}</div>
                                    </div>
                                    <button type="button" onClick={() => setEstudianteSeleccionado(null)} style={{ background: '#e0f2fe', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
                                </div>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        style={styles.searchBox}
                                        type="text" 
                                        placeholder="🔍 Buscar por nombre o nivel..." 
                                        value={busquedaEstudiante}
                                        onChange={(e) => setBusquedaEstudiante(e.target.value)}
                                    />
                                    {busquedaEstudiante.length > 0 && (
                                        <div style={styles.resultsList}>
                                            {estudiantesFiltrados.map(est => (
                                                <div 
                                                    key={est.id} 
                                                    style={styles.resultItem}
                                                    onClick={() => { setEstudianteSeleccionado(est); setBusquedaEstudiante(''); }}
                                                    onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                                                    onMouseOut={(e) => e.target.style.background = 'transparent'}
                                                >
                                                    <div style={{ fontWeight: '600' }}>{est.nombre}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{est.nivel} - {est.grado}</div>
                                                </div>
                                            ))}
                                            {estudiantesFiltrados.length === 0 && <div style={{padding:'15px', color:'#94a3b8', textAlign:'center'}}>No se encontraron resultados</div>}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="button" onClick={() => { setShowModalAsignar(false); setEstudianteSeleccionado(null); }} className="btn-cancel">Cancelar</button>
                                <button type="submit" className="btn-save" disabled={!estudianteSeleccionado}>Confirmar Asignación</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionMateriasAdmin;