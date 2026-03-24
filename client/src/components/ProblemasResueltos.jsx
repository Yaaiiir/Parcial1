import React, { useState, useEffect } from 'react';
import '../App.css';

const ProblemasResueltos = () => {
    const [documentos, setDocumentos] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const obtenerDocumentos = async () => {
            try {
                const respuesta = await fetch('http://localhost:5000/api/problemas-resueltos');
                const datos = await respuesta.json();
                setDocumentos(datos);
            } catch (error) {
                console.error("Error al obtener documentos:", error);
            } finally {
                setCargando(false);
            }
        };
        obtenerDocumentos();
    }, []);

    return (
        <div className="yt-container fade-in">
            <div className="watch-header" style={{maxWidth: '100%', marginBottom: '30px'}}>
                <h2 className="section-title" style={{fontSize: '2rem', color: '#1a365d'}}>
                    ✅ Problemas Resueltos (PDF)
                </h2>
                <p style={{color: '#666'}}>Descarga material de apoyo y solucionarios oficiales del ITVE.</p>
            </div>

            {cargando ? (
                <div className="loading-msg">Accediendo al archivo digital...</div>
            ) : (
                <div className="docs-grid">
                    {documentos.map(doc => (
                        <div key={doc.id} className="doc-card">
                            <div className="doc-icon">📑</div>
                            <div className="doc-info">
                                <h3>{doc.titulo}</h3>
                                <p className="doc-theme">{doc.tema}</p>
                                <p className="doc-desc">{doc.descripcion}</p>
                                <div className="doc-meta">
                                    <span>{doc.tamano_archivo}</span>
                                    <span>•</span>
                                    <span>{doc.paginas} páginas</span>
                                </div>
                            </div>
                            <a 
                                href={doc.url_pdf} 
                                download 
                                className="btn-download"
                                target="_blank" 
                                rel="noopener noreferrer"
                            >
                                Descargar PDF
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProblemasResueltos;