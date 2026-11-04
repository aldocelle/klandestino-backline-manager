// Empaqueta la instalación real (PHP + MySQL) para un hosting propio.
// Uso: node tools/build-release.mjs  →  dist/klandestino-bodega-AAAAMMDD.zip
import {cpSync, mkdirSync, rmSync, writeFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
const name = `klandestino-bodega-${stamp}`;
const root = `dist/${name}`;
rmSync(root, {recursive: true, force: true});
mkdirSync(root, {recursive: true});

execFileSync('npm', ['run', 'build'], {stdio: 'inherit'});
cpSync('public', `${root}/public_html`, {recursive: true});
cpSync('src', `${root}/src`, {recursive: true});
mkdirSync(`${root}/config`, {recursive: true});
cpSync('config/config.example.php', `${root}/config/config.example.php`);
cpSync('database', `${root}/database`, {recursive: true});
// Defensa extra si src/ o config/ terminan por error dentro de la raíz pública.
for (const dir of ['src', 'config', 'database']) writeFileSync(`${root}/${dir}/.htaccess`, 'Require all denied\nDeny from all\n');
if (existsSync(`${root}/public_html/assets/app.bundle.js.map`)) rmSync(`${root}/public_html/assets/app.bundle.js.map`);

writeFileSync(`${root}/INSTALAR.txt`, `KLANDESTINO BACKLINE MANAGER · INSTALACIÓN EN HOSTING PROPIO
==============================================================

Requisitos: PHP 8.2 o superior con PDO y pdo_mysql, MySQL 5.7+ o MariaDB 10.3+,
HTTPS activo. No hace falta Node ni Composer en el servidor.

1. SUBIR ARCHIVOS
   - El CONTENIDO de public_html/ va en la raíz pública del dominio o subdominio
     (por ejemplo public_html/ o htdocs/).
   - Las carpetas src/, config/ y database/ van AL LADO de esa raíz, nunca dentro:

       /home/usuario/
         ├── public_html/   ← contenido de public_html/
         ├── src/
         ├── config/
         └── database/

2. BASE DE DATOS
   - Crea una base de datos y un usuario exclusivo para ella (panel del hosting).
   - Opcional: importa database/schema.mysql.sql en phpMyAdmin. Si no lo haces,
     la app crea las tablas sola en el primer ingreso.

3. CONFIGURACIÓN (credenciales solo en el servidor, nunca en GitHub ni por chat)
   - Copia config/config.example.php como config/config.local.php.
   - Completa dsn (host y nombre de la base), user, password y una setup_key
     aleatoria de al menos 24 caracteres. Deja 'demo' => false.

4. PRIMER INGRESO
   - Abre el dominio. Verás «Configura tu bodega».
   - Escribe la clave de instalación (setup_key), tu nombre, correo y una
     contraseña de 12 a 128 caracteres. Ese usuario queda como administrador.
   - Marca «Cargar el inventario de demostración» si quieres partir con los
     2 kits Tama (27 piezas cada uno) y el resto del inventario de ejemplo.

5. EQUIPO
   - En Ajustes → Equipo técnico, renombra a los 10 técnicos responsables.
   - En Ajustes → Equipo de trabajo, crea los usuarios (encargado o consulta).
   - Cambia o borra la setup_key: el instalador se desactiva solo al crear el
     primer usuario.

6. COMPROBAR
   - https://TU-DOMINIO/health.php debe responder {"status":"ok"}.
   - La pantalla debe decir «Bodega conectada» (no «Modo demostración»).
   - Abre la app en dos teléfonos: lo que registra uno debe verlo el otro.

7. RESPALDOS
   - Programa un respaldo diario de la base MySQL desde el panel del hosting.
   - Ajustes → Copias de datos descarga también inventario en CSV y JSON.
`);

const zip = `dist/${name}.zip`;
rmSync(zip, {force: true});
execFileSync('zip', ['-qr', `${name}.zip`, name], {cwd: 'dist'});
console.log(`Paquete listo: ${zip}`);
