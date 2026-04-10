import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../App.css';

const ReportesAdmin = () => {
    const [reportesAcademicos, setReportesAcademicos] = useState([]);
    const [solicitudesSistema, setSolicitudesSistema] = useState([]);
    const [loading, setLoading] = useState(true);

    const obtenerDatos = async () => {
        try {
            setLoading(true);
            // 1. Obtener Reportes Académicos (Docentes)
            const resAcad = await fetch('http://localhost:5000/api/admin/reportes-detallados');
            const dataAcad = await resAcad.json();
            setReportesAcademicos(dataAcad || []);

            // 2. Obtener Solicitudes de Sistema (Contraseñas/Actualización)
            const resSist = await fetch('http://localhost:5000/api/reportes-admin?categoria=Actualización');
            const dataSist = await resSist.json();
            // Filtramos solo las pendientes para el panel principal
            setSolicitudesSistema(dataSist.filter(r => r.estado === 'pendiente') || []);

        } catch (err) {
            console.error("❌ Error al cargar reportes:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        obtenerDatos();
    }, []);

    // Lógica para archivar/revisar reportes de sistema (contraseñas)
    const marcarComoRevisadoSistema = async (id) => {
        if (!window.confirm("¿Confirmas que ya atendiste esta solicitud?")) return;
        try {
            const res = await fetch(`http://localhost:5000/api/reportes-admin/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'revisado' })
            });
            if (res.ok) obtenerDatos();
        } catch (err) {
            console.error("Error al actualizar estado:", err);
        }
    };

    // Lógica para archivar reportes académicos
    const archivarReporteAcademico = async (id) => {
        if (!window.confirm("¿Marcar este reporte académico como revisado?")) return;
        try {
            const res = await fetch(`http://localhost:5000/api/admin/reportes/${id}/archivar`, { 
                method: 'PUT' 
            });
            if (res.ok) obtenerDatos();
        } catch (err) {
            console.error("Error al archivar:", err);
        }
    };

    const generarPDF = (rep) => {
        try {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.setTextColor(40, 40, 40);
            doc.text("ITVE AdaptiMath", 14, 20);
            
            doc.setFontSize(14);
            doc.text("Reporte Académico Oficial", 14, 28);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`ID Reporte: #00${rep.id} | Generado: ${new Date().toLocaleString()}`, 14, 35);
            doc.line(14, 38, 196, 38); 

            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text("DATOS GENERALES", 14, 48);
            
            doc.setFont("helvetica", "normal");
            doc.text(`Estudiante: ${rep.nombre_estudiante || 'N/A'}`, 14, 55);
            doc.text(`Materia: ${rep.nombre_materia || 'N/A'}`, 14, 62);
            doc.text(`Docente: ${rep.nombre_profesor || 'N/A'}`, 14, 69);

            autoTable(doc, {
                startY: 75,
                head: [['Parámetro Evaluado', 'Resultado / Calificación']],
                body: [
                    ['Asistencia Escolar', `${rep.asistencia_escuela || 0}%`],
                    ['Disciplina General', rep.disciplina_escuela || 'No especificada'],
                    ['Progreso en Sistema Adaptativo', `${rep.progreso_actual || 0}%`],
                    ['Estatus', (rep.asistencia_escuela < 80 || rep.progreso_actual < 60) ? 'En Seguimiento' : 'Regular']
                ],
                theme: 'grid',
                headStyles: { fillColor: [44, 62, 80] }
            });

            const finalY = doc.lastAutoTable.finalY + 15;
            doc.setFont("helvetica", "bold");
            doc.text("OBSERVACIONES:", 14, finalY);
            doc.setFont("helvetica", "normal");
            const comentario = rep.comentario || "Sin observaciones adicionales.";
            const splitTitle = doc.splitTextToSize(comentario, 180);
            doc.text(splitTitle, 14, finalY + 8);

            doc.save(`Reporte_${(rep.nombre_estudiante || 'Estudiante').replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error("Error PDF:", error);
        }
    };

    if (loading) return (
        <div className="loader-container">
            <div className="loader-itve"></div>
            <p>Sincronizando reportes y solicitudes...</p>
        </div>
    );

    return (
        <div className="reportes-admin-container fade-in">
            <header className="reportes-header-main">
                <h2>📊 Centro de Atención y Reportes</h2>
                <p>Gestión integral de alertas académicas y solicitudes de soporte.</p>
            </header>

            {/* SECCIÓN 1: SOLICITUDES DE SISTEMA (Contraseñas) */}
            <h3 className="section-divider">🔑 Solicitudes de Soporte (Sistema)</h3>
            <div className="reportes-grid mb-5">
                {solicitudesSistema.length === 0 ? (
                    <div className="no-data-card mini">
                        <p>No hay solicitudes de contraseña pendientes.</p>
                    </div>
                ) : (
                    solicitudesSistema.map(sol => (
                        <div key={sol.id} className="reporte-card-full sistema-alert shadow-sm">
                            <div className="card-indicator system"></div>
                            <div className="card-body">
                                <div className="card-top">
                                    <span className="label-categoria sys">SOPORTE TÉCNICO</span>
                                    <span className="fecha-reporte">📅 {new Date(sol.fecha_creacion).toLocaleDateString()}</span>
                                </div>
                                <h3 className="estudiante-nombre">{sol.autor_nombre}</h3>
                                <p className="descripcion-soporte">"{sol.descripcion}"</p>
                                <div className="acciones-reporte">
                                    <button 
                                        className="btn-accion-reporte primary"
                                        onClick={() => marcarComoRevisadoSistema(sol.id)}
                                    >
                                        ✅ Marcar como Atendido
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* SECCIÓN 2: REPORTES ACADÉMICOS */}
            <h3 className="section-divider">📚 Alertas Académicas (Docentes)</h3>
            <div className="reportes-grid">
                {reportesAcademicos.length === 0 ? (
                    <div className="no-data-card">
                        <span className="icon-big">📁</span>
                        <p>No hay reportes académicos pendientes.</p>
                    </div>
                ) : (
                    reportesAcademicos.map(rep => (
                        <div key={rep.id} className="reporte-card-full académica shadow-sm">
                            <div className="card-indicator"></div>
                            <div className="card-body">
                                <div className="card-top">
                                    <span className="label-categoria">ACADÉMICO</span>
                                    <span className="fecha-reporte">📅 {new Date(rep.fecha_reporte).toLocaleDateString()}</span>
                                </div>
                                <h3 className="estudiante-nombre">{rep.nombre_estudiante}</h3>
                                <p className="materia-tag"><strong>Materia:</strong> {rep.nombre_materia}</p>
                                
                                <div className="stats-preview-admin">
                                    <div className="stat-mini">
                                        <span>Asistencia</span>
                                        <strong className={rep.asistencia_escuela < 80 ? "text-danger" : ""}>{rep.asistencia_escuela}%</strong>
                                    </div>
                                    <div className="stat-mini">
                                        <span>Progreso</span>
                                        <strong>{rep.progreso_actual}%</strong>
                                    </div>
                                </div>

                                <div className="acciones-reporte">
                                    <button className="btn-accion-reporte primary" onClick={() => generarPDF(rep)}>
                                        📥 PDF
                                    </button>
                                    <button className="btn-accion-reporte secondary" onClick={() => archivarReporteAcademico(rep.id)}>
                                        ✅ Archivar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ReportesAdmin;