import React from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

const EjercicioCuadratico = () => {
  // Esta es la ecuación que definimos en el diseño de AdaptiMath Academy
  const ecuacion = "x^2 - 5x + 6 = 0";

  return (
    <div style={{ padding: '20px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h3>Tema: Ecuaciones Cuadráticas - Nivel: Medio</h3>
      <div style={{ fontSize: '1.5rem', margin: '20px 0' }}>
        {/* Renderizado profesional con KaTeX */}
        <BlockMath math={ecuacion} />
      </div>
      <p>Resuelve para x:</p>
      <input type="text" placeholder="Tu respuesta..." style={{ padding: '8px', borderRadius: '4px' }} />
      <button style={{ marginLeft: '10px', padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
        Enviar Solución
      </button>
    </div>
  );
};

export default EjercicioCuadratico;