from flask import Flask, request, jsonify
import json, os

app = Flask(__name__)

USUARIOS_FILE = "usuarios.json"

# Cargar usuarios
def cargar_usuarios():
    if os.path.exists(USUARIOS_FILE):
        with open(USUARIOS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

# Guardar usuarios
def guardar_usuarios(data):
    with open(USUARIOS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

# ------------------------
# Rutas
# ------------------------

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

    # Verificar si ya existe el idUsuario
    if any(u["idUsuario"] == idUsuario for u in usuarios):
        return jsonify({"error": "El idUsuario ya está registrado"}), 400

    nuevo_usuario = {
        "nombre": nombre,
        "idUsuario": idUsuario,
        "contraseña": contraseña,  # ⚠️ En producción, encriptar
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

if __name__ == "__main__":
    app.run(debug=True)
