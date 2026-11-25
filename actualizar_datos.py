"""Actualiza datos.json, la copia que el tablero de aseo muestra al abrir.

Uso:  python actualizar_datos.py
Solo reescribe el archivo cuando la información cambió.
"""
import json
import pathlib
import re
import time
import urllib.parse
import urllib.request

CARPETA = pathlib.Path(__file__).resolve().parent
API = re.search(r"'(https://script\.google\.com/[^']+/exec)'",
                (CARPETA / "config.js").read_text(encoding="utf-8")).group(1)
DESTINO = CARPETA / "datos.json"


def pedir(intentos=5):
    url = API + "?" + urllib.parse.urlencode({"api": "call", "fn": "getFullDashboardData", "args": "[]"})
    for n in range(1, intentos + 1):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                resp = json.load(r)
            if not resp.get("ok"):
                raise RuntimeError(resp.get("error"))
            return resp["data"]
        except Exception as e:  # el servidor se bloquea de forma intermitente
            print(f"intento {n}: {e}", flush=True)
            time.sleep(5)
    raise SystemExit("El servidor no respondió; datos.json no se modificó.")


def sin_hora(d):
    return {k: v for k, v in d.items() if k != "lastUpdated"}


def main():
    nuevo = pedir()
    if not nuevo.get("barrido") or not nuevo.get("cat"):
        raise SystemExit("La respuesta llegó sin registros; datos.json no se modificó.")
    anterior = json.loads(DESTINO.read_text(encoding="utf-8")) if DESTINO.exists() else {}
    if sin_hora(anterior) == sin_hora(nuevo):
        print("Sin cambios.")
        return
    DESTINO.write_text(json.dumps(nuevo, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("datos.json actualizado.")


if __name__ == "__main__":
    main()
