import React, { useState, useEffect } from 'react';
import '../App.css';

const SeccionFormulas = () => {
    const [formulas, setFormulas] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [seleccionada, setSeleccionada] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const obtenerFormulas = async () => {
            try {
                const respuesta = await fetch('http://localhost:5000/api/formulas');
                const datos = await respuesta.json();
                setFormulas(datos);
            } catch (error) {
                console.error("Error al obtener fórmulas:", error);
            } finally {
                setCargando(false);
            }
        };
        obtenerFormulas();
    }, []);

    // Lógica de filtrado
    const formulasFiltradas = formulas.filter(f => 
        f.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        f.categoria.toLowerCase().includes(busqueda.toLowerCase())
    );

    if (seleccionada) {
        return (
            <div className="formula-detail-view fade-in">
                <div className="watch-header">
                    <button className="btn-back" onClick={() => setSeleccionada(null)}>
                        ⬅ Volver a la biblioteca
                    </button>
                </div>
                
                <div className="formula-card-focus">
                    <h2 className="text-dark" style={{color: '#000', marginBottom: '5px'}}>
                        {seleccionada.titulo}
                    </h2>
                    <p style={{marginBottom: '20px'}}>
                        <span className="category-tag">{seleccionada.categoria}</span>
                        <span style={{marginLeft: '10px', color: '#666', fontSize: '0.9rem'}}>
                            Nivel: {seleccionada.dificultad}
                        </span>
                    </p>

                    <div className="formula-display">
                        <code>{seleccionada.formula_latex}</code>
                    </div>
                    
                    <div className="exercise-box">
                        <h3 style={{fontSize: '1.2rem', marginBottom: '10px'}}>📝 Ejercicio de Ejemplo</h3>
                        <p className="enunciado">{seleccionada.ejercicio_enunciado}</p>
                        
                        <div className="steps-container" style={{marginTop: '25px'}}>
                            <h4 style={{color: '#1a365d', marginBottom: '15px', borderBottom: '2px solid #f1f1f1', pb: '5px'}}>
                                Resolución paso a paso:
                            </h4>
                            <div className="steps-list">
                                {seleccionada.pasos_resolucion && seleccionada.pasos_resolucion.map((paso, index) => (
                                    <div key={index} className="step-item fade-in-up" style={{animationDelay: `${index * 0.1}s`}}>
                                        <span className="step-number">{index + 1}</span>
                                        <p>{paso}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="yt-container fade-in">
            {/* Cabecera con Buscador Estilo YT */}
            <div className="watch-header" style={{maxWidth: '100%', marginBottom: '30px', textAlign: 'center'}}>
                <h2 className="section-title" style={{fontSize: '2.2rem', color: '#1a365d', marginBottom: '10px'}}>
                    📐 Biblioteca de Fórmulas ITVE
                </h2>
                <p style={{color: '#666', marginBottom: '25px'}}>Domina las matemáticas con aplicaciones prácticas y detalladas.</p>
                
                <div className="yt-search-bar-container">
                    <div className="yt-search-box" style={{margin: '0 auto'}}>
                        <input 
                            type="text" 
                            placeholder="Buscar fórmula (ej. Álgebra, Pitágoras...)" 
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        <button className="yt-search-btn">🔍</button>
                    </div>
                </div>
            </div>

            {cargando ? (
                <div className="loading-msg">Conectando con la base de datos...</div>
            ) : (
                <>
                    {formulasFiltradas.length > 0 ? (
                        <div className="yt-grid">
                            {formulasFiltradas.map(f => (
                                <div key={f.id} className="yt-card formula-item" onClick={() => setSeleccionada(f)}>
                                    <div className="formula-preview">
                                        <code>{f.formula_latex}</code>
                                    </div>
                                    <div className="yt-text">
                                        <h3>{f.titulo}</h3>
                                        <p className="category-tag">{f.categoria}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{textAlign: 'center', padding: '50px', color: '#666'}}>
                            <p style={{fontSize: '1.2rem'}}>No se encontraron fórmulas que coincidan con "{busqueda}"</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SeccionFormulas;