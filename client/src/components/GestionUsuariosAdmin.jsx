import React, { useState, useEffect } from 'react';

const GestionUsuariosAdmin = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [nuevoUsuario, setNuevoUsuario] = useState({
        nombre: '', correo: '', password: '', rol: 'estudiante', nivel: 'Secundaria', grado: '1'
    });
    const [editando, setEditando] = useState(null);

    const cargarUsuarios = () => {
        fetch('http://localhost:5000/api/usuarios')
            .then(res => res.json())
            .then(data => setUsuarios(data))
            .catch(err => console.error("Error cargando usuarios:", err));
    };

    useEffect(() => { cargarUsuarios(); }, []);

    const handleCrear = (e) => {
        e.preventDefault();
        fetch('http://localhost:5000/api/usuarios/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoUsuario)
        })
        .then(() => {
            alert("Usuario creado");
            setNuevoUsuario({ nombre: '', correo: '', password: '', rol: 'estudiante', nivel: 'Secundaria', grado: '1' });
            cargarUsuarios();
        });
    };

    const handleEliminar = (id) => {
        if (window.confirm("¿Eliminar este usuario?")) {
            fetch(`http://localhost:5000/api/usuarios/${id}`, { method: 'DELETE' })
                .then(() => cargarUsuarios());
        }
    };

    return (
        <div className="gestion-usuarios-container fade-in">
            <h2 className="mb-4">Administración de Cuentas</h2>
            
            {/* Formulario de Creación */}
            <div className="card shadow-sm mb-5 p-4">
                <h4>Registrar Nuevo Usuario</h4>
                <form onSubmit={handleCrear} className="row g-3">
                    <div className="col-md-4">
                        <input type="text" placeholder="Nombre Completo" className="form-control" 
                            value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} required />
                    </div>
                    <div className="col-md-4">
                        <input type="email" placeholder="Correo Electrónico" className="form-control" 
                            value={nuevoUsuario.correo} onChange={e => setNuevoUsuario({...nuevoUsuario, correo: e.target.value})} required />
                    </div>
                    <div className="col-md-4">
                        <input type="password" placeholder="Contraseña" className="form-control" 
                            value={nuevoUsuario.password} onChange={e => setNuevoUsuario({...nuevoUsuario, password: e.target.value})} required />
                    </div>
                    <div className="col-md-3">
                        <select className="form-select" value={nuevoUsuario.rol} onChange={e => setNuevoUsuario({...nuevoUsuario, rol: e.target.value})}>
                            <option value="estudiante">Estudiante</option>
                            <option value="profesor">Profesor</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <select className="form-select" value={nuevoUsuario.nivel} onChange={e => setNuevoUsuario({...nuevoUsuario, nivel: e.target.value})}>
                            <option value="Secundaria">Secundaria</option>
                            <option value="Preparatoria">Preparatoria</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <button type="submit" className="btn btn-primary w-100">Registrar</button>
                    </div>
                </form>
            </div>

            {/* Tabla de Usuarios */}
            <div className="table-responsive bg-white p-3 rounded shadow-sm">
                <table className="table table-hover">
                    <thead className="table-dark">
                        <tr>
                            <th>Nombre</th>
                            <th>Correo</th>
                            <th>Rol</th>
                            <th>Nivel/Grado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map(u => (
                            <tr key={u.id}>
                                <td>{u.nombre}</td>
                                <td>{u.correo}</td>
                                <td><span className={`badge ${u.rol === 'profesor' ? 'bg-info' : 'bg-secondary'}`}>{u.rol}</span></td>
                                <td>{u.nivel} - {u.grado}°</td>
                                <td>
                                    <button className="btn btn-sm btn-danger" onClick={() => handleEliminar(u.id)}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GestionUsuariosAdmin;