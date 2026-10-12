# Tablero de aseo — Amalfi S.A. E.S.P.

Pantalla pública del tablero de aseo (barrido, lavado de áreas, poda de árboles y limpieza de cestas).
Se publica con GitHub Pages y no depende de la sesión de Google de quien la abre.

## Cómo funciona

- `index.html`, `styles.css` y `app.js` son la pantalla del tablero.
- Los datos, las fotos y los informes salen de un servicio en Google Apps Script que lee la hoja
  madre de AppSheet y la carpeta de Drive con las fotos. La pantalla lo consulta con `fetch()` sin cookies.
- `gas-shim.js` traduce las llamadas internas de `app.js` a esas peticiones web.
- `config.js` contiene la dirección del servicio. Si se despliega con otra dirección, es el único archivo que cambia.
- Las fotos y los datos no se guardan en este repositorio.

## Actualizar

Cualquier cambio en estos archivos se publica solo al subirlo a la rama `main`.
