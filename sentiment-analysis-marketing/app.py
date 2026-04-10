from flask import Flask, request
import psycopg2
import subprocess

app = Flask(__name__)

# 🔥 BOTÓN PARA ACTUALIZAR DATOS
@app.route("/actualizar")
def actualizar():
    subprocess.run(["python", "main.py"])
    return """
    <h2>✅ Datos actualizados correctamente</h2>
    <a href="/">🔙 Volver al dashboard</a>
    """

@app.route("/")
def home():
    filtro = request.args.get("filtro", "todos")

    conexion = psycopg2.connect(
        host="localhost",
        database="sentimientos_db",
        user="postgres",
        password="19032214"
    )

    cursor = conexion.cursor()

    # 🔥 SOLO DATOS MÁS RECIENTES
    if filtro == "todos":
        cursor.execute("""
            SELECT comentario, sentimiento 
            FROM comentarios 
            ORDER BY id DESC 
            LIMIT 50
        """)
    else:
        cursor.execute("""
            SELECT comentario, sentimiento 
            FROM comentarios 
            WHERE sentimiento = %s 
            ORDER BY id DESC 
            LIMIT 50
        """, (filtro,))

    datos = cursor.fetchall()

    # 🔹 Contadores reales
    cursor.execute("SELECT sentimiento, COUNT(*) FROM comentarios GROUP BY sentimiento")
    conteo = dict(cursor.fetchall())

    positivos = conteo.get("positivo", 0)
    negativos = conteo.get("negativo", 0)
    neutros = conteo.get("neutro", 0)

    cursor.close()
    conexion.close()

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Dashboard de Sentimientos</title>

        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

        <style>
            body {{
                background: #f4f6f9;
            }}
            .card {{
                border-radius: 15px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            }}
        </style>
    </head>

    <body>

    <div class="container mt-4">

        <h1 class="text-center mb-4">📊 Dashboard de Sentimientos</h1>

        <!-- 🔥 BOTÓN ACTUALIZAR -->
        <div class="text-center mb-3">
            <a href="/actualizar" class="btn btn-primary">🔄 Actualizar datos</a>
        </div>

        <!-- 🔹 Filtros -->
        <div class="text-center mb-4">
            <a href="/?filtro=todos" class="btn btn-secondary">Todos</a>
            <a href="/?filtro=positivo" class="btn btn-success">Positivos</a>
            <a href="/?filtro=negativo" class="btn btn-danger">Negativos</a>
            <a href="/?filtro=neutro" class="btn btn-warning">Neutros</a>
        </div>

        <div class="row">

            <!-- 🔹 TABLA -->
            <div class="col-md-6">
                <div class="card p-3">
                    <h4>Comentarios recientes</h4>
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Comentario</th>
                                <th>Sentimiento</th>
                            </tr>
                        </thead>
                        <tbody>
    """

    for comentario, sentimiento in datos:
        color = "black"

        if sentimiento == "positivo":
            color = "green"
        elif sentimiento == "negativo":
            color = "red"
        elif sentimiento == "neutro":
            color = "orange"

        html += f"""
            <tr>
                <td>{comentario}</td>
                <td style="color:{color}; font-weight:bold;">{sentimiento}</td>
            </tr>
        """

    html += f"""
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- 🔹 GRÁFICA -->
            <div class="col-md-6">
                <div class="card p-3">
                    <h4>Distribución total</h4>
                    <canvas id="grafica"></canvas>
                </div>
            </div>

        </div>

    </div>

    <script>
        const ctx = document.getElementById('grafica');

        new Chart(ctx, {{
            type: 'pie',
            data: {{
                labels: ['Positivos', 'Negativos', 'Neutros'],
                datasets: [{{
                    data: [{positivos}, {negativos}, {neutros}],
                    backgroundColor: ['green', 'red', 'orange']
                }}]
            }}
        }});
    </script>

    </body>
    </html>
    """

    return html


if __name__ == "__main__":
    app.run(debug=True)