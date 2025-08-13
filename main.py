from flask import Flask, request, jsonify
import json, os

app = Flask(__name__)

# --------------------------
# ARCHIVOS JSON
# --------------------------
CURSOS_FILE = "cursos_coursera.json"
CALIFICACIONES_FILE = "calificaciones.json"
STATS_FILE = "estadisticas.json"
USUARIOS_FILE = "usuarios.json"

# --------------------------
# FUNCIONES AUXILIARES
# --------------------------

# === Cursos ===
def cargar_cursos():
    with open(CURSOS_FILE, "r", encoding="utf-8") as f:
        cursos = json.load(f)
    for i, curso in enumerate(cursos, start=1):
        curso["id_local"] = i
    return cursos

# === Calificaciones ===
def cargar_calificaciones():
    if os.path.exists(CALIFICACIONES_FILE):
        with open(CALIFICACIONES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def guardar_calificaciones(data):
    with open(CALIFICACIONES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def calcular_estadisticas():
    calificaciones = cargar_calificaciones()
    stats = {}
    for entry in calificaciones:
        cid = str(entry["curso_id"])
        if cid not in stats:
            stats[cid] = {"vistas": 0, "total_calificaciones": 0, "suma_calificaciones": 0}
        stats[cid]["total_calificaciones"] += 1
        stats[cid]["suma_calificaciones"] += entry["calificacion"]

    # Calcular promedios
    for cid, datos in stats.items():
        datos["promedio"] = datos["suma_calificaciones"] / datos["total_calificaciones"]
        del datos["suma_calificaciones"]

    return stats

# === Usuarios ===
def cargar_usuarios():
    if os.path.exists(USUARIOS_FILE):
        with open(USUARIOS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def guardar_usuarios(data):
    with open(USUARIOS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

# --------------------------
# RUTAS DE CURSOS Y ESTADÍSTICAS
# --------------------------
@app.route("/cursos", methods=["GET"])
def obtener_cursos():
    return jsonify(cargar_cursos())

@app.route("/ver/<int:id_curso>", methods=["POST"])
def sumar_vista(id_curso):
    stats = calcular_estadisticas()
    cid = str(id_curso)
    if cid not in stats:
        stats[cid] = {"vistas": 0, "promedio": 0, "total_calificaciones": 0}
    stats[cid]["vistas"] += 1
    with open(STATS_FILE, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=4)
    return jsonify({"mensaje": "Vista sumada", "stats": stats[cid]})

@app.route("/calificar", methods=["POST"])
def calificar():
    data = request.json
    usuario_id = data.get("usuario_id")
    curso_id = data.get("curso_id")
    calificacion = float(data.get("calificacion"))

    calificaciones = cargar_calificaciones()

    # Verificar si el usuario ya calificó ese curso
    existente = next((c for c in calificaciones if c["usuario_id"] == usuario_id and c["curso_id"] == curso_id), None)
    if existente:
        existente["calificacion"] = calificacion
        mensaje = "Calificación actualizada"
    else:
        calificaciones.append({"usuario_id": usuario_id, "curso_id": curso_id, "calificacion": calificacion})
        mensaje = "Calificación agregada"

    guardar_calificaciones(calificaciones)
    stats = calcular_estadisticas()
    return jsonify({"mensaje": mensaje, "stats": stats.get(str(curso_id), {})})

@app.route("/mis_calificaciones/<int:usuario_id>", methods=["GET"])
def mis_calificaciones(usuario_id):
    calificaciones = cargar_calificaciones()
    mis_cursos = [c for c in calificaciones if c["usuario_id"] == usuario_id]
    return jsonify(mis_cursos)

# --------------------------
# RUTAS DE LOGIN Y REGISTRO
# --------------------------
@app.route("/registro", methods=["POST"])
def registrar_usuario():
    data = request.json
    nombre = data.get("nombre")
    idUsuario = data.get("idUsuario")
    contraseña = data.get("contraseña")
    perfil = data.get("perfil", {})

    if not nombre or not idUsuario or not contraseña:
        return jsonify({"error": "Faltan datos obligatorios"}), 400

    usuarios = cargar_usuarios()

    if any(u["idUsuario"] == idUsuario for u in usuarios):
        return jsonify({"error": "El idUsuario ya está registrado"}), 400

    nuevo_usuario = {
        "nombre": nombre,
        "idUsuario": idUsuario,
        "contraseña": contraseña,  # ⚠ En producción, usar hash
        "perfil": perfil
    }

    usuarios.append(nuevo_usuario)
    guardar_usuarios(usuarios)

    return jsonify({"mensaje": "Usuario registrado con éxito", "usuario": nuevo_usuario}), 201

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    idUsuario = data.get("idUsuario")
    contraseña = data.get("contraseña")

    usuarios = cargar_usuarios()
    usuario = next((u for u in usuarios if u["idUsuario"] == idUsuario and u["contraseña"] == contraseña), None)

    if usuario:
        return jsonify({"mensaje": "Login exitoso", "usuario": usuario}), 200
    else:
        return jsonify({"error": "Credenciales incorrectas"}), 401

@app.route("/usuarios", methods=["GET"])
def listar_usuarios():
    return jsonify(cargar_usuarios())

# --------------------------
# MAIN
# --------------------------
if __name__ == "__main__":
    app.run(debug=True)
