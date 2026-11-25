// Imita google.script.run (lo que usa app.js dentro de Apps Script) pero llamando por
// fetch() al punto de entrada ?api=call del servidor. Sin cookies: funciona igual para
// cualquier visitante, tenga una o varias cuentas de Google abiertas.
(function () {
  'use strict';

  const API = window.AMALFI_API_URL;

  async function pedir(fn, args, limiteMs) {
    const url = API + '?api=call&fn=' + encodeURIComponent(fn) + '&args=' + encodeURIComponent(JSON.stringify(args));
    const ctl = new AbortController();
    const reloj = limiteMs ? setTimeout(() => ctl.abort(), limiteMs) : null;
    try {
      const res = await fetch(url, { method: 'GET', credentials: 'omit', redirect: 'follow', signal: ctl.signal });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch (e) { throw new Error('El servidor devolvió una respuesta no válida (' + res.status + ').'); }
      if (!json.ok) throw new Error(json.error || 'Error del servidor.');
      return json.data;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('El servidor tardó demasiado en responder. Intente de nuevo.');
      throw e;
    } finally {
      if (reloj) clearTimeout(reloj);
    }
  }

  // ---- Carga inmediata -----------------------------------------------------
  // Los datos del tablero se pintan al instante con la última copia conocida (la guardada en
  // este navegador o la publicada en datos.json) y se actualizan en segundo plano.
  const CLAVE = 'amalfi-aseo1:datos';
  const copia = fetch('datos.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  // Si el primer intento no responde a tiempo se lanza un segundo; gana el que llegue antes.
  function pedirLectura(fn, args, relevoMs) {
    return new Promise((ok, mal) => {
      let listo = false, fallos = 0, segundo = false, reloj = null;
      function lanzar() {
        pedir(fn, args, 75000).then(
          (d) => { if (!listo) { listo = true; clearTimeout(reloj); ok(d); } },
          (e) => {
            if (listo) return;
            fallos++;
            if (!segundo) { clearTimeout(reloj); relevo(); }
            else if (fallos === 2) { listo = true; mal(e); }
          });
      }
      function relevo() { if (listo || segundo) return; segundo = true; lanzar(); }
      lanzar();
      reloj = setTimeout(relevo, relevoMs);
    });
  }

  let entregado = false;
  async function datosTablero(onOk, onFail) {
    if (!entregado) {
      let local = null;
      try { local = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { /* sin copia local */ }
      const publicado = await copia;
      const opciones = [local, publicado].filter((d) => d && d.lastUpdated);
      opciones.sort((a, b) => (a.lastUpdated < b.lastUpdated ? 1 : -1));
      if (opciones.length) { entregado = true; if (onOk) onOk(opciones[0]); }
    }
    try {
      const nuevo = await pedirLectura('getFullDashboardData', [], 15000);
      try { localStorage.setItem(CLAVE, JSON.stringify(nuevo)); } catch (e) { /* almacenamiento bloqueado */ }
      entregado = true;
      if (onOk) onOk(nuevo);
    } catch (err) {
      if (onFail) onFail(err); else console.error(err);
    }
  }

  // Las miniaturas quedan guardadas en el navegador: cada foto se pide al servidor una sola vez.
  const almacen = window.caches ? caches.open('amalfi-aseo-fotos1').catch(() => null) : Promise.resolve(null);
  const llave = (ruta, tam) => 'foto-guardada?t=' + tam + '&r=' + encodeURIComponent(ruta);

  async function miniaturas(rutas, tam, onOk, onFail) {
    const cache = await almacen;
    const res = {}, faltan = [];
    await Promise.all(rutas.map(async (ruta) => {
      let guardada = null;
      try { guardada = cache && await cache.match(llave(ruta, tam)); } catch (e) { /* sin caché */ }
      if (guardada) res[ruta] = await guardada.text(); else faltan.push(ruta);
    }));
    if (faltan.length) {
      try {
        const nuevas = await pedirLectura('getPhotoThumbs', [faltan, tam], 20000);
        faltan.forEach((ruta) => {
          const uri = nuevas && nuevas[ruta];
          if (!uri) return;
          res[ruta] = uri;
          if (cache) cache.put(llave(ruta, tam), new Response(uri)).catch(() => {});
        });
      } catch (err) {
        if (!Object.keys(res).length) { if (onFail) onFail(err); return; }
      }
    }
    if (onOk) onOk(res);
  }

  function runner(onOk, onFail) {
    return new Proxy({}, {
      get(_, name) {
        if (name === 'withSuccessHandler') return (f) => runner(f, onFail);
        if (name === 'withFailureHandler') return (f) => runner(onOk, f);
        if (typeof name !== 'string' || name === 'then') return undefined;
        return (...args) => {
          if (name === 'getFullDashboardData') { datosTablero(onOk, onFail); return; }
          if (name === 'getPhotoThumbs') { miniaturas(args[0], args[1], onOk, onFail); return; }
          // Informes y descargas: un solo intento, para no generar archivos duplicados en Drive.
          pedir(name, args, 0).then(
            (data) => { if (onOk) onOk(data); },
            (err) => { if (onFail) onFail(err); else console.error(err); }
          );
        };
      }
    });
  }

  window.google = { script: { get run() { return runner(null, null); } } };
})();
