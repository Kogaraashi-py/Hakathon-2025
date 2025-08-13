# app.py (UNIFICADO)
import os, json, logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors

logging.basicConfig(level=logging.INFO)
HERE = os.path.dirname(__file__)

# --- Archivos ---
COURSES_FILE = os.path.join(HERE, "resource", "cursos_coursera.json")
USERS_FILE   = os.path.join(HERE, "resource", "usuarios.json")
RATINGS_FILE = os.path.join(HERE, "resource", "calificaciones.json")
STATS_FILE   = os.path.join(HERE, "resource", "estadisticas.json")
TOP_K = 10

# Servir raíz del proyecto como estático (Index.html en la raíz)
app = Flask(__name__, static_folder='.', static_url_path='')
# CORS solo para /api/* si algún día sirves frontend en otro origen
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5000","http://127.0.0.1:5000"]}})

# ---------- utilidades json ----------
def load_json(path, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        logging.exception(f"Error leyendo {path}")
        return default

def save_json(path, obj):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        logging.exception(f"Error escribiendo {path}")
        return False

# ---------- cursos / recomendador ----------
cursos = load_json(COURSES_FILE, [])
logging.info(f"Cargados {len(cursos)} cursos desde {COURSES_FILE}")

# Normaliza campos esperados por el frontend
for c in cursos:
    if isinstance(c, dict):
        c.setdefault('curso', c.get('title', 'Sin título'))
        c.setdefault('descripcion', c.get('description', c.get('descripcion', '')))
        c.setdefault('link', c.get('link', c.get('url', '#')))

texts = [ (c.get('curso','') + ' ' + c.get('descripcion','')).strip() for c in cursos ]

# Stop-words español (opcional)
try:
    from stop_words import get_stop_words
    spanish_stopwords = get_stop_words('spanish')
    logging.info("Usando stop-words en español desde 'stop-words'.")
except Exception:
    spanish_stopwords = None
    logging.warning("No se encontró 'stop-words'. Sugerido: pip install stop-words")

if len(texts) and any(texts):
    tfidf = TfidfVectorizer(max_features=20000, ngram_range=(1,2), stop_words=spanish_stopwords)
    X = tfidf.fit_transform(texts)
    nn = NearestNeighbors(n_neighbors=min(TOP_K, X.shape[0]), metric='cosine', algorithm='brute')
    nn.fit(X)
    logging.info("Modelo TF-IDF y NearestNeighbors listo.")
else:
    tfidf = None; X = None; nn = None
    logging.warning("No hay textos para vectorizar.")

def user_answers_to_query(payload):
    parts = []
    if not payload: 
        return ''
    tq = payload.get('text_query') or payload.get('query') or ''
    if tq: parts.append(tq)
    interests = payload.get('interests') or []
    if isinstance(interests, list) and interests:
        parts.append(' '.join(interests))
    for k in ('level','time_per_week','preferred_language','budget','learning_style','wants_certificate'):
        v = payload.get(k)
        if v: parts.append(str(v))
    return ' '.join([p for p in parts if p]).strip()

def get_recommendations_from_query(query, top_k=TOP_K):
    if not tfidf or not nn:
        return []
    if not query:
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

# ---------- usuarios / calificaciones ----------
def load_users():
    return load_json(USERS_FILE, [])

def save_users(data):
    return save_json(USERS_FILE, data)

def load_ratings():
    return load_json(RATINGS_FILE, [])

def save_ratings(data):
    return save_json(RATINGS_FILE, data)

def load_stats():
    return load_json(STATS_FILE, {})

def save_stats(data):
    return save_json(STATS_FILE, data)

def compute_stats():
    """Devuelve dict: {curso_id(str): {vistas, total_calificaciones, promedio}}"""
    ratings = load_ratings()
    stats = load_stats()
    # Asegura estructura
    agg = {}
    # Partir de vistas ya guardadas
    for cid, v in (stats or {}).items():
        agg[cid] = {
            "vistas": int(v.get("vistas", 0)),
            "total_calificaciones": 0,
            "suma_calificaciones": 0.0
        }
    # Sumar calificaciones
    for r in ratings:
        cid = str(r.get("curso_id"))
        if cid not in agg:
            agg[cid] = {"vistas": 0, "total_calificaciones": 0, "suma_calificaciones": 0.0}
        try:
            agg[cid]["total_calificaciones"] += 1
            agg[cid]["suma_calificaciones"] += float(r.get("calificacion") or 0)
        except:
            pass
    # Calcular promedios y limpiar
    out = {}
    for cid, v in agg.items():
        tc = v["total_calificaciones"]
        prom = (v["suma_calificaciones"]/tc) if tc else 0.0
        out[cid] = {"vistas": v["vistas"], "total_calificaciones": tc, "promedio": prom}
    return out

# ---------------- RUTAS ----------------
@app.route('/')
def index():
    return app.send_static_file('Index.html')

@app.route('/api/courses', methods=['GET'])
def list_courses():
    return jsonify({'count': len(cursos), 'courses': cursos[:200]})

@app.route('/api/quiz-result', methods=['POST'])
def quiz_result():
    try:
        payload = request.get_json(force=True)
    except Exception:
        return jsonify({'error':'JSON inválido'}), 400
    query = user_answers_to_query(payload)
    recs = get_recommendations_from_query(query, top_k=TOP_K)
    try:
        with open(os.path.join(HERE, 'quiz_logs.jsonl'), 'a', encoding='utf-8') as f:
            f.write(json.dumps({'payload': payload, 'query': query, 'top_links': [r.get('link') for r in recs]}, ensure_ascii=False) + '\n')
    except Exception:
        logging.exception("No se pudo escribir quiz_logs.jsonl")
    return jsonify({'recommendations': recs, 'meta': {'query': query}}), 200

# ---- API USUARIOS ----
@app.route("/api/registro", methods=["POST"])
def registrar_usuario():
    data = request.get_json(force=True)
    nombre = data.get("nombre")
    idUsuario = data.get("idUsuario")
    contraseña = data.get("contraseña")
    perfil = data.get("perfil", {})

    if not nombre or not idUsuario or not contraseña:
        return jsonify({"error": "Faltan datos obligatorios"}), 400

    usuarios = load_users()
    if any(u.get("idUsuario") == idUsuario for u in usuarios):
        return jsonify({"error": "El idUsuario ya está registrado"}), 400

    nuevo = {"nombre": nombre, "idUsuario": idUsuario, "contraseña": contraseña, "perfil": perfil}
    usuarios.append(nuevo)
    save_users(usuarios)
    # ⚠️ En producción: NO guardar contraseñas en texto plano.
    return jsonify({"mensaje": "Usuario registrado con éxito", "usuario": {"nombre": nombre, "idUsuario": idUsuario, "perfil": perfil}}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(force=True)
    id_usuario = data.get('idUsuario') or data.get('username')
    contrasena = data.get('contraseña') or data.get('password')

    usuarios = load_users()
    for u in usuarios:
        if u.get('idUsuario') == id_usuario and u.get('contraseña') == contrasena:
            # simula payload compatible con tu LoginManager
            return jsonify({"success": True, "user": {"username": id_usuario, "name": u.get("nombre")}, "token": "demo-token-from-api"})
    return jsonify({"success": False, "error": "Credenciales inválidas"}), 401

@app.route("/api/usuarios", methods=["GET"])
def listar_usuarios():
    usuarios = load_users()
    # opcional: no devolver contraseñas
    safe = [{"nombre": u.get("nombre"), "idUsuario": u.get("idUsuario"), "perfil": u.get("perfil", {})} for u in usuarios]
    return jsonify(safe)

# ---- API CALIFICACIONES / ESTADÍSTICAS ----
@app.route("/api/ver/<int:id_curso>", methods=["POST"])
def sumar_vista(id_curso):
    stats = load_stats()
    cid = str(id_curso)
    cur = stats.get(cid, {"vistas": 0})
    cur["vistas"] = int(cur.get("vistas", 0)) + 1
    stats[cid] = cur
    save_stats(stats)
    out = compute_stats().get(cid, {"vistas": cur["vistas"], "total_calificaciones": 0, "promedio": 0.0})
    return jsonify({"mensaje": "Vista sumada", "stats": out})

@app.route("/api/calificar", methods=["POST"])
def calificar():
    data = request.get_json(force=True)
    usuario_id = data.get("usuario_id")
    curso_id = data.get("curso_id")
    try:
        calificacion = float(data.get("calificacion"))
    except:
        return jsonify({"error":"calificacion inválida"}), 400

    if usuario_id is None or curso_id is None:
        return jsonify({"error":"usuario_id y curso_id son obligatorios"}), 400

    calificaciones = load_ratings()
    existente = next((c for c in calificaciones if str(c.get("usuario_id")) == str(usuario_id) and str(c.get("curso_id")) == str(curso_id)), None)
    if existente:
        existente["calificacion"] = calificacion
        mensaje = "Calificación actualizada"
    else:
        calificaciones.append({"usuario_id": usuario_id, "curso_id": curso_id, "calificacion": calificacion})
        mensaje = "Calificación agregada"

    save_ratings(calificaciones)
    stats = compute_stats()
    return jsonify({"mensaje": mensaje, "stats": stats.get(str(curso_id), {})})

@app.route("/api/mis_calificaciones/<int:usuario_id>", methods=["GET"])
def mis_calificaciones(usuario_id):
    calificaciones = load_ratings()
    propios = [c for c in calificaciones if str(c.get("usuario_id")) == str(usuario_id)]
    return jsonify(propios)

# --------------- main ---------------
if __name__ == '__main__':
    app.run(debug=True, port=5000)
