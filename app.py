# app.py (reemplaza el contenido actual)
import os, json, logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors

logging.basicConfig(level=logging.INFO)
HERE = os.path.dirname(__file__)

# Ajusta si el nombre del JSON o su ubicación cambia
COURSES_FILE = os.path.join(HERE, "resource", "cursos_coursera.json")
TOP_K = 10

# Servir raíz del proyecto como estático (Index.html en la raíz)
app = Flask(__name__, static_folder='.', static_url_path='')
# Desarrollo: permitir origen localhost. En producción restringe.
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5000"]}})

# --- Carga de cursos ---
if not os.path.exists(COURSES_FILE):
    logging.error("No se encontró cursos_coursera.json en resource/. Coloca el fichero y reinicia.")
    cursos = []
else:
    with open(COURSES_FILE, 'r', encoding='utf-8') as f:
        try:
            cursos = json.load(f)
            logging.info(f"Cargados {len(cursos)} cursos desde {COURSES_FILE}")
        except Exception as e:
            logging.exception("JSON inválido en cursos_coursera.json")
            cursos = []

# Asegurar campos
for c in cursos:
    if isinstance(c, dict):
        c.setdefault('curso', c.get('title', 'Sin título'))
        c.setdefault('descripcion', c.get('description', c.get('descripcion', '')))
        c.setdefault('link', c.get('link', c.get('url', '#')))

# Preparar textos y stop-words de forma robusta
texts = [ (c.get('curso','') + ' ' + c.get('descripcion','')).strip() for c in cursos ]

# Preparar stop-words de forma robusta (opcional: instala 'stop-words' para mejor soporte en español)
try:
    from stop_words import get_stop_words
    spanish_stopwords = get_stop_words('spanish')  # lista de palabras
    logging.info("Usando stop-words en español desde el paquete 'stop-words'.")
except Exception:
    spanish_stopwords = None
    logging.warning("No se encontró el paquete 'stop-words'. Continuando sin stop-words. "
                    "Para mejorar el filtrado en español instala: pip install stop-words")

# Crear el vectorizador y el índice sólo si hay texto
if len(texts) and any(texts):
    tfidf = TfidfVectorizer(max_features=20000, ngram_range=(1,2), stop_words=spanish_stopwords)
    X = tfidf.fit_transform(texts)
    nn = NearestNeighbors(n_neighbors=min(TOP_K, X.shape[0]), metric='cosine', algorithm='brute')
    nn.fit(X)
    logging.info("Modelo TF-IDF y NearestNeighbors listo.")
else:
    tfidf = None
    X = None
    nn = None
    logging.warning("No hay textos para vectorizar: recomendaciones deshabilitadas hasta cargar cursos.")


def user_answers_to_query(payload):
    """Construye una query textual a partir de las respuestas del quiz."""
    parts = []
    if not payload: 
        return ''
    # texto libre prioritario
    tq = payload.get('text_query') or payload.get('query') or ''
    if tq: parts.append(tq)
    # lista de intereses
    interests = payload.get('interests') or []
    if isinstance(interests, list) and interests:
        parts.append(' '.join(interests))
    # nivel / tiempo / idioma / presupuesto / estilos
    for k in ('level', 'time_per_week', 'preferred_language', 'budget', 'learning_style', 'wants_certificate'):
        v = payload.get(k)
        if v:
            parts.append(str(v))
    # unir todo
    query = ' '.join([p for p in parts if p])
    return query.strip()

def get_recommendations_from_query(query, top_k=TOP_K):
    if not tfidf or not nn:
        return []
    if not query:
        # devolver top por defecto (primeros N)
        idxs = list(range(min(top_k, len(cursos))))
        return [{**cursos[i], 'score': None} for i in idxs]
    qv = tfidf.transform([query])
    nnn = min(top_k, X.shape[0], nn.n_neighbors)
    dists, idxs = nn.kneighbors(qv, n_neighbors=nnn)
    dists = dists[0]; idxs = idxs[0]
    results = []
    for dist, idx in zip(dists, idxs):
        item = cursos[int(idx)].copy()
        try:
            score = 1.0 - float(dist)
            score = max(0.0, min(1.0, score))
        except:
            score = None
        item['score'] = score
        results.append(item)
    return results

# --- RUTAS ---
@app.route('/')
def index():
    # sirve Index.html (debe estar en la raíz del proyecto con este nombre)
    return app.send_static_file('Index.html')

@app.route('/api/courses', methods=['GET'])
def list_courses():
    return jsonify({'count': len(cursos), 'courses': cursos[:200]})

@app.route('/api/quiz-result', methods=['POST'])
def quiz_result():
    try:
        payload = request.get_json(force=True)
    except Exception as e:
        return jsonify({'error':'JSON inválido'}), 400
    query = user_answers_to_query(payload)
    recs = get_recommendations_from_query(query, top_k=TOP_K)
    # log simple
    try:
        with open(os.path.join(HERE, 'quiz_logs.jsonl'), 'a', encoding='utf-8') as f:
            f.write(json.dumps({'payload': payload, 'query': query, 'top_links': [r.get('link') for r in recs]}, ensure_ascii=False) + '\n')
    except Exception:
        logging.exception("No se pudo escribir quiz_logs.jsonl")
    return jsonify({'recommendations': recs, 'meta': {'query': query}}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
