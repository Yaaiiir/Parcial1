import React, { useState } from 'react';
import '../App.css';

const Login = ({ alLoguear }) => {
    const [credenciales, setCredenciales] = useState({ 
        email: '', 
        password: '',
        rol: 'estudiante' 
    });
    
    const [olvidoPassword, setOlvidoPassword] = useState(false);
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);
    const [mensajeExito, setMensajeExito] = useState("");

    const [datosRecuperacion, setDatosRecuperacion] = useState({
        email: '',
        nombre: ''
    });

    const handleChange = (e) => {
        setCredenciales({ ...credenciales, [e.target.name]: e.target.value });
    };

    const handleRecuperacionChange = (e) => {
        setDatosRecuperacion({ ...datosRecuperacion, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setCargando(true);
        setError("");

        try {
            const respuesta = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credenciales)
            });
            
            const datos = await respuesta.json();

            if (datos.success) {
                alLoguear(datos.user); 
            } else {
                setError(datos.message || `No se encontró cuenta de ${formatRol(credenciales.rol)}`);
                setCargando(false);
            }
        } catch (err) {
            setError("Error de conexión con el servidor ITVE");
            setCargando(false);
        }
    };

    // FUNCIÓN ACTUALIZADA PARA INSERTAR EN REPORTES_ADMIN
    const handleRecuperar = async (e) => {
        e.preventDefault();
        setCargando(true);
        setError("");
        
        // Mapeo de datos para la tabla reportes_admin
        const nuevoReporte = {
            titulo: `Solicitud de Recuperación - ${formatRol(credenciales.rol)}`,
            descripcion: `El usuario ${datosRecuperacion.nombre} con correo ${datosRecuperacion.email} solicita restablecer su contraseña de acceso al sistema.`,
            categoria: 'Actualización',
            prioridad: 'alta',
            autor_nombre: datosRecuperacion.nombre,
            estado: 'pendiente'
        };

        try {
            const respuesta = await fetch('http://localhost:5000/api/reportes-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoReporte)
            });

            if (respuesta.ok) {
                setMensajeExito(`Solicitud enviada. El administrador revisará el caso de ${datosRecuperacion.nombre} pronto.`);
                
                setTimeout(() => {
                    setOlvidoPassword(false);
                    setMensajeExito("");
                    setDatosRecuperacion({ email: '', nombre: '' });
                    setCargando(false);
                }, 4000);
            } else {
                throw new Error("Error en el servidor al guardar reporte");
            }
        } catch (err) {
            setError("No se pudo enviar la solicitud al servidor. Intente más tarde.");
            setCargando(false);
        }
    };

    const formatRol = (r) => {
        if (r === 'admin') return 'Administrador';
        return r.charAt(0).toUpperCase() + r.slice(1);
    };

    return (
        <div className="login-page-wrapper">
            <div className="login-container fade-in">
                <div className="login-box shadow-lg">
                    
                    <div className="login-left">
                        <div className="animated-bg"></div>
                        <div className="overlay-content">
                            <div className="logo-placeholder">
                                <img src="/images/logo_itve.png" alt="Logo ITVE" className="itve-logo-img" />
                            </div>
                            <h1 className="welcome-text">Hola, <br/><span>¡Bienvenido!</span></h1>
                            <p className="description-text">
                                Accede a <strong>ITVE AdaptiMath</strong> para gestionar el sistema o continuar aprendiendo.
                            </p>
                            <button className="help-portal-btn" onClick={() => window.open('https://www.facebook.com/profile.php?id=61572053127378', '_blank')}>
                                Portal de Ayuda
                            </button>
                        </div>
                    </div>

                    <div className="login-right">
                        <div className="form-wrapper">
                            {!olvidoPassword ? (
                                <>
                                    <div className="role-selector-modern">
                                        {['estudiante', 'profesor', 'admin'].map((r) => (
                                            <button 
                                                key={r}
                                                type="button"
                                                className={credenciales.rol === r ? 'active' : ''} 
                                                onClick={() => { setError(""); setCredenciales({...credenciales, rol: r}); }}
                                            >
                                                {r === 'admin' ? 'Admin' : formatRol(r)}
                                            </button>
                                        ))}
                                    </div>
                                    <h2 className="login-title">Iniciar Sesión</h2>
                                    <p className="login-subtitle">Acceso al Panel de {formatRol(credenciales.rol)}</p>
                                    <form onSubmit={handleSubmit}>
                                        <div className="input-group-modern">
                                            <label>Correo Institucional</label>
                                            <div className="input-with-icon">
                                                <span className="icon">📧</span>
                                                <input type="email" name="email" placeholder="usuario@itve.edu.mx" value={credenciales.email} onChange={handleChange} required />
                                            </div>
                                        </div>
                                        <div className="input-group-modern">
                                            <label>Contraseña</label>
                                            <div className="input-with-icon">
                                                <span className="icon">🔒</span>
                                                <input type="password" name="password" placeholder="••••••••" value={credenciales.password} onChange={handleChange} required />
                                            </div>
                                        </div>
                                        <div className="form-options-modern">
                                            <label className="remember-me"><input type="checkbox" /> Recordar sesión</label>
                                            {credenciales.rol !== 'admin' && (
                                                <button type="button" className="forgot-password-link" onClick={() => setOlvidoPassword(true)}>
                                                    ¿Olvidaste tu contraseña?
                                                </button>
                                            )}
                                        </div>
                                        {error && <div className="error-bubble-modern fade-in"><span>⚠️</span> {error}</div>}
                                        <button type="submit" className={`login-submit-btn-modern ${credenciales.rol === 'admin' ? 'btn-admin' : ''}`} disabled={cargando}>
                                            {cargando ? "Cargando..." : "Entrar al Sistema"}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div className="fade-in">
                                    <h2 className="login-title">Recuperar Acceso</h2>
                                    <p className="login-subtitle">Solicitud para el perfil de <strong>{formatRol(credenciales.rol)}</strong></p>
                                    <form onSubmit={handleRecuperar}>
                                        <div className="input-group-modern">
                                            <label>Nombre Completo</label>
                                            <input className="input-plain" type="text" name="nombre" placeholder="Ej. Juan Pérez García" value={datosRecuperacion.nombre} onChange={handleRecuperacionChange} required />
                                        </div>
                                        <div className="input-group-modern">
                                            <label>Correo a recuperar</label>
                                            <input className="input-plain" type="email" name="email" placeholder="tu-correo@itve.edu.mx" value={datosRecuperacion.email} onChange={handleRecuperacionChange} required />
                                        </div>
                                        {mensajeExito && <div className="success-bubble fade-in">✅ {mensajeExito}</div>}
                                        {error && <div className="error-bubble-modern fade-in"><span>⚠️</span> {error}</div>}
                                        <button type="submit" className="login-submit-btn-modern" disabled={cargando}>
                                            {cargando ? "Enviando..." : "Enviar Solicitud al Admin"}
                                        </button>
                                        <button type="button" className="back-to-login" onClick={() => { setOlvidoPassword(false); setMensajeExito(""); setError(""); }}>
                                            Volver al inicio
                                        </button>
                                    </form>
                                </div>
                            )}
                            <p className="contact-support">
                                ¿Necesitas ayuda? <a href="https://wa.me/529711582036?text=Hola,%20necesito%20ayuda%20con%20el%20sistema%20ITVE" target="_blank" rel="noreferrer">Contactar a Sistemas ITVE</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;