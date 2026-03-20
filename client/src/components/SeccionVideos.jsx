import React, { useState, useEffect } from 'react';
import '../App.css'; 

const SeccionVideos = () => {
    const [videos, setVideos] = useState([]);
    const [videoSeleccionado, setVideoSeleccionado] = useState(null);
    const [vistaModo, setVistaModo] = useState("feed"); // "feed" o "reproductor"
    const [categoriaActiva, setCategoriaActiva] = useState("Todos");
    const [busqueda, setBusqueda] = useState("");
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const cargarVideos = async () => {
            try {
                setCargando(true);
                const res = await fetch('http://localhost:5000/api/videos');
                const data = await res.json();
                setVideos(data);
            } catch (err) {
                console.error("Error al obtener videos:", err);
            } finally {
                setCargando(false);
            }
        };
        cargarVideos();
    }, []);

    const videosFiltrados = videos.filter(v => {
        const coincideCategoria = categoriaActiva === "Todos" || v.categoria === categoriaActiva;
        const coincideBusqueda = v.titulo.toLowerCase().includes(busqueda.toLowerCase());
        return coincideCategoria && coincideBusqueda;
    });

    // --- VISTA 1: CATÁLOGO (FEED) ---
    if (vistaModo === "feed") {
        return (
            <div className="yt-container fade-in">
                <div className="yt-search-bar-container">
                    <div className="yt-search-box">
                        <input 
                            type="text" 
                            placeholder="Buscar tutoriales o clases..." 
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        <button className="yt-search-btn">🔍</button>
                    </div>
                </div>

                <div className="yt-chips-container">
                    {["Todos", "Matemáticas", "Física", "Programación", "Sistemas"].map(cat => (
                        <button 
                            key={cat} 
                            className={`chip-btn ${categoriaActiva === cat ? "active" : ""}`}
                            onClick={() => setCategoriaActiva(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {cargando ? (
                    <div className="loading-msg">Conectando con el servidor ITVE...</div>
                ) : (
                    <div className="yt-grid">
                        {videosFiltrados.length > 0 ? (
                            videosFiltrados.map(video => (
                                <div key={video.id} className="yt-card" onClick={() => {
                                    setVideoSeleccionado(video);
                                    setVistaModo("reproductor");
                                    window.scrollTo(0,0);
                                }}>
                                    <div className="yt-thumbnail">
                                        <img src={video.url_miniatura} alt={video.titulo} />
                                        <span className="yt-duration">{video.duracion}</span>
                                    </div>
                                    <div className="yt-details">
                                        <div className="yt-avatar">{video.canal.charAt(0).toUpperCase()}</div>
                                        <div className="yt-text">
                                            <h3>{video.titulo}</h3>
                                            <p>{video.canal}</p>
                                            <p>{video.vistas?.toLocaleString()} vistas</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-results">No se encontraron videos para "{busqueda}"</div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // --- VISTA 2: REPRODUCTOR ENFOCADO (WATCH MODE) ---
    return (
        <div className="video-watch-mode fade-in">
            <div className="watch-header">
                <button className="btn-back" onClick={() => setVistaModo("feed")}>
                    ⬅ Volver al catálogo
                </button>
            </div>

            <div className="watch-content-layout">
                {/* Columna Principal: Video e Información */}
                <div className="main-video-column">
                    <div className="yt-video-wrapper">
                        <iframe 
                            src={`https://www.youtube.com/embed/${videoSeleccionado.url_video}?autoplay=1&rel=0`} 
                            title={videoSeleccionado.titulo}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>

                    <div className="video-meta-data">
                        <h1>{videoSeleccionado.titulo}</h1>
                        <div className="video-actions">
                            <div className="channel-info">
                                <div className="yt-avatar">{videoSeleccionado.canal.charAt(0).toUpperCase()}</div>
                                <div className="channel-text">
                                    <span className="channel-name">{videoSeleccionado.canal}</span>
                                    <span className="sub-count">Institución ITVE</span>
                                </div>
                            </div>
                            <div className="external-links">
                                <a 
                                    href={`https://www.youtube.com/watch?v=${videoSeleccionado.url_video}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="yt-link-btn"
                                >
                                    🌐 Abrir en YouTube
                                </a>
                            </div>
                        </div>
                        
                        <div className="video-description-box">
                            <strong>{videoSeleccionado.vistas?.toLocaleString()} vistas • {videoSeleccionado.categoria}</strong>
                            <p>{videoSeleccionado.descripcion || "Sin descripción disponible."}</p>
                        </div>
                    </div>

                    {/* SECCIÓN DE COMENTARIOS */}
                    <section className="comments-section">
                        <h3>Comentarios</h3>
                        <div className="comment-input-box">
                            <div className="yt-avatar">U</div>
                            <div className="input-group">
                                <input type="text" placeholder="Escribe un comentario académico..." />
                                <div className="input-buttons">
                                    <button className="btn-cancel">Cancelar</button>
                                    <button className="btn-comment" disabled>Comentar</button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="comment-list">
                            <div className="comment-item">
                                <div className="yt-avatar">A</div>
                                <div className="comment-text">
                                    <strong>@Alumno_Egresado • hace 2 horas</strong>
                                    <p>Esta explicación sobre {videoSeleccionado.categoria} es justo lo que necesitaba para el proyecto final.</p>
                                    <div className="comment-footer">
                                        <span>👍 12</span> <span>👎</span> <span>Responder</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Columna Lateral (Sugerencias/Relacionados) */}
                <aside className="side-suggestions">
                    <h4 style={{marginBottom: '15px'}}>Más de {videoSeleccionado.categoria}</h4>
                    {videos
                        .filter(v => v.categoria === videoSeleccionado.categoria && v.id !== videoSeleccionado.id)
                        .slice(0, 3)
                        .map(v => (
                            <div key={v.id} className="mini-card" onClick={() => {
                                setVideoSeleccionado(v);
                                window.scrollTo(0,0);
                            }}>
                                <img src={v.url_miniatura} alt={v.titulo} />
                                <div className="mini-card-info">
                                    <h4>{v.titulo}</h4>
                                    <p>{v.canal}</p>
                                </div>
                            </div>
                        ))
                    }
                </aside>
            </div>
        </div>
    );
};

export default SeccionVideos;