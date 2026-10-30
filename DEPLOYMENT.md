# Hosting PHP + MySQL/MariaDB

## Demo temporal en Render

`render.yaml` configura un Web Service gratuito con Docker, PHP 8.3 + Apache, puerto de Render y comprobación `/health.php`. El contenedor sirve exclusivamente `public/`. La demo ejecuta el backend PHP con `KB_DEMO_MODE=1`; guarda los cambios ficticios por navegador y no necesita SQL temporal ni credenciales.

Para desplegar, conectar Render y crear el servicio desde el Blueprint del repositorio. También puede iniciarse desde https://render.com/deploy?repo=https://github.com/aldocelle/klandestino-backline-manager . Es un enlace de configuración, no una URL de la app publicada. No hay despliegue confirmado hasta recibir su estado y URL.

Para una instalación real se desactiva KB_DEMO_MODE y se configura SQL externo con las variables descritas abajo. No usar el disco efímero del contenedor para una base SQLite de producción. `KB_COOKIE_SECURE=1` protege las cookies cuando Apache queda detrás del HTTPS de Render.

`demo/` contiene una exportación estática opcional de la misma interfaz con simulador local. Se genera con `node tools/build-demo.mjs` y se verifica con `node tests/static-demo.mjs`. La aplicación PHP real usa public/ y nunca carga ese simulador.

El destino final requiere ejecutar PHP: un servidor exclusivamente estático no puede acceder directamente a SQL. El navegador nunca recibe credenciales de la base de datos.

## Requisitos

- PHP 8.2+ (probado localmente con PHP 8.3), PDO, pdo_mysql, JSON, OpenSSL y ctype.
- MySQL 5.7+ o MariaDB 10.3+, tablas InnoDB, HTTPS.
- Raíz pública del dominio/subdominio apuntando a `public/`.
- No se necesitan Node, Composer, Redis ni procesos permanentes en producción.

## Instalación

1. Subir `public/`, `src/` y `config/` conservando su relación.
2. Crear una base SQL dedicada y un usuario para ella.
3. Copiar `config/config.example.php` a `config/config.local.php`, **fuera de la raíz pública**, y configurar DSN, usuario, contraseña y `setup_key` aleatoria de al menos 24 caracteres. No subir ese archivo a GitHub.
4. Abrir el dominio. PHP crea las tablas si tiene permisos. Alternativamente importar `database/schema.mysql.sql` en phpMyAdmin. Se necesita permiso de creación durante la inicialización.
5. Completar el formulario con la clave de instalación, nombre, correo y contraseña de 12 a 128 caracteres. Se puede cargar el inventario ficticio para capacitación.
6. Ingresar y crear encargados/usuarios de consulta en Ajustes → Equipo de trabajo.
7. Retirar o cambiar la clave de instalación. El instalador se inhabilita en cuanto existe el primer usuario.

Si el hosting exige `public_html/`, copiar **el contenido de public/** a public_html y colocar src/ y config/ como carpetas hermanas de public_html. La ruta ../src/http.php se conserva. No subir el repositorio entero dentro de public_html.

También se admiten `KB_DB_DSN`, `KB_DB_USER`, `KB_DB_PASSWORD` y `KB_SETUP_KEY`. No activar `KB_DEMO_MODE` en una bodega real.

## Persistencia y concurrencia

La primera versión usa un agregado de inventario JSON en `kb_state`. Cada comando bloquea esa fila con `SELECT … FOR UPDATE`, valida disponibilidad/transiciones, registra el movimiento y confirma en una transacción InnoDB. Un número de revisión rechaza cambios basados en una vista antigua. Usuarios, sesiones y limitación de intentos se almacenan en tablas separadas.

Este diseño permite una bodega pequeña y evita contradicciones entre kit y piezas. Para muchas bodegas o miles de movimientos diarios conviene normalizar activos, eventos e historial en tablas separadas. Cada activo admite una asignación activa; no es aún un calendario con múltiples reservas futuras no superpuestas.

Las fotos se comprimen en el navegador y se guardan como evidencia JPEG pequeña en el historial. Para muchas fotos conviene migrarlas a almacenamiento de archivos. Respaldar regularmente la base SQL completa.

## Demo Vercel

`vercel.json` utiliza el runtime comunitario vercel-php@0.9.0: https://github.com/vercel-community/php. PHP no es un runtime nativo de Vercel.

Sin KB_DB_DSN, Vercel sirve una demo explícita: PHP valida comandos y el navegador conserva el estado en localStorage. No se usa el disco efímero como base de datos. La demo no comparte cambios entre dispositivos. Con SQL externo configurado se activa la instalación multiusuario y su autenticación.

El proyecto creado es klandestino-backline-manager (prj_d5y1YAFZgUUZJ3fKTzw8hTNqKahR), espacio propiedadesmar. El acceso de la conexión a ese espacio requiere autorización. La integración GitHub de Vercel tampoco está instalada; es posible desplegar archivos de la misma revisión por API y conectar Git posteriormente.

## Desarrollo y verificación

```sh
npm ci
npm run build
npm test
node tests/qr.mjs
npm run dev
```

El bundle `public/assets/app.bundle.js` está incluido para subir sin Node. Tras editar frontend/app.js hay que recompilarlo. Desarrollo sin DSN usa el inventario demo. SQLite es un adaptador de pruebas; el destino final usa MySQL/MariaDB.

Las credenciales del hosting final no se han proporcionado: no se afirma una conexión a ese servidor. El SQL se prepara y verifica con el adaptador de pruebas hasta disponer de dicha instalación.
