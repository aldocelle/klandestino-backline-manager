<?php
declare(strict_types=1);
require_once __DIR__ . '/seed.php';
require_once __DIR__ . '/domain.php';
require_once __DIR__ . '/store.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
function reply(array $data, int $status = 200): never { http_response_code($status); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR); exit; }
function request_body(): array {
    require_ok(str_contains(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json'), 'Envía los datos como JSON.');
    $raw = file_get_contents('php://input', false, null, 0, 3500000);
    require_ok(strlen($raw) < 3500000, 'La solicitud es demasiado grande.');
    $data = json_decode($raw, true, 128, JSON_THROW_ON_ERROR); require_ok(is_array($data), 'Solicitud inválida.'); return $data;
}
function user_public(array $user): array { return ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'], 'role' => $user['role']]; }

try {
    $file = __DIR__ . '/../config/config.local.php'; $config = is_file($file) ? require $file : [];
    $config['dsn'] = getenv('KB_DB_DSN') ?: ($config['dsn'] ?? '');
    $config['user'] = getenv('KB_DB_USER') ?: ($config['user'] ?? '');
    $config['password'] = getenv('KB_DB_PASSWORD') ?: ($config['password'] ?? '');
    $config['setup_key'] = getenv('KB_SETUP_KEY') ?: ($config['setup_key'] ?? '');
    $demo = getenv('KB_DEMO_MODE') === '1' || ($config['demo'] ?? false) === true || (!$config['dsn'] && (getenv('VERCEL') === '1' || getenv('VERCEL_ENV')));
    $action = $_GET['action'] ?? 'bootstrap'; $method = $_SERVER['REQUEST_METHOD'];
    if ($method !== 'GET' && $method !== 'POST') reply(['error' => 'Método no permitido.'], 405);
    if ($method === 'POST') {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        require_ok(!$origin || (parse_url($origin, PHP_URL_HOST) . (parse_url($origin, PHP_URL_PORT) ? ':' . parse_url($origin, PHP_URL_PORT) : '')) === ($_SERVER['HTTP_HOST'] ?? ''), 'Origen de solicitud no permitido.');
    }
    if ($demo) {
        if ($action === 'bootstrap' && $method === 'GET') reply(['mode' => 'demo', 'state' => seed_state(), 'csrf' => 'demo', 'user' => ['id' => 'demo', 'name' => 'Operador demo', 'role' => 'admin']]);
        if ($action === 'command' && $method === 'POST') {
            $body = request_body(); $state = $body['state'] ?? null;
            require_ok(is_array($state) && ($state['version'] ?? 0) === 1 && count($state['assets'] ?? []) < 4000 && count($state['movements'] ?? []) < 10000, 'Los datos demo no son válidos.');
            reply(['state' => apply_command($state, $body['command'] ?? [], 'Operador demo')]);
        }
        reply(['error' => 'Esta acción requiere la instalación SQL.'], 400);
    }
    if (!$config['dsn']) reply(['error' => 'Configura la conexión SQL en config/config.local.php para iniciar la instalación.', 'mode' => 'setup', 'configurationRequired' => true], 503);
    $store = new SqlStore($config); $store->migrate();
    $count = (int)$store->db->query('SELECT COUNT(*) FROM kb_users')->fetchColumn();
    if (!$count) {
        if ($action === 'setup' && $method === 'POST') {
            $store->authAttempt(hash('sha256', 'setup:' . ($_SERVER['REMOTE_ADDR'] ?? '')));
            require_ok(strlen($config['setup_key']) >= 24 && hash_equals($config['setup_key'], $_SERVER['HTTP_X_SETUP_KEY'] ?? ''), 'Clave de instalación incorrecta. Configura una clave de al menos 24 caracteres.');
            $body = request_body(); $name = clean_text($body['name'] ?? '', 120); $email = strtolower(clean_text($body['email'] ?? '', 190)); $password = $body['password'] ?? '';
            require_ok($name !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false && is_string($password) && strlen($password) >= 12 && strlen($password) <= 128, 'Escribe nombre, correo válido y contraseña de 12 a 128 caracteres.');
            $store->transaction(function () use ($store, $name, $email, $password, $body) {
                $store->lockState(); require_ok((int)$store->db->query('SELECT COUNT(*) FROM kb_users')->fetchColumn() === 0, 'La instalación ya se completó.');
                $store->db->prepare('INSERT INTO kb_users VALUES (?, ?, ?, ?, ?)')->execute([bin2hex(random_bytes(12)), $name, $email, password_hash($password, PASSWORD_DEFAULT), 'admin']);
                if (($body['seedDemo'] ?? false) === true) $store->save(seed_state());
            });
            reply(['ok' => true]);
        }
        reply(['mode' => 'server', 'needsSetup' => true]);
    }
    if ($action === 'login' && $method === 'POST') {
        $body = request_body(); $email = strtolower(clean_text($body['email'] ?? '', 190)); $password = $body['password'] ?? '';
        require_ok(is_string($password) && strlen($password) <= 128, 'Credenciales inválidas.');
        $store->authAttempt(hash('sha256', 'login:' . ($_SERVER['REMOTE_ADDR'] ?? '')));
        $q = $store->db->prepare('SELECT * FROM kb_users WHERE email=?'); $q->execute([$email]); $user = $q->fetch();
        $hash = $user ? $user['password_hash'] : '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
        if (!password_verify($password, $hash) || !$user) reply(['error' => 'Correo o contraseña incorrectos.'], 401);
        $token = bin2hex(random_bytes(32)); $csrf = bin2hex(random_bytes(32));
        $store->db->prepare('INSERT INTO kb_sessions VALUES (?, ?, ?, ?)')->execute([hash('sha256', $token), $user['id'], $csrf, time()+28800]);
        $store->db->prepare('DELETE FROM kb_sessions WHERE expires_at < ?')->execute([time()]);
        setcookie('kb_sid', $token, ['expires' => time()+28800, 'path' => '/', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || (bool)getenv('VERCEL') || getenv('KB_COOKIE_SECURE') === '1', 'httponly' => true, 'samesite' => 'Lax']);
        reply(['ok' => true]);
    }
    $q = $store->db->prepare('SELECT u.id,u.name,u.email,u.role,s.csrf FROM kb_sessions s JOIN kb_users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?');
    $q->execute([hash('sha256', $_COOKIE['kb_sid'] ?? ''), time()]); $user = $q->fetch();
    if (!$user) reply(['mode' => 'server', 'requiresLogin' => true, 'error' => 'Inicia sesión para acceder a bodega.'], 401);
    if ($method === 'POST') require_ok(hash_equals($user['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''), 'La sesión cambió. Recarga e intenta de nuevo.');
    if ($action === 'bootstrap' && $method === 'GET') reply(['mode' => 'server', 'state' => $store->read(), 'user' => user_public($user), 'csrf' => $user['csrf']]);
    if ($action === 'logout' && $method === 'POST') {
        $store->db->prepare('DELETE FROM kb_sessions WHERE token_hash=?')->execute([hash('sha256', $_COOKIE['kb_sid'] ?? '')]); setcookie('kb_sid', '', ['expires' => 1, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']); reply(['ok' => true]);
    }
    if ($action === 'command' && $method === 'POST') {
        require_ok(in_array($user['role'], ['admin', 'operator'], true), 'Tu usuario tiene acceso de consulta.');
        $body = request_body(); require_ok(is_int($body['revision'] ?? null), 'Revisión de inventario inválida.');
        try { reply(['state' => $store->command($body['command'] ?? [], $user['name'], $body['revision'])]); }
        catch (DomainError $e) { if ($e->getMessage() === 'CONFLICT') reply(['error' => 'Otro encargado actualizó el inventario. Revisa la selección y vuelve a confirmar.', 'state' => $store->read()], 409); throw $e; }
    }
    if ($action === 'users' && $method === 'GET') {
        require_ok($user['role'] === 'admin', 'Solo administración puede ver usuarios.'); reply(['users' => $store->db->query('SELECT id,name,email,role FROM kb_users ORDER BY name')->fetchAll()]);
    }
    if ($action === 'user_create' && $method === 'POST') {
        require_ok($user['role'] === 'admin', 'Solo administración puede crear usuarios.'); $body = request_body();
        $name = clean_text($body['name'] ?? '', 120); $email = strtolower(clean_text($body['email'] ?? '', 190)); $password = $body['password'] ?? ''; $role = $body['role'] ?? 'reader';
        require_ok($name !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false && is_string($password) && strlen($password) >= 12 && strlen($password) <= 128 && in_array($role, ['admin', 'operator', 'reader'], true), 'Completa los datos; la contraseña debe tener de 12 a 128 caracteres.');
        $q = $store->db->prepare('SELECT id FROM kb_users WHERE email=?'); $q->execute([$email]); require_ok(!$q->fetch(), 'Ese correo ya está registrado.');
        $store->db->prepare('INSERT INTO kb_users VALUES (?,?,?,?,?)')->execute([bin2hex(random_bytes(12)), $name, $email, password_hash($password, PASSWORD_DEFAULT), $role]); reply(['ok' => true]);
    }
    reply(['error' => 'Ruta no encontrada.'], 404);
} catch (DomainError $e) { reply(['error' => $e->getMessage()], 422); }
catch (JsonException $e) { reply(['error' => 'Los datos recibidos no son JSON válido.'], 400); }
catch (Throwable $e) { error_log('Klandestino: ' . $e->getMessage()); reply(['error' => 'No se pudo completar la operación. Revisa la conexión SQL o intenta nuevamente.'], 500); }
