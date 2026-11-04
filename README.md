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

115 activos individuales (los kits no duplican stock):

- 2 Tama Starclassic Maple doble bombo, 35 componentes cada una: 2 bombos 22” maple, caja 14” Mapex Black Panther, toms 10”, 12” y 13”, toms de piso 14” y 16”; atril de caja, 4 atriles boom, 4 rectos, 3 soportes de tom, 2 pedales de bombo, pedal doble, sillín hi-hat con atril, varilla y clutch, y una funda por tambor, cada pieza con su QR.
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

En móvil, «Escanear» es el botón central de la barra inferior: abre el visor, que se activa con un toque (o solo, si el navegador ya concedió el permiso de cámara; nunca durante el tour). Tras cada lectura hay vibración breve y «Escanear otro»; un código desconocido avisa sin cortar la cámara. Usa el lector nativo `BarcodeDetector` cuando existe y jsQR como respaldo. Ajustes, Mantenimiento y Reportes quedan en el ícono de engranaje de la barra superior. Botones del escáner de 46 px y campos de 16 px para evitar el zoom automático de iOS.

Para separar un kit, la ficha agrupa los componentes en Tambores, Atriles, Hi-hat y Pedales/soportes/sillín, con atajos «Todo el kit», «Solo tambores», «Solo fierros» y «Elegir grupo». Tambores y fierros del mismo kit pueden ir a eventos distintos; el kit solo se rearma cuando vuelven todas sus piezas. En móvil, una barra fija muestra cuántas piezas están elegidas y lleva a reservar.

«Preparar salida» en la ficha de kit abre un asistente con preguntas y opciones: qué llevar (kit completo, solo tambores, solo fierros o por grupo con ajuste pieza a pieza), para qué evento (vigentes o salida nueva) y un resumen antes de reservar.

«Etiquetas QR» abre un centro de impresión: grupos por kit (QR general y piezas por Tambores, Atriles, Hi-hat y Pedales) y por categoría para el equipo suelto, con casilla por grupo y por pieza, atajos Todo / Solo QR de kits / Nada, tamaño pequeña, mediana o grande, y vista previa agrupada en la que cada etiqueta indica su kit o categoría. La ficha de kit tiene «Etiquetas del kit».

Equipo técnico: 10 técnicos renombrables en Ajustes. Registrar una salida o una devolución exige elegir quién saca o quién recibe; queda en el historial («Responsable: …») y en cada pieza del evento («Salió con … · Recibió …»). La app recuerda el último técnico elegido en el dispositivo.

Tótem de técnicos (#totem, cartel imprimible con QR en Ajustes): el técnico elige su nombre una vez en su celular y luego «Sacar a un evento», «Recibir de un evento» o «Mover entre bodegas». La cámara queda activa para escanear pieza tras pieza (el QR general de un kit agrega todas sus piezas), marca lo que no aplica y registra todo a su nombre. Las salidas guardan vehículo, conductor y teléfonos del encargado y del conductor.

Hay dos bodegas, nombradas solo «Bodega A» y «Bodega B»; la app no guarda sus direcciones. Cada pieza tiene una bodega base: al volver de un evento o del taller regresa a ella. «Trasladar» (en la selección del inventario y en la ficha de kit) mueve piezas disponibles entre bodegas y queda en el historial; un kit trasladado completo sigue armado. El inventario filtra por bodega o «Fuera de bodega».

La ficha de kit recupera la composición del prototipo `kit-tama.html`: perfil, desglose individual y escáner/armado de salida en tres columnas. Permite reservar, despachar y devolver componentes desde la ficha; los estados y cantidades se calculan del inventario real. La ficha combina ilustraciones del equipo y el fondo local de bodega, sin depender de fotografías externas. El acceso `/kit-tama.html` abre la ficha del primer Tama en el servidor PHP.

Pruebas PHP de dominio y persistencia en SQLite, generación/decodificación QR y flujo de navegador: kit → reserva parcial → despacho → devolución parcial. MySQL/MariaDB está preparado, sin afirmar una conexión al hosting final cuyas credenciales no están configuradas.
