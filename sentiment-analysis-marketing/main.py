import requests
import psycopg2
from transformers import pipeline

# 🔹 CONFIGURACIÓN
ACCESS_TOKEN = "EAAKHLXKOpAkBRHPfrzQDf1nuZCG6YyMmGggBnqZADSnZAw0Hy8R5zUvm3JYTIa7SZBPtClEpk9DlF6NzWc7xAJbIa4lNj8BQmHjYYc6pQmCazZAZCNtaKQZCxYkYFuvTCZBJwKPqYYTDwnZAdXUqAkfzmLxz0hG0akmikiXJi88WJKGaWjaA3rA9iwFQ21wTF8Gkdjl7rMc5xhYpt6gU9U91OWMfOGkTy9MwzCISNheYZD"
POST_ID = "1065962019934982_122096032526882276"

# 🔹 Modelo BERT
print("⏳ Cargando modelo de IA (esto puede tardar la primera vez)...")
classifier = pipeline(
    "sentiment-analysis",
    model="nlptown/bert-base-multilingual-uncased-sentiment"
)
print("✅ Modelo cargado\n")

# 🔹 Función de sentimiento
def obtener_sentimiento(texto):
    try:
        resultado = classifier(texto)[0]
        label = resultado['label']

        if "1" in label or "2" in label:
            return "negativo"
        elif "4" in label or "5" in label:
            return "positivo"
        else:
            return "neutro"

    except Exception as e:
        print("⚠️ Error:", e)
        return "neutro"

# 🔹 URL API
url = f"https://graph.facebook.com/v18.0/{POST_ID}/comments?fields=message&access_token={ACCESS_TOKEN}"

try:
    response = requests.get(url)
    data = response.json()

    if 'data' not in data:
        print("❌ Error en la API:", data)
        exit()

    comentarios = [c['message'] for c in data['data'] if 'message' in c]

    if not comentarios:
        print("⚠️ No hay comentarios")
        exit()

    print("📊 Comentarios obtenidos:\n")

    # 🔹 Conexión DB
    conexion = psycopg2.connect(
        host="localhost",
        database="sentimientos_db",
        user="postgres",
        password="19032214"
    )

    cursor = conexion.cursor()

    for comentario in comentarios:
        sentimiento = obtener_sentimiento(comentario)

        print(f"Comentario: {comentario}")
        print(f"Sentimiento: {sentimiento}\n")

        # 🔥 Verificar si existe
        cursor.execute(
            "SELECT id FROM comentarios WHERE comentario = %s",
            (comentario,)
        )
        resultado = cursor.fetchone()

        if resultado is None:
            # ✅ INSERTAR
            cursor.execute(
                "INSERT INTO comentarios (comentario, sentimiento) VALUES (%s, %s)",
                (comentario, sentimiento)
            )
            print("🆕 Insertado\n")

        else:
            # 🔥 ACTUALIZAR (CLAVE)
            cursor.execute(
                "UPDATE comentarios SET sentimiento = %s WHERE comentario = %s",
                (sentimiento, comentario)
            )
            print("🔄 Actualizado\n")

    conexion.commit()
    cursor.close()
    conexion.close()

    print("✅ Base de datos actualizada correctamente")

except Exception as e:
    print("❌ Error general:", e)