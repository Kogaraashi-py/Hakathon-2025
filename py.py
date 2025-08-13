from flask import Flask, request, jsonify
import json, os

app = Flask(__name__)

CURSOS_FILE = "cursos_coursera.json"
CALIFICACIONES_FILE = "calificaciones.json"
STATS_FILE = "estadisticas.json"

def cargar_cursos():
    with open(CURSOS_FILE, "r", encoding="utf-8") as f:
        cursos = json.load(f)
    for i, curso in enumerate(cursos, start=1):
        curso["id_local"] = i
    return cursos

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

    # Calcular promedio
    for cid, datos in stats.items():
        datos["promedio"] = datos["suma_calificaciones"] / datos["total_calificaciones"]
        del datos["suma_calificaciones"]

    return stats

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

    # Buscar si ya calificó este curso
    existente = next((c for c in calificaciones if c["usuario_id"] == usuario_id and c["curso_id"] == curso_id), None)
    if existente:
        existente["calificacion"] = calificacion  # Actualiza la calificación
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

if __name__ == "__main__":
    app.run(debug=True)
