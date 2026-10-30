# Klandestino Backline Manager

App de bodega y logística para backline. Backend **PHP 8.2+**, almacenamiento **MySQL/MariaDB** mediante PDO, interfaz responsive HTML/CSS/JavaScript. Diseño grafito y ámbar con navegación animada, filtros inmediatos y opción de movimiento reducido.

## Funciones implementadas

- Inventario individual: alta, búsqueda, categorías, estados, ubicación y número de serie.
- Kits: crear agrupaciones de piezas existentes, separar, reasignar y rearmar verificando integridad.
- Reservas: kit completo, piezas sueltas o combinación de distintos kits y amplificación.
- Eventos: destino, fechas, responsable/Krew, vehículo y servicio.
- Salidas físicas, devoluciones parciales, daños y faltantes; evidencia JPEG opcional.
- QR reales por pieza y kit: generación, impresión, lectura con cámara, imagen o ingreso manual.
- Manifiesto imprimible, historial, CSV y respaldo JSON.
- Instalación SQL: administrador, encargados, consulta, sesiones, CSRF y limitación de intentos.
- Demo ficticia por navegador; SQL compartido al configurar el hosting.

## Inventario demo

73 activos individuales (los kits no duplican stock):

- 2 Tama Starclassic Maple, 14 componentes cada una.
- 4 Marshall 1960A, 2 Ampeg SVT 8×10, 2 Kemper Profiler.
- Atriles rectos y boom, hi-hats, clutches, micrófonos, cables y cases.
- 2 eventos ficticios, uno con cinco equipos fuera y un atril en revisión.

La configuración, acabados y cantidades adicionales son ejemplos basados en el brief; no constituyen un inventario confirmado de Klandestino.

## Instalación

El destino temporal seleccionado es **Render**: ver `render.yaml` y `Dockerfile`. La demo ejecuta PHP y conserva datos ficticios por navegador. [Preparar despliegue en Render](https://render.com/deploy?repo=https://github.com/aldocelle/klandestino-backline-manager).

Ver [DEPLOYMENT.md](DEPLOYMENT.md). La raíz pública es public/; src/ y config/ deben quedar fuera de ella. El hosting debe admitir PHP además de SQL.

```sh
npm ci
npm run build
npm test
node tests/qr.mjs
npm run dev
```

Node solo se necesita para desarrollo/compilación. El bundle público está incluido.

## Verificación

Pruebas PHP de dominio y persistencia en SQLite, generación/decodificación QR y flujo de navegador: kit → reserva parcial → despacho → devolución parcial. MySQL/MariaDB está preparado, sin afirmar una conexión al hosting final cuyas credenciales no están configuradas.
