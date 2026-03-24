import React, { useState, useEffect } from 'react';

const SeccionLibros = () => {
  const [libros, setLibros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCat, setFiltroCat] = useState("Todos");
  const [libroSeleccionado, setLibroSeleccionado] = useState(null); 

  useEffect(() => {
    const fetchLibros = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/libros');
        const data = await response.json();
        setLibros(data);
      } catch (error) {
        console.error("Error al cargar libros:", error);
      } finally {
        setTimeout(() => setCargando(false), 300);
      }
    };
    fetchLibros();
  }, []);

  const categorias = ["Todos", ...new Set(libros.map(l => l.categoria))];

  const librosFiltrados = libros.filter(libro => {
    const coincideBusqueda = libro.titulo?.toLowerCase().includes(busqueda.toLowerCase()) || 
                             libro.autor?.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCat = filtroCat === "Todos" || libro.categoria === filtroCat;
    return coincideBusqueda && coincideCat;
  });

  if (cargando) return (
    <div className="loading-area" style={{textAlign: 'center', padding: '100px'}}>
      <div className="spinner"></div>
      <p>Consultando Biblioteca ITVE...</p>
    </div>
  );

  // --- VISTA DETALLADA (CLASES EXCLUSIVAS v-detalles) ---
  if (libroSeleccionado) {
    return (
      <div className="v-detalles-wrapper fade-in">
        <div className="v-detalles-container">
          <button className="v-detalles-btn-volver" onClick={() => setLibroSeleccionado(null)}>
             ← Volver a la Biblioteca
          </button>

          <div className="v-detalles-layout">
            {/* Panel Izquierdo: Ficha Técnica */}
            <div className="v-detalles-info">
              <div className="v-detalles-portada-marco">
                <img 
                  src={libroSeleccionado.imagen_url} 
                  alt={libroSeleccionado.titulo} 
                  onError={(e) => { e.target.src = "/images/libros/book-placeholder.jpg"; }}
                />
              </div>
              
              <div className="v-detalles-contenido">
                <span className="v-detalles-tag">{libroSeleccionado.categoria}</span>
                <h1 className="v-detalles-titulo">{libroSeleccionado.titulo}</h1>
                
                <div className="v-detalles-meta">
                  <p><strong>✍️ Autor:</strong> {libroSeleccionado.autor}</p>
                  <p><strong>📅 Publicación:</strong> {libroSeleccionado.fecha_publicacion}</p>
                  <p><strong>🔢 N° Serie:</strong> {libroSeleccionado.numero_serie}</p>
                </div>

                <div className="v-detalles-sinopsis">
                  <h4>Resumen del libro</h4>
                  <p>{libroSeleccionado.sinopsis || "Recurso académico disponible para consulta gratuita."}</p>
                </div>

                <a href={libroSeleccionado.pdf_url} download target="_blank" rel="noreferrer" className="v-detalles-btn-descarga">
                  📥 Descargar Libro Gratis (PDF)
                </a>
              </div>
            </div>

            {/* Panel Derecho: Visor */}
            <div className="v-detalles-visor">
              <h3>Vista Previa Digital</h3>
              <div className="v-detalles-iframe-box">
                {libroSeleccionado.pdf_url && libroSeleccionado.pdf_url !== "#" ? (
                  <iframe 
                    src={`${libroSeleccionado.pdf_url}#toolbar=0`} 
                    title="Vista previa"
                    width="100%" 
                    height="100%"
                    style={{border: 'none'}}
                  ></iframe>
                ) : (
                  <div className="visor-error">
                    <p>La vista previa no está disponible para este título.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA PRINCIPAL (GRID) ---
  return (
    <div className="libros-container fade-in">
      <div className="libros-header">
        <h1>Biblioteca Digital ITVE</h1>
        <p>Selecciona un libro para ver sus detalles y descargarlo.</p>
        
        <div className="libros-toolbar">
          <input 
            type="text" 
            placeholder="Buscar por título o autor..." 
            className="search-input-libros"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <div className="filter-tags">
            {categorias.map(cat => (
              <button 
                key={cat} 
                className={`tag-btn ${filtroCat === cat ? 'active' : ''}`}
                onClick={() => setFiltroCat(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="libros-grid">
        {librosFiltrados.map((libro) => (
          <div key={libro.id} className="libro-card" onClick={() => setLibroSeleccionado(libro)}>
            <div className="libro-portada">
              <img 
                src={libro.imagen_url} 
                alt={libro.titulo} 
                onError={(e) => { e.target.src = "/images/libros/book-placeholder.jpg"; }}
              />
              <div className="libro-overlay">
                <span className="btn-leer">VER FICHA TÉCNICA</span>
              </div>
            </div>
            <div className="libro-info">
              <span className="libro-cat">{libro.categoria}</span>
              <h3>{libro.titulo}</h3>
              <p>{libro.autor}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeccionLibros;