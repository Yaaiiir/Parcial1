import React, { useState, useEffect } from 'react';
import '../App.css';

const Reportes = ({ usuario }) => {
    const [historial, setHistorial] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [reporteSeleccionado, setReporteSeleccionado] = useState(null);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (usuario?.id) {
            console.log("🔍 Cargando reportes para el profesor ID:", usuario.id);
            obtenerReportes();
        }
    }, [usuario]);

    const obtenerReportes = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/profesor/${usuario.id}/reportes`);
            const datos = await res.json();
            console.log("📋 Datos recibidos del servidor:", datos);
            setHistorial(datos || []);
        } catch (error) {
            console.error("❌ Error al cargar reportes:", error);
        } finally {
            setCargando(false);
        }
    };

    const abrirModalEnvio = (reporte) => {
        console.log("🎯 Reporte seleccionado para enviar:", reporte);
        setReporteSeleccionado(reporte);
        setMostrarModal(true);
    };

    const descargarPDF = () => {
        if (!reporteSeleccionado) return;
        const elemento = document.getElementById('pdf-content');
        const opt = {
            margin: 0.5,
            filename: `Reporte_${reporteSeleccionado.nombre_estudiante}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 3, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        window.html2pdf().from(elemento).set(opt).save();
    };

    // FUNCIÓN CON CONSOLA PARA DEPURACIÓN
    const enviarAlAdmin = async () => {
        if (!reporteSeleccionado) return;
        
        console.log("📤 Iniciando envío del reporte ID:", reporteSeleccionado.id);
        setEnviando(true);

        try {
            const url = `http://localhost:5000/api/reportes/${reporteSeleccionado.id}/enviar`;
            const payload = { 
                enviado_admin: true,
                fecha_envio: new Date().toISOString() 
            };

            console.log("🌐 URL de petición:", url);
            console.log("📦 Payload enviado:", payload);

            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log("📥 Status del servidor:", res.status);

            if (res.ok) {
                const resultado = await res.json();
                console.log("✅ Respuesta exitosa:", resultado);
                alert(`🚀 El reporte de ${reporteSeleccionado.nombre_estudiante} ha sido enviado al panel del Administrador.`);
                setMostrarModal(false);
                obtenerReportes(); 
            } else {
                const errorData = await res.text();
                console.error("⚠️ Error en la respuesta del servidor:", errorData);
                throw new Error("No se pudo completar el envío.");
            }
        } catch (error) {
            console.error("❌ Error fatal en enviarAlAdmin:", error);
            alert("Hubo un error al conectar con el servidor. Revisa la consola.");
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="reportes-container fade-in">
            <header className="seccion-header-profesor">
                <div className="header-info">
                    <h2>Historial de Reportes Académicos</h2>
                    <p>Gestiona y autoriza el envío de información al Administrador.</p>
                </div>
            </header>

            {cargando ? (
                <div className="loader-container">Conectando con ITVE Cloud...</div>
            ) : historial.length > 0 ? (
                <div className="tabla-responsive">
                    <table className="tabla-itve">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Estudiante</th>
                                <th>Materia</th>
                                <th>Asistencia</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historial.map((rep) => (
                                <tr key={rep.id}>
                                    <td>{new Date(rep.fecha_reporte).toLocaleDateString()}</td>
                                    <td className="td-nombre"><strong>{rep.nombre_estudiante}</strong></td>
                                    <td>{rep.nombre_materia}</td>
                                    <td>{rep.asistencia_escuela}%</td>
                                    <td>
                                        {rep.enviado_admin ? 
                                            <span className="badge-enviado">✅ Enviado</span> : 
                                            <span className="badge-pendiente">⏳ Pendiente</span>
                                        }
                                    </td>
                                    <td>
                                        <button className="btn-vincular" onClick={() => abrirModalEnvio(rep)}>
                                            Ver / Enviar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="no-data-msg"><p>No hay reportes registrados para este docente.</p></div>
            )}

            {/* Modal de PDF y Envío */}
            {mostrarModal && reporteSeleccionado && (
                <div className="modal-overlay">
                    <div className="modal-content-pdf">
                        <div className="modal-header">
                            <h3>Gestión de Reporte Oficial</h3>
                            <button className="btn-cerrar-modal" onClick={() => setMostrarModal(false)}>&times;</button>
                        </div>
                        
                        <div className="modal-body-scroll">
                            <div id="pdf-content" className="pdf-preview-area">
                                <div className="pdf-header-logo">
                                    <img src="/images/logo_itve.png" alt="Logo" className="pdf-logo-img" />
                                    <h2>ITVE | AdaptiMath</h2>
                                    <p>REPORTE DE RENDIMIENTO</p>
                                </div>
                                <div className="pdf-info-grid">
                                    <p><strong>ALUMNO:</strong> {reporteSeleccionado.nombre_estudiante}</p>
                                    <p><strong>DOCENTE:</strong> {usuario.nombre}</p>
                                    <p><strong>MATERIA:</strong> {reporteSeleccionado.nombre_materia}</p>
                                </div>
                                <div className="pdf-comentario">
                                    <strong>Observaciones:</strong><br/>
                                    {reporteSeleccionado.comentario || "Sin observaciones."}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer-btns">
                            <button className="btn-descargar-pdf" onClick={descargarPDF}>📥 Descargar PDF</button>
                            <button 
                                className="btn-enviar-admin" 
                                onClick={enviarAlAdmin}
                                disabled={enviando || reporteSeleccionado.enviado_admin}
                                style={{
                                    backgroundColor: reporteSeleccionado.enviado_admin ? '#94a3b8' : '#16a34a'
                                }}
                            >
                                {enviando ? "Procesando..." : reporteSeleccionado.enviado_admin ? "Enviado con Éxito ✅" : "🚀 Confirmar Envío al Admin"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reportes;