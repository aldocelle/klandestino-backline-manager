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

La interfaz usa una consola de operaciones en negro/grafito, tipografía condensada y acentos ámbar, siguiendo la referencia visual del proyecto. El fondo ilustrativo de bodega es una imagen generada con IA, optimizada como `public/assets/warehouse.webp`; no representa una fotografía de la bodega real. El prompt de creación fue: «bodega de backline oscura con gabinetes negros, flight cases con perfiles metálicos, cables y fierros, luz ámbar tenue, espacio oscuro a la izquierda, sin personas, texto ni interfaces».

El tour guiado ofrece 13 pasos contextuales con las pantallas existentes, foco visual, avance/retroceso, salida y control por teclado. Se ofrece en la primera visita y puede repetirse desde Ayuda o Ajustes. No ejecuta comandos de inventario, no activa la cámara y conserva las selecciones al salir. La preferencia de bienvenida se recuerda en este navegador.

La ficha de kit recupera la composición del prototipo `kit-tama.html`: perfil, desglose individual y escáner/armado de salida en tres columnas. Permite reservar, despachar y devolver componentes desde la ficha; los estados y cantidades se calculan del inventario real. La ficha combina ilustraciones del equipo y el fondo local de bodega, sin depender de fotografías externas. El acceso `/kit-tama.html` abre la ficha del primer Tama en el servidor PHP.

Pruebas PHP de dominio y persistencia en SQLite, generación/decodificación QR y flujo de navegador: kit → reserva parcial → despacho → devolución parcial. MySQL/MariaDB está preparado, sin afirmar una conexión al hosting final cuyas credenciales no están configuradas.
