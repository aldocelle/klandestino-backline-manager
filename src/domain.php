<?php
declare(strict_types=1);

final class DomainError extends RuntimeException {}
function require_ok(bool $condition, string $message): void { if (!$condition) throw new DomainError($message); }
function entity_index(array $entities, string $id): int {
    foreach ($entities as $i => $entity) if ($entity['id'] === $id) return $i;
    throw new DomainError('No se encontró el registro: ' . $id);
}
function clean_text(mixed $value, int $max = 180): string {
    require_ok(is_string($value), 'Texto inválido.');
    $value = trim($value); require_ok(strlen($value) <= $max, 'El texto supera el largo permitido.');
    return $value;
}
/** Bodegas propias. Se nombran solo por letra: sus direcciones no se guardan en la app. */
function warehouses(): array { return ['Bodega A', 'Bodega B']; }
function home_of(array $asset): string { return in_array($asset['home'] ?? '', warehouses(), true) ? $asset['home'] : 'Bodega A'; }
/** Equipo técnico responsable de salidas y devoluciones (10 cupos, renombrables). */
function default_crew(): array { $c = []; for ($n = 1; $n <= 10; $n++) $c[] = ['id' => sprintf('TEC-%02d', $n), 'name' => sprintf('Técnico %02d', $n), 'active' => true]; return $c; }
function crew_list(array $state): array { return isset($state['crew']) && is_array($state['crew']) && $state['crew'] ? $state['crew'] : default_crew(); }
function crew_name(array $state, mixed $id): string { foreach (crew_list($state) as $t) if ($t['id'] === $id && ($t['active'] ?? true)) return $t['name']; throw new DomainError('Elige el técnico responsable.'); }
function clean_phone(mixed $value): string { $v = clean_text($value, 40); require_ok($v === '' || (bool)preg_match('/^\+?[0-9 ()-]{6,20}$/', $v), 'Revisa el teléfono: usa solo números, espacios y +.'); return $v; }
function code_taken(array $state, string $code, ?string $exceptId = null): bool { foreach ($state['assets'] as $a) if ($a['id'] !== $exceptId && ($a['id'] === $code || ($a['code'] ?? '') === $code)) return true; foreach ($state['kits'] as $k) if ($k['id'] === $code) return true; return false; }
function clean_code(mixed $code): string { $code = strtoupper(clean_text($code ?? '', 60)); require_ok((bool)preg_match('/^[A-Z0-9][A-Z0-9_-]{2,59}$/D', $code), 'Usa un código de 3 a 60 letras, números o guiones.'); return $code; }
function equipment_icon_keys(): array { return ['kit','kick','snare','tom','floor-tom','cymbal','hihat','stand','boom','snare-stand','throne','pedal','clamp','head','cabinet','combo','guitar','bass','pedalboard','di','mic','cable','case','wedge','keyboard','fan','rug']; }
function clean_icon(mixed $icon, array $asset): string { $icon = is_string($icon) ? trim($icon) : ''; if ($icon === '') return '';
    if (preg_match('/^photo:(\d)$/D', $icon, $m)) { require_ok((int)$m[1] < count($asset['photos'] ?? []), 'Esa foto ya no existe.'); return $icon; }
    require_ok(in_array($icon, equipment_icon_keys(), true), 'Ícono inválido.'); return $icon; }
// Permisos por rol: administrador y encargado, todo; técnico, solo el trabajo diario de bodega; consulta, nada.
function tech_commands(): array { return ['create_event', 'reserve', 'dispatch', 'release', 'return', 'report_issue', 'transfer', 'event_details', 'event_staff', 'event_status', 'event_trash', 'event_restore']; }
function team_list(array $state): array { return isset($state['teams']) && is_array($state['teams']) ? $state['teams'] : []; }
function clean_ids(mixed $list, array $valid, int $max, string $error): array { if ($list === null || $list === '') return []; require_ok(is_array($list) && count($list) <= $max, $error); $out = []; foreach ($list as $id) { require_ok(is_string($id) && in_array($id, $valid, true), $error); $out[$id] = true; } return array_keys($out); }
function check_event_dates(string $start, string $end): void { require_ok((bool)preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/D', $start) && strtotime($start) !== false && strtotime($end) !== false && strtotime($end) > strtotime($start), 'La devolución debe ser posterior a la salida.'); }
// «Mi foto» la puede cambiar cualquier usuario con sesión, incluso Consulta: solo toca su propia foto (email de la sesión).
function command_allowed(string $role, string $type): bool { return $type === 'my_photo' || role_allows($role, $type); }
function role_allows(string $role, string $type): bool { if (in_array($role, ['admin', 'operator'], true)) return true; return $role === 'tech' && in_array($type, tech_commands(), true); }
function clean_poster(mixed $poster): string { return ($poster === null || $poster === '') ? '' : clean_jpeg($poster, 260000); }
function clean_photos(mixed $list): array { if ($list === null || $list === '') return []; require_ok(is_array($list) && count($list) <= 3, 'Agrega hasta 3 fotos por pieza.'); return array_values(array_map(fn($p) => clean_jpeg($p, 90000), $list)); }
function clean_jpeg(mixed $photo, int $max): string { require_ok(is_string($photo) && strlen($photo) < $max && str_starts_with($photo, 'data:image/jpeg;base64,'), 'La foto debe ser JPEG y liviana.'); $bytes = base64_decode(substr($photo, 23), true); require_ok($bytes !== false && str_starts_with($bytes, "\xFF\xD8\xFF"), 'Foto inválida.'); return $photo; }
/** Event Timing: tipos y estados del Run of Show. */
function timing_types(): array { return ['load_in','stage_setup','rigging','pa_setup','lighting_setup','backline_setup','line_check','soundcheck','doors','performance','changeover','stage_reset','curfew','load_out','crew_break','meeting','custom']; }
function timing_statuses(): array { return ['pending','prep','running','done','late']; }
function timing_event_statuses(): array { return ['planning','confirmed','live','done','cancelled']; }
function event_stages(array $e): array { return !empty($e['stages']) ? $e['stages'] : [['id' => 'S1', 'name' => 'Escenario principal']]; }
function valid_local_dt(mixed $v): bool { return is_string($v) && (bool)preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $v) && strtotime($v) !== false; }
function selected_ids(array $command): array {
    $ids = $command['assetIds'] ?? [];
    require_ok(is_array($ids) && count($ids) > 0 && count($ids) <= 500, 'Selecciona al menos un equipo.');
    foreach ($ids as $id) require_ok(is_string($id) && strlen($id) < 100, 'Código de equipo inválido.');
    require_ok(count($ids) === count(array_unique($ids)), 'Hay equipos repetidos en la selección.');
    return array_values($ids);
}
function apply_command(array $state, array $cmd, string $actor): array {
    $type = $cmd['type'] ?? ''; $ids = []; $summary = ''; $eventId = null; $note = ''; $by = null;
    $newId = fn(string $prefix): string => $prefix . '-' . strtoupper(bin2hex(random_bytes(5)));
    switch ($type) {
        case 'create_asset':
            $code = clean_code($cmd['code'] ?? ''); require_ok(!code_taken($state, $code), 'Ese código ya existe.');
            $name = clean_text($cmd['name'] ?? ''); require_ok($name !== '', 'Escribe el nombre del equipo.');
            $category = clean_text($cmd['category'] ?? 'Accesorios', 60);
            $warehouse = clean_text($cmd['location'] ?? 'Bodega A', 120); require_ok(in_array($warehouse, warehouses(), true), 'Elige Bodega A o Bodega B.');
            require_ok(in_array($category, ['Tambores', 'Platillos', 'Fierros', 'Accesorios', 'Gabinetes', 'Cabezales', 'Micrófonos', 'Cables', 'Cases'], true), 'Categoría inválida.');
            $state['assets'][] = ['id' => $code, 'code' => $code, 'name' => $name, 'category' => $category,
                'brand' => clean_text($cmd['brand'] ?? '', 80), 'model' => clean_text($cmd['model'] ?? '', 100),
                'location' => $warehouse, 'home' => $warehouse, 'serial' => clean_text($cmd['serial'] ?? '', 100),
                'kitId' => null, 'status' => 'available', 'condition' => 'ok', 'eventId' => null, 'note' => '', 'photos' => clean_photos($cmd['photos'] ?? [])];
            $ids = [$code]; $summary = 'Equipo incorporado: ' . $name; break;
        case 'asset_update':
            $ai = entity_index($state['assets'], (string)($cmd['assetId'] ?? '')); $name = clean_text($cmd['name'] ?? '');
            require_ok($name !== '', 'Escribe el nombre del equipo.');
            $category = clean_text($cmd['category'] ?? $state['assets'][$ai]['category'], 60);
            require_ok(in_array($category, ['Tambores', 'Platillos', 'Fierros', 'Accesorios', 'Gabinetes', 'Cabezales', 'Micrófonos', 'Cables', 'Cases'], true), 'Categoría inválida.');
            $oldCode = $state['assets'][$ai]['code'] ?? $state['assets'][$ai]['id']; $newCode = $oldCode;
            if (isset($cmd['code']) && $cmd['code'] !== '') { $newCode = clean_code($cmd['code']); require_ok($newCode === $oldCode || !code_taken($state, $newCode, $state['assets'][$ai]['id']), 'Ese código ya lo usa otro equipo o kit.'); }
            $state['assets'][$ai]['code'] = $newCode;
            $state['assets'][$ai] = array_merge($state['assets'][$ai], ['name' => $name, 'category' => $category,
                'brand' => clean_text($cmd['brand'] ?? '', 80), 'model' => clean_text($cmd['model'] ?? '', 100),
                'serial' => clean_text($cmd['serial'] ?? '', 100), 'note' => clean_text($cmd['note'] ?? '', 500)]);
            $ids = [$state['assets'][$ai]['id']]; $summary = 'Detalle actualizado: ' . $name; break;
        case 'asset_icon':
            $ai = entity_index($state['assets'], (string)($cmd['assetId'] ?? '')); $state['assets'][$ai]['icon'] = clean_icon($cmd['icon'] ?? '', $state['assets'][$ai]);
            $ids = [$state['assets'][$ai]['id']]; $summary = 'Ícono actualizado: ' . $state['assets'][$ai]['name']; break;
        case 'asset_photos':
            $ai = entity_index($state['assets'], (string)($cmd['assetId'] ?? '')); $state['assets'][$ai]['photos'] = clean_photos($cmd['photos'] ?? []);
            if (preg_match('/^photo:(\d)$/D', $state['assets'][$ai]['icon'] ?? '', $m) && (int)$m[1] >= count($state['assets'][$ai]['photos'])) $state['assets'][$ai]['icon'] = '';
            $ids = [$state['assets'][$ai]['id']]; $summary = 'Fotos actualizadas: ' . $state['assets'][$ai]['name']; break;
        case 'create_kit':
            $ids = selected_ids($cmd); $name = clean_text($cmd['name'] ?? '');
            require_ok($name !== '', 'Escribe el nombre del kit.');
            $kitId = $newId('KIT'); $locations = [];
            foreach ($ids as $id) {
                $ai = entity_index($state['assets'], $id); require_ok($state['assets'][$ai]['status'] === 'available', 'Solo puedes agrupar equipos disponibles.');
                $old = $state['assets'][$ai]['kitId'];
                foreach ($state['kits'] as &$kit) if ($kit['id'] === $old) $kit['assembled'] = false;
                unset($kit); $state['assets'][$ai]['kitId'] = $kitId; $locations[] = $state['assets'][$ai]['location'];
            }
            $state['kits'][] = ['id' => $kitId, 'name' => $name, 'brand' => clean_text($cmd['brand'] ?? '', 80),
                'finish' => clean_text($cmd['finish'] ?? '', 120), 'assembled' => count(array_unique($locations)) === 1,
                'expectedIds' => $ids, 'note' => 'Kit creado en bodega.'];
            $summary = 'Nuevo kit: ' . $name; break;
        case 'kit_mode':
            $ki = entity_index($state['kits'], clean_text($cmd['kitId'] ?? '', 60));
            $assembled = ($cmd['assembled'] ?? false) === true;
            $parts = array_values(array_filter($state['assets'], fn($a) => $a['kitId'] === $state['kits'][$ki]['id']));
            if ($assembled) {
                $actual = array_column($parts, 'id');
                require_ok(count($parts) > 0 && count(array_diff($state['kits'][$ki]['expectedIds'], $actual)) === 0, 'Faltan componentes originales para completar este kit.');
                foreach ($parts as $a) require_ok($a['status'] === 'available' && $a['condition'] === 'ok', 'No puedes armar un kit con piezas reservadas, fuera o dañadas.');
                require_ok(count(array_unique(array_column($parts, 'location'))) === 1, 'Todas las piezas deben estar en la misma ubicación.');
            }
            $state['kits'][$ki]['assembled'] = $assembled;
            $ids = array_column($parts, 'id'); $summary = ($assembled ? 'Kit armado: ' : 'Kit separado en componentes: ') . $state['kits'][$ki]['name']; break;
        case 'assign_kit':
            $ai = entity_index($state['assets'], clean_text($cmd['assetId'] ?? '', 80));
            require_ok($state['assets'][$ai]['status'] === 'available', 'Solo puedes reasignar piezas disponibles.');
            $target = $cmd['kitId'] ?? null;
            if ($target !== null && $target !== '') entity_index($state['kits'], clean_text($target, 60)); else $target = null;
            $old = $state['assets'][$ai]['kitId'];
            foreach ($state['kits'] as &$kit) if ($kit['id'] === $old || $kit['id'] === $target) $kit['assembled'] = false;
            unset($kit); $state['assets'][$ai]['kitId'] = $target;
            $ids = [$state['assets'][$ai]['id']]; $summary = 'Agrupación actualizada: ' . $state['assets'][$ai]['name']; break;
        case 'create_event':
        case 'reserve':
            $draft = $type === 'create_event' && ($cmd['draft'] ?? false) === true && empty($cmd['assetIds']);
            $ids = $draft ? [] : selected_ids($cmd);
            foreach ($ids as $id) { $ai = entity_index($state['assets'], $id); require_ok($state['assets'][$ai]['status'] === 'available' && $state['assets'][$ai]['condition'] === 'ok', $state['assets'][$ai]['name'] . ' ya está reservado, fuera o en revisión.'); }
            if ($type === 'create_event') {
                $name = clean_text($cmd['name'] ?? ''); $place = clean_text($cmd['place'] ?? '', 200); $responsible = clean_text($cmd['responsible'] ?? '', 120);
                require_ok($name !== '' && $place !== '' && ($draft || $responsible !== ''), $draft ? 'Completa el nombre y el destino del evento.' : 'Completa evento, destino y responsable.');
                $start = clean_text($cmd['start'] ?? '', 30); $end = clean_text($cmd['end'] ?? '', 30);
                require_ok((bool)preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/D', $start) && strtotime($start) !== false && strtotime($end) !== false && strtotime($end) > strtotime($start), 'La devolución debe ser posterior a la salida.');
                $eventId = $newId('EVT');
                $state['events'][] = ['id' => $eventId, 'name' => $name, 'place' => $place, 'start' => $start, 'end' => $end,
                    'responsible' => $responsible, 'vehicle' => clean_text($cmd['vehicle'] ?? '', 120), 'driver' => clean_text($cmd['driver'] ?? '', 120), 'responsiblePhone' => clean_phone($cmd['responsiblePhone'] ?? ''), 'driverPhone' => clean_phone($cmd['driverPhone'] ?? ''), 'service' => clean_text($cmd['service'] ?? 'Backline', 80), 'poster' => clean_poster($cmd['poster'] ?? ''), 'client' => clean_text($cmd['client'] ?? '', 160), 'address' => clean_text($cmd['address'] ?? '', 200), 'teamIds' => [], 'crewIds' => [], 'items' => []];
                $ei = count($state['events']) - 1;
            } else { $eventId = clean_text($cmd['eventId'] ?? '', 80); $ei = entity_index($state['events'], $eventId); require_ok(strtotime($state['events'][$ei]['end']) > time(), 'Este evento ya terminó.'); require_ok(empty($state['events'][$ei]['trashed']) && ($state['events'][$ei]['status'] ?? '') !== 'done', 'Este evento está en borradores o archivado. Restáuralo o reábrelo antes de moverle equipos.'); }
            foreach ($ids as $id) {
                $ai = entity_index($state['assets'], $id);
                $state['assets'][$ai]['status'] = 'reserved'; $state['assets'][$ai]['eventId'] = $eventId;
                $state['events'][$ei]['items'][] = ['assetId' => $id, 'status' => 'reserved', 'condition' => 'ok', 'note' => ''];
            }
            $summary = $draft ? 'Evento creado: ' . $state['events'][$ei]['name'] : count($ids) . ' equipos reservados para ' . $state['events'][$ei]['name']; break;
        case 'event_details':
            $ei = entity_index($state['events'], clean_text($cmd['eventId'] ?? '', 80)); $e = &$state['events'][$ei]; $eventId = $e['id'];
            $name = clean_text($cmd['name'] ?? ''); $place = clean_text($cmd['place'] ?? '', 200); require_ok($name !== '' && $place !== '', 'Completa el nombre y el destino del evento.');
            $start = clean_text($cmd['start'] ?? '', 30); $end = clean_text($cmd['end'] ?? '', 30); check_event_dates($start, $end);
            $e['name'] = $name; $e['place'] = $place; $e['start'] = $start; $e['end'] = $end; $e['service'] = clean_text($cmd['service'] ?? ($e['service'] ?? 'Backline'), 80);
            $e['client'] = clean_text($cmd['client'] ?? '', 160); $e['address'] = clean_text($cmd['address'] ?? '', 200);
            $summary = 'Datos del evento actualizados: ' . $name; unset($e); break;
        case 'event_staff':
            $ei = entity_index($state['events'], clean_text($cmd['eventId'] ?? '', 80)); $e = &$state['events'][$ei]; $eventId = $e['id'];
            $active = array_column(array_filter(crew_list($state), fn($t) => $t['active'] ?? true), 'id');
            $sm = clean_text($cmd['stageManagerId'] ?? '', 20); if ($sm !== '') crew_name($state, $sm);
            $e['responsible'] = clean_text($cmd['responsible'] ?? '', 120); $e['responsiblePhone'] = clean_phone($cmd['responsiblePhone'] ?? '');
            $e['vehicle'] = clean_text($cmd['vehicle'] ?? '', 120); $e['driver'] = clean_text($cmd['driver'] ?? '', 120); $e['driverPhone'] = clean_phone($cmd['driverPhone'] ?? '');
            $e['stageManagerId'] = $sm; $e['teamIds'] = clean_ids($cmd['teamIds'] ?? [], array_column(team_list($state), 'id'), 20, 'Revisa los equipos de técnicos.');
            $e['crewIds'] = clean_ids($cmd['crewIds'] ?? [], $active, 60, 'Revisa los técnicos asignados.');
            $summary = 'Personal del evento actualizado: ' . $e['name']; unset($e); break;
        case 'event_status':
            $ei = entity_index($state['events'], clean_text($cmd['eventId'] ?? '', 80)); $eventId = $state['events'][$ei]['id']; $st = $cmd['status'] ?? '';
            require_ok(in_array($st, timing_event_statuses(), true), 'Estado de evento inválido.');
            if ($st === 'done') foreach ($state['events'][$ei]['items'] as $it) require_ok(!in_array($it['status'], ['reserved', 'out'], true), 'Antes de cerrar, registra la salida y la devolución de todos los equipos, o libera las reservas.');
            $state['events'][$ei]['status'] = $st; $summary = ($st === 'done' ? 'Evento cerrado: ' : 'Estado del evento actualizado: ') . $state['events'][$ei]['name']; break;
        case 'event_trash':
            $ei = entity_index($state['events'], clean_text($cmd['eventId'] ?? '', 80)); $e = &$state['events'][$ei]; $eventId = $e['id'];
            foreach ($e['items'] as $it) require_ok(!in_array($it['status'], ['out', 'missing'], true), 'Este evento tiene equipos fuera o faltantes. Registra la devolución antes de borrarlo.');
            $ids = []; foreach ($e['items'] as &$it) if ($it['status'] === 'reserved') { $ai = entity_index($state['assets'], $it['assetId']); $state['assets'][$ai]['status'] = 'available'; $state['assets'][$ai]['eventId'] = null; $it['status'] = 'released'; $ids[] = $it['assetId']; } unset($it);
            $e['trashed'] = true; $summary = 'Evento movido a borradores: ' . $e['name'] . ($ids ? ' · ' . count($ids) . ' reservas liberadas' : ''); unset($e); break;
        case 'event_restore':
            $ei = entity_index($state['events'], clean_text($cmd['eventId'] ?? '', 80)); $eventId = $state['events'][$ei]['id']; $state['events'][$ei]['trashed'] = false;
            $summary = 'Evento restaurado: ' . $state['events'][$ei]['name']; break;
        case 'event_purge':
            $ei = entity_index($state['events'], clean_text($cmd['eventId'] ?? '', 80)); $gone = $state['events'][$ei]; $eventId = $gone['id'];
            // Desde Borradores o Archivados, sin piezas pendientes. Los movimientos se conservan como historial.
            require_ok(!empty($gone['trashed']) || ($gone['status'] ?? '') === 'done', 'Primero borra o cierra el evento: solo se eliminan los de Borradores o Archivados.');
            foreach ($gone['items'] as $it) require_ok(!in_array($it['status'], ['reserved', 'out', 'missing'], true), 'Este evento tiene piezas reservadas, fuera o faltantes. Resuélvelas antes de eliminarlo.');
            foreach ($state['assets'] as $a) require_ok(($a['eventId'] ?? null) !== $eventId, 'Este evento tiene piezas reservadas, fuera o faltantes. Resuélvelas antes de eliminarlo.');
            array_splice($state['events'], $ei, 1); $summary = 'Evento eliminado definitivamente: ' . $gone['name']; break;
        case 'team_save':
            $teams = team_list($state); $tid = clean_text($cmd['teamId'] ?? '', 40); $name = clean_text($cmd['name'] ?? '', 80); require_ok($name !== '', 'Escribe el nombre del equipo.');
            $active = array_column(array_filter(crew_list($state), fn($t) => $t['active'] ?? true), 'id');
            $members = clean_ids($cmd['memberIds'] ?? [], $active, 40, 'Revisa los integrantes del equipo.'); require_ok(count($members) >= 1, 'Elige al menos un integrante.');
            foreach ($teams as $t) require_ok($t['id'] === $tid || mb_strtolower($t['name']) !== mb_strtolower($name), 'Ya hay un equipo con ese nombre.');
            if ($tid !== '') { $ti = entity_index($teams, $tid); $teams[$ti]['name'] = $name; $teams[$ti]['memberIds'] = $members; $summary = 'Equipo de técnicos actualizado: ' . $name; }
            else { require_ok(count($teams) < 40, 'Llegaste al máximo de 40 equipos.'); $teams[] = ['id' => $newId('TEAM'), 'name' => $name, 'memberIds' => $members]; $summary = 'Equipo de técnicos creado: ' . $name; }
            $state['teams'] = $teams; break;
        case 'team_delete':
            $teams = team_list($state); $ti = entity_index($teams, clean_text($cmd['teamId'] ?? '', 40)); $gone = $teams[$ti];
            array_splice($teams, $ti, 1); $state['teams'] = $teams;
            foreach ($state['events'] as &$ev) if (!empty($ev['teamIds'])) $ev['teamIds'] = array_values(array_filter($ev['teamIds'], fn($x) => $x !== $gone['id'])); unset($ev);
            $summary = 'Equipo de técnicos eliminado: ' . $gone['name']; break;
        case 'dispatch':
        case 'release':
        case 'return':
            $eventId = clean_text($cmd['eventId'] ?? '', 80); $ei = entity_index($state['events'], $eventId); $ids = selected_ids($cmd);
            if ($type === 'dispatch') require_ok(empty($state['events'][$ei]['trashed']) && ($state['events'][$ei]['status'] ?? '') !== 'done', 'Este evento está en borradores o archivado. Restáuralo o reábrelo antes de moverle equipos.');
            $condition = $cmd['condition'] ?? 'ok'; $note = clean_text($cmd['note'] ?? '', 1500);
            require_ok(in_array($condition, ['ok', 'damage', 'missing'], true), 'Estado de devolución inválido.');
            $by = $type === 'release' ? null : crew_name($state, $cmd['responsibleId'] ?? '');
            if ($type === 'return' && $condition !== 'ok') require_ok(strlen($note) >= 3, 'Describe el daño o faltante.');
            foreach ($ids as $id) {
                $ai = entity_index($state['assets'], $id); $ii = null;
                foreach ($state['events'][$ei]['items'] as $i => $it) if ($it['assetId'] === $id && in_array($it['status'], ['reserved', 'out', 'missing'], true)) { $ii = $i; break; }
                require_ok($ii !== null && $state['assets'][$ai]['eventId'] === $eventId, 'El equipo no está asignado activamente a este evento.');
                $a = &$state['assets'][$ai]; $it = &$state['events'][$ei]['items'][$ii];
                if ($type === 'dispatch' || $type === 'release') {
                    require_ok($a['status'] === 'reserved' && $it['status'] === 'reserved', 'Solo puedes sacar o liberar equipos reservados.');
                    $a['status'] = $type === 'dispatch' ? 'out' : 'available'; $it['status'] = $type === 'dispatch' ? 'out' : 'released';
                    if ($type === 'release') $a['eventId'] = null; else { $a['location'] = $state['events'][$ei]['place']; $it['outBy'] = $by; }
                } else {
                    require_ok(in_array($a['status'], ['out', 'missing'], true) && in_array($it['status'], ['out', 'missing'], true), 'El equipo aún no ha salido o ya fue devuelto.');
                    $a['status'] = match ($condition) { 'damage' => 'maintenance', 'missing' => 'missing', default => 'available' };
                    $a['condition'] = $condition === 'missing' ? 'review' : $condition;
                    $a['location'] = $condition === 'missing' ? $a['location'] : ($condition === 'damage' ? 'Taller' : home_of($a));
                    $a['eventId'] = $condition === 'missing' ? $eventId : null; $a['note'] = $note;
                    $it['status'] = $condition === 'missing' ? 'missing' : 'returned'; $it['condition'] = $condition; $it['note'] = $note; $it['inBy'] = $by;
                }
                unset($a, $it);
            }
            $summary = match ($type) { 'dispatch' => 'Salida registrada', 'release' => 'Reserva liberada', default => $condition === 'missing' ? 'Faltante reportado' : 'Devolución registrada' } . ': ' . count($ids) . ' piezas · ' . $state['events'][$ei]['name'] . ($by ? ' · Responsable: ' . $by : ''); break;
        case 'maintenance':
            $ids = selected_ids($cmd); $ready = ($cmd['ready'] ?? false) === true; $note = clean_text($cmd['note'] ?? '', 1500);
            foreach ($ids as $id) {
                $ai = entity_index($state['assets'], $id); $a = &$state['assets'][$ai];
                require_ok($ready ? $a['status'] === 'maintenance' : $a['status'] === 'available', 'El equipo no admite ese cambio de mantenimiento.');
                $a['status'] = $ready ? 'available' : 'maintenance'; $a['condition'] = $ready ? 'ok' : 'review';
                $a['location'] = $ready ? home_of($a) : 'Taller'; $a['note'] = $note; unset($a);
            }
            $summary = $ready ? 'Revisión técnica completada' : 'Equipos enviados a mantenimiento'; break;
        case 'event_poster':
            $ei = entity_index($state['events'], clean_text($cmd['eventId'] ?? '', 80)); $eventId = $state['events'][$ei]['id'];
            $state['events'][$ei]['poster'] = clean_poster($cmd['poster'] ?? '');
            $summary = ($state['events'][$ei]['poster'] === '' ? 'Afiche quitado: ' : 'Afiche actualizado: ') . $state['events'][$ei]['name']; break;
        case 'event_update':
            $ei = entity_index($state['events'], clean_text($cmd['eventId'] ?? '', 80)); $e = &$state['events'][$ei]; $eventId = $e['id'];
            $status = $cmd['status'] ?? ($e['status'] ?? 'planning'); require_ok(in_array($status, timing_event_statuses(), true), 'Estado de evento inválido.');
            $sm = clean_text($cmd['stageManagerId'] ?? '', 20); if ($sm !== '') crew_name($state, $sm);
            $raw = $cmd['stages'] ?? (event_stages($e)); require_ok(is_array($raw) && count($raw) >= 1 && count($raw) <= 8, 'Define entre 1 y 8 escenarios.');
            $stages = []; $seen = [];
            foreach ($raw as $st) { require_ok(is_array($st), 'Escenario inválido.'); $sid = clean_text($st['id'] ?? '', 4); $sname = clean_text($st['name'] ?? '', 60);
                require_ok((bool)preg_match('/^S[0-9]{1,2}$/', $sid) && !isset($seen[$sid]) && $sname !== '', 'Revisa los nombres de los escenarios.'); $seen[$sid] = true; $stages[] = ['id' => $sid, 'name' => $sname]; }
            foreach (($e['timing'] ?? []) as $act) require_ok(isset($seen[$act['stageId']]), 'Hay actividades en un escenario que quieres quitar. Muévelas antes.');
            $e['client'] = clean_text($cmd['client'] ?? '', 160); $e['address'] = clean_text($cmd['address'] ?? '', 200); $e['status'] = $status;
            $e['stageManagerId'] = $sm; $e['stages'] = $stages; $e['notes'] = clean_text($cmd['notes'] ?? '', 3000);
            $summary = 'Datos del evento actualizados: ' . $e['name']; unset($e); break;
        case 'timing_save':
            $ei = entity_index($state['events'], clean_text($cmd['eventId'] ?? '', 80)); $e = &$state['events'][$ei]; $eventId = $e['id'];
            $acts = $cmd['activities'] ?? null; require_ok(is_array($acts) && count($acts) <= 200, 'El cronograma admite hasta 200 actividades.');
            $stageIds = array_column(event_stages($e), 'id'); $prev = []; foreach (($e['timing'] ?? []) as $p) $prev[$p['id']] = $p; $out = []; $ids = [];
            foreach ($acts as $a) {
                require_ok(is_array($a), 'Actividad inválida.'); $aid = clean_text($a['id'] ?? '', 16);
                require_ok((bool)preg_match('/^A[0-9A-Z]{2,14}$/', $aid) && !in_array($aid, $ids, true), 'Identificador de actividad inválido.'); $ids[] = $aid;
                $type = $a['type'] ?? ''; require_ok(in_array($type, timing_types(), true), 'Tipo de actividad inválido.');
                $title = clean_text($a['title'] ?? '', 120); require_ok($title !== '', 'Cada actividad necesita un nombre.');
                $stage = $a['stageId'] ?? ''; require_ok(in_array($stage, $stageIds, true), 'Escenario inválido en «' . $title . '».');
                $start = $a['start'] ?? ''; $end = $a['end'] ?? '';
                require_ok(valid_local_dt($start) && valid_local_dt($end), 'Revisa las horas de «' . $title . '».');
                $mins = (strtotime($end) - strtotime($start)) / 60; require_ok($mins > 0 && $mins <= 1440, '«' . $title . '» debe terminar después de empezar (máximo 24 h).');
                $resp = clean_text($a['responsibleId'] ?? '', 20); if ($resp !== '') crew_name($state, $resp);
                $st = $a['status'] ?? 'pending'; require_ok(in_array($st, timing_statuses(), true), 'Estado de actividad inválido.');
                $out[] = ['id' => $aid, 'type' => $type, 'title' => $title, 'stageId' => $stage, 'start' => $start, 'end' => $end, 'responsibleId' => $resp,
                    'artist' => clean_text($a['artist'] ?? '', 120), 'description' => clean_text($a['description'] ?? '', 1000), 'status' => $st,
                    'actualStart' => $prev[$aid]['actualStart'] ?? null, 'actualEnd' => $prev[$aid]['actualEnd'] ?? null];
            }
            usort($out, fn($x, $y) => strcmp($x['start'], $y['start']) ?: strcmp($x['end'], $y['end']));
            $e['timing'] = $out; $summary = 'Run of Show actualizado: ' . count($out) . ' actividades · ' . $e['name']; unset($e); break;
        case 'crew_rename':
            $crew = crew_list($state); $tid = clean_text($cmd['crewId'] ?? '', 20); $name = clean_text($cmd['name'] ?? '', 80);
            require_ok($name !== '', 'Escribe el nombre del técnico.'); $found = false;
            foreach ($crew as $t) require_ok($t['id'] === $tid || mb_strtolower($t['name']) !== mb_strtolower($name), 'Ya hay un técnico con ese nombre.');
            foreach ($crew as &$t) if ($t['id'] === $tid) { $t['name'] = $name; $found = true; } unset($t);
            require_ok($found, 'Técnico no encontrado.'); $state['crew'] = $crew; $summary = 'Equipo técnico actualizado: ' . $name; break;
        case 'crew_profile':
            $crew = crew_list($state); $tid = clean_text($cmd['crewId'] ?? '', 20); $name = clean_text($cmd['name'] ?? '', 80);
            require_ok($name !== '', 'Escribe el nombre del técnico.');
            $email = strtolower(clean_text($cmd['email'] ?? '', 190)); require_ok($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) !== false, 'Revisa el email del técnico.');
            $phone = clean_phone($cmd['phone'] ?? ''); $found = false;
            foreach ($crew as $t) require_ok($t['id'] === $tid || mb_strtolower($t['name']) !== mb_strtolower($name), 'Ya hay un técnico con ese nombre.');
            foreach ($crew as &$t) if ($t['id'] === $tid) {
                $t['name'] = $name; $t['email'] = $email; $t['phone'] = $phone; $found = true;
                if (array_key_exists('function', $cmd)) $t['function'] = clean_text($cmd['function'] ?? '', 60);
                if (array_key_exists('photo', $cmd)) $t['photo'] = ($cmd['photo'] ?? '') === '' ? '' : clean_jpeg($cmd['photo'], 90000);
            } unset($t);
            require_ok($found, 'Técnico no encontrado.'); $state['crew'] = $crew; $summary = 'Perfil de técnico actualizado: ' . $name; break;
        case 'crew_add':
            $crew = crew_list($state); $name = clean_text($cmd['name'] ?? '', 80); require_ok($name !== '', 'Escribe el nombre del técnico.');
            $back = null; $max = 0;
            foreach ($crew as $i => $t) { if (mb_strtolower($t['name']) === mb_strtolower($name)) { require_ok(!($t['active'] ?? true), 'Ya hay un técnico con ese nombre.'); $back = $i; } if (preg_match('/^TEC-(\d+)$/', $t['id'], $m)) $max = max($max, (int)$m[1]); }
            require_ok(count(array_filter($crew, fn($t) => $t['active'] ?? true)) < 60, 'Llegaste al máximo de 60 técnicos.');
            if ($back !== null) { $crew[$back]['active'] = true; $crew[$back]['name'] = $name; $summary = 'Técnico reincorporado: ' . $name; }
            else { $crew[] = ['id' => sprintf('TEC-%02d', $max + 1), 'name' => $name, 'active' => true]; $summary = 'Técnico agregado: ' . $name; }
            $state['crew'] = $crew; break;
        case 'crew_remove':
            $crew = crew_list($state); $tid = clean_text($cmd['crewId'] ?? '', 20); $found = false;
            foreach ($crew as &$t) if ($t['id'] === $tid && ($t['active'] ?? true)) { $t['active'] = false; $found = true; $name = $t['name']; } unset($t);
            require_ok($found, 'Técnico no encontrado.');
            require_ok(count(array_filter($crew, fn($t) => $t['active'] ?? true)) >= 1, 'Debe quedar al menos un técnico.');
            $state['crew'] = $crew; $summary = 'Técnico eliminado: ' . $name; break;
        case 'my_photo':
            // userEmail lo pone el servidor desde la sesión (http.php); el cliente no elige a quién cambiarle la foto.
            $email = mb_strtolower(trim((string)($cmd['userEmail'] ?? ''))); $key = $email !== '' ? $email : 'demo';
            $photo = ($cmd['photo'] ?? '') === '' ? '' : clean_jpeg($cmd['photo'], 90000);
            $crew = crew_list($state); $hits = $email === '' ? [] : array_keys(array_filter($crew, fn($t) => ($t['active'] ?? true) && mb_strtolower(trim((string)($t['email'] ?? ''))) === $email));
            require_ok(count($hits) <= 1, 'Hay más de un técnico con tu correo. Pide a un administrador que lo corrija.');
            $profiles = is_array($state['profiles'] ?? null) || is_object($state['profiles'] ?? null) ? (array)$state['profiles'] : [];
            if ($hits) { $crew[$hits[0]]['photo'] = $photo; $state['crew'] = $crew; unset($profiles[$key]); }
            elseif ($photo === '') unset($profiles[$key]); else $profiles[$key] = ['photo' => $photo];
            $state['profiles'] = (object)$profiles; $summary = ($photo === '' ? 'Foto de perfil quitada: ' : 'Foto de perfil actualizada: ') . $actor; break;
        case 'crew_photo':
            $crew = crew_list($state); $tid = clean_text($cmd['crewId'] ?? '', 20); $photo = ($cmd['photo'] ?? '') === '' ? '' : clean_jpeg($cmd['photo'], 90000); $found = false;
            foreach ($crew as &$t) if ($t['id'] === $tid) { $t['photo'] = $photo; $found = true; $name = $t['name']; } unset($t);
            require_ok($found, 'Técnico no encontrado.'); $state['crew'] = $crew; $summary = 'Foto de técnico actualizada: ' . $name; break;
        case 'report_issue':
            $ids = selected_ids($cmd); require_ok(count($ids) <= 60, 'Reporta hasta 60 piezas por informe.'); $kind = $cmd['kind'] ?? '';
            require_ok(in_array($kind, ['damage', 'missing'], true), 'Elige si es daño o faltante.'); $note = clean_text($cmd['note'] ?? '', 1500);
            require_ok(strlen($note) >= 3, 'Describe el daño o faltante.'); $by = crew_name($state, $cmd['responsibleId'] ?? '');
            $photo = empty($cmd['photo']) ? '' : clean_jpeg($cmd['photo'], 200000); $issueEvent = null;
            foreach ($ids as $id) {
                $ai = entity_index($state['assets'], $id); $a = &$state['assets'][$ai]; $issueEvent = $issueEvent ?? $a['eventId'];
                if ($a['status'] === 'available') { if ($kind === 'damage') { $a['status'] = 'maintenance'; $a['condition'] = 'damage'; $a['location'] = 'Taller'; } else { $a['status'] = 'missing'; $a['condition'] = 'review'; } }
                $a['note'] = ($kind === 'damage' ? 'Daño: ' : 'Faltante: ') . $note; unset($a);
            }
            $issueId = $newId('INF'); $eventId = $issueEvent;
            $state['issues'] = $state['issues'] ?? [];
            array_unshift($state['issues'], ['id' => $issueId, 'at' => date(DATE_ATOM), 'kind' => $kind, 'assetIds' => $ids, 'note' => $note, 'photo' => $photo, 'by' => $by, 'byId' => $cmd['responsibleId'], 'eventId' => $issueEvent, 'status' => 'open', 'actor' => $actor]);
            $summary = ($kind === 'damage' ? 'Informe de daño ' : 'Informe de faltante ') . $issueId . ': ' . count($ids) . ' piezas · Responsable: ' . $by; break;
        case 'issue_close':
            $iid = clean_text($cmd['issueId'] ?? '', 40); $state['issues'] = $state['issues'] ?? []; $ii = entity_index($state['issues'], $iid);
            require_ok($state['issues'][$ii]['status'] === 'open', 'El informe ya está cerrado.'); $note = clean_text($cmd['note'] ?? '', 500);
            $state['issues'][$ii]['status'] = 'closed'; $state['issues'][$ii]['closedAt'] = date(DATE_ATOM); $state['issues'][$ii]['closedBy'] = $actor; $state['issues'][$ii]['resolution'] = $note;
            $ids = $state['issues'][$ii]['assetIds']; $summary = 'Informe cerrado: ' . $iid; break;
        case 'transfer':
            $ids = selected_ids($cmd); $to = clean_text($cmd['warehouse'] ?? '', 40); $note = clean_text($cmd['note'] ?? '', 500);
            require_ok(in_array($to, warehouses(), true), 'Elige Bodega A o Bodega B.');
            foreach ($ids as $id) {
                $ai = entity_index($state['assets'], $id); $a = &$state['assets'][$ai];
                require_ok($a['status'] === 'available' && $a['condition'] === 'ok', $a['name'] . ' no está disponible en bodega; no se puede trasladar.');
                $a['location'] = $to; $a['home'] = $to; unset($a);
            }
            $summary = 'Traslado a ' . $to . ': ' . count($ids) . ' piezas'; break;
        default: throw new DomainError('Operación no válida.');
    }
    // An assembled kit can never stay "complete" when its components split locations/statuses.
    foreach ($state['kits'] as &$kit) {
        $parts = array_values(array_filter($state['assets'], fn($a) => $a['kitId'] === $kit['id']));
        if (count(array_diff($kit['expectedIds'], array_column($parts, 'id'))) || count(array_unique(array_column($parts, 'status'))) !== 1 || count(array_unique(array_column($parts, 'location'))) !== 1 || array_filter($parts, fn($a) => $a['condition'] !== 'ok')) $kit['assembled'] = false;
    }
    unset($kit);
    if (!isset($state['crew'])) $state['crew'] = default_crew();
    $movement = ['id' => $newId('MOV'), 'at' => date(DATE_ATOM), 'type' => $type, 'summary' => $summary, 'responsible' => $by ?? null,
        'assetIds' => $ids, 'actor' => $actor, 'eventId' => $eventId, 'note' => $note];
    if ($type === 'return' && !empty($cmd['photo'])) {
        $photo = $cmd['photo']; require_ok(is_string($photo) && strlen($photo) < 200000 && str_starts_with($photo, 'data:image/jpeg;base64,'), 'La foto debe ser JPEG y pesar menos de 150 KB.');
        $bytes = base64_decode(substr($photo, 23), true); require_ok($bytes !== false && str_starts_with($bytes, "\xFF\xD8\xFF"), 'Foto inválida.'); $movement['photo'] = $photo;
    }
    array_unshift($state['movements'], $movement); $state['revision']++;
    return $state;
}
