import requests
import json
import time

BASE_COURSES = "https://api.coursera.org/api/courses.v1"
BASE_DETAILS = "https://api.coursera.org/api/onDemandCourses.v1"
OUTPUT_FILE = "cursos_coursera.json"
TOTAL_CURSOS = 1000
LIMIT = 100  # máximo permitido por la API por petición
BATCH_SIZE = 20  # número de IDs por consulta de detalles

def obtener_descripciones(ids):
    """Obtiene descripciones de cursos por lotes pequeños."""
    detalles = {}
    for i in range(0, len(ids), BATCH_SIZE):
        lote = ids[i:i+BATCH_SIZE]
        resp = requests.get(BASE_DETAILS, params={"ids": ",".join(lote)})
        if resp.status_code != 200:
            print(f"⚠️ Error al obtener detalles (HTTP {resp.status_code}) para IDs {lote}")
            continue
        try:
            data = resp.json()
        except json.JSONDecodeError:
            print(f"⚠️ Respuesta inválida para IDs {lote}")
            continue

        for d in data.get("elements", []):
            detalles[d["id"]] = d.get("description", "").strip()
        time.sleep(0.3)  # evitar sobrecarga
    return detalles

def obtener_cursos():
    cursos = []
    start = 0

    while len(cursos) < TOTAL_CURSOS:
        print(f"📥 Descargando cursos {start} a {start + LIMIT}...")
        resp = requests.get(BASE_COURSES, params={"start": start, "limit": LIMIT})
        if resp.status_code != 200:
            print(f"❌ Error HTTP {resp.status_code}, deteniendo.")
            break

        try:
            data = resp.json()
        except json.JSONDecodeError:
            print("❌ Respuesta inválida del listado de cursos.")
            break

        elementos = data.get("elements", [])
        if not elementos:
            print("✅ No hay más cursos para descargar.")
            break

        ids = [curso["id"] for curso in elementos if "id" in curso]
        descripciones = obtener_descripciones(ids)

        for curso in elementos:
            cid = curso.get("id")
            nombre = curso.get("name", "").strip()
            slug = curso.get("slug", "")
            enlace = f"https://www.coursera.org/learn/{slug}" if slug else ""
            descripcion = descripciones.get(cid, "")

            cursos.append({
                "curso": nombre,
                "descripcion": descripcion,
                "link": enlace
            })

            if len(cursos) >= TOTAL_CURSOS:
                break

        start += LIMIT
        time.sleep(0.5)

    return cursos

if __name__ == "__main__":
    cursos = obtener_cursos()

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(cursos, f, ensure_ascii=False, indent=4)

    print(f"\n✅ Dataset generado: {OUTPUT_FILE} con {len(cursos)} cursos.")
