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
function selected_ids(array $command): array {
    $ids = $command['assetIds'] ?? [];
    require_ok(is_array($ids) && count($ids) > 0 && count($ids) <= 500, 'Selecciona al menos un equipo.');
    foreach ($ids as $id) require_ok(is_string($id) && strlen($id) < 100, 'Código de equipo inválido.');
    require_ok(count($ids) === count(array_unique($ids)), 'Hay equipos repetidos en la selección.');
    return array_values($ids);
}
function apply_command(array $state, array $cmd, string $actor): array {
    $type = $cmd['type'] ?? ''; $ids = []; $summary = ''; $eventId = null; $note = '';
    $newId = fn(string $prefix): string => $prefix . '-' . strtoupper(bin2hex(random_bytes(5)));
    switch ($type) {
        case 'create_asset':
            $code = strtoupper(clean_text($cmd['code'] ?? '', 60));
            require_ok((bool)preg_match('/^[A-Z0-9][A-Z0-9_-]{2,59}$/D', $code), 'Usa un código de 3 a 60 letras, números o guiones.');
            foreach ($state['assets'] as $a) require_ok($a['code'] !== $code, 'Ese código ya existe.');
            $name = clean_text($cmd['name'] ?? ''); require_ok($name !== '', 'Escribe el nombre del equipo.');
            $category = clean_text($cmd['category'] ?? 'Accesorios', 60);
            require_ok(in_array($category, ['Tambores', 'Fierros', 'Accesorios', 'Gabinetes', 'Cabezales', 'Micrófonos', 'Cables', 'Cases'], true), 'Categoría inválida.');
            $state['assets'][] = ['id' => $code, 'code' => $code, 'name' => $name, 'category' => $category,
                'brand' => clean_text($cmd['brand'] ?? '', 80), 'model' => clean_text($cmd['model'] ?? '', 100),
                'location' => clean_text($cmd['location'] ?? 'Bodega A', 120), 'serial' => clean_text($cmd['serial'] ?? '', 100),
                'kitId' => null, 'status' => 'available', 'condition' => 'ok', 'eventId' => null, 'note' => ''];
            $ids = [$code]; $summary = 'Equipo incorporado: ' . $name; break;
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
            $ids = selected_ids($cmd);
            foreach ($ids as $id) { $ai = entity_index($state['assets'], $id); require_ok($state['assets'][$ai]['status'] === 'available' && $state['assets'][$ai]['condition'] === 'ok', $state['assets'][$ai]['name'] . ' ya está reservado, fuera o en revisión.'); }
            if ($type === 'create_event') {
                $name = clean_text($cmd['name'] ?? ''); $place = clean_text($cmd['place'] ?? '', 200); $responsible = clean_text($cmd['responsible'] ?? '', 120);
                require_ok($name !== '' && $place !== '' && $responsible !== '', 'Completa evento, destino y responsable.');
                $start = clean_text($cmd['start'] ?? '', 30); $end = clean_text($cmd['end'] ?? '', 30);
                require_ok((bool)preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/D', $start) && strtotime($start) !== false && strtotime($end) !== false && strtotime($end) > strtotime($start), 'La devolución debe ser posterior a la salida.');
                $eventId = $newId('EVT');
                $state['events'][] = ['id' => $eventId, 'name' => $name, 'place' => $place, 'start' => $start, 'end' => $end,
                    'responsible' => $responsible, 'vehicle' => clean_text($cmd['vehicle'] ?? '', 120), 'service' => clean_text($cmd['service'] ?? 'Backline', 80), 'items' => []];
                $ei = count($state['events']) - 1;
            } else { $eventId = clean_text($cmd['eventId'] ?? '', 80); $ei = entity_index($state['events'], $eventId); require_ok(strtotime($state['events'][$ei]['end']) > time(), 'Este evento ya terminó.'); }
            foreach ($ids as $id) {
                $ai = entity_index($state['assets'], $id);
                $state['assets'][$ai]['status'] = 'reserved'; $state['assets'][$ai]['eventId'] = $eventId;
                $state['events'][$ei]['items'][] = ['assetId' => $id, 'status' => 'reserved', 'condition' => 'ok', 'note' => ''];
            }
            $summary = count($ids) . ' equipos reservados para ' . $state['events'][$ei]['name']; break;
        case 'dispatch':
        case 'release':
        case 'return':
            $eventId = clean_text($cmd['eventId'] ?? '', 80); $ei = entity_index($state['events'], $eventId); $ids = selected_ids($cmd);
            $condition = $cmd['condition'] ?? 'ok'; $note = clean_text($cmd['note'] ?? '', 1500);
            require_ok(in_array($condition, ['ok', 'damage', 'missing'], true), 'Estado de devolución inválido.');
            if ($type === 'return' && $condition !== 'ok') require_ok(strlen($note) >= 3, 'Describe el daño o faltante.');
            foreach ($ids as $id) {
                $ai = entity_index($state['assets'], $id); $ii = null;
                foreach ($state['events'][$ei]['items'] as $i => $it) if ($it['assetId'] === $id && in_array($it['status'], ['reserved', 'out', 'missing'], true)) { $ii = $i; break; }
                require_ok($ii !== null && $state['assets'][$ai]['eventId'] === $eventId, 'El equipo no está asignado activamente a este evento.');
                $a = &$state['assets'][$ai]; $it = &$state['events'][$ei]['items'][$ii];
                if ($type === 'dispatch' || $type === 'release') {
                    require_ok($a['status'] === 'reserved' && $it['status'] === 'reserved', 'Solo puedes sacar o liberar equipos reservados.');
                    $a['status'] = $type === 'dispatch' ? 'out' : 'available'; $it['status'] = $type === 'dispatch' ? 'out' : 'released';
                    if ($type === 'release') $a['eventId'] = null; else $a['location'] = $state['events'][$ei]['place'];
                } else {
                    require_ok(in_array($a['status'], ['out', 'missing'], true) && in_array($it['status'], ['out', 'missing'], true), 'El equipo aún no ha salido o ya fue devuelto.');
                    $a['status'] = match ($condition) { 'damage' => 'maintenance', 'missing' => 'missing', default => 'available' };
                    $a['condition'] = $condition === 'missing' ? 'review' : $condition;
                    $a['location'] = $condition === 'missing' ? $a['location'] : ($condition === 'damage' ? 'Taller' : 'Bodega A');
                    $a['eventId'] = $condition === 'missing' ? $eventId : null; $a['note'] = $note;
                    $it['status'] = $condition === 'missing' ? 'missing' : 'returned'; $it['condition'] = $condition; $it['note'] = $note;
                }
                unset($a, $it);
            }
            $summary = match ($type) { 'dispatch' => 'Salida registrada', 'release' => 'Reserva liberada', default => $condition === 'missing' ? 'Faltante reportado' : 'Devolución registrada' } . ': ' . count($ids) . ' piezas · ' . $state['events'][$ei]['name']; break;
        case 'maintenance':
            $ids = selected_ids($cmd); $ready = ($cmd['ready'] ?? false) === true; $note = clean_text($cmd['note'] ?? '', 1500);
            foreach ($ids as $id) {
                $ai = entity_index($state['assets'], $id); $a = &$state['assets'][$ai];
                require_ok($ready ? $a['status'] === 'maintenance' : $a['status'] === 'available', 'El equipo no admite ese cambio de mantenimiento.');
                $a['status'] = $ready ? 'available' : 'maintenance'; $a['condition'] = $ready ? 'ok' : 'review';
                $a['location'] = $ready ? 'Bodega A' : 'Taller'; $a['note'] = $note; unset($a);
            }
            $summary = $ready ? 'Revisión técnica completada' : 'Equipos enviados a mantenimiento'; break;
        default: throw new DomainError('Operación no válida.');
    }
    // An assembled kit can never stay "complete" when its components split locations/statuses.
    foreach ($state['kits'] as &$kit) {
        $parts = array_values(array_filter($state['assets'], fn($a) => $a['kitId'] === $kit['id']));
        if (count(array_diff($kit['expectedIds'], array_column($parts, 'id'))) || count(array_unique(array_column($parts, 'status'))) !== 1 || count(array_unique(array_column($parts, 'location'))) !== 1 || array_filter($parts, fn($a) => $a['condition'] !== 'ok')) $kit['assembled'] = false;
    }
    unset($kit);
    $movement = ['id' => $newId('MOV'), 'at' => date(DATE_ATOM), 'type' => $type, 'summary' => $summary,
        'assetIds' => $ids, 'actor' => $actor, 'eventId' => $eventId, 'note' => $note];
    if ($type === 'return' && !empty($cmd['photo'])) {
        $photo = $cmd['photo']; require_ok(is_string($photo) && strlen($photo) < 200000 && str_starts_with($photo, 'data:image/jpeg;base64,'), 'La foto debe ser JPEG y pesar menos de 150 KB.');
        $bytes = base64_decode(substr($photo, 23), true); require_ok($bytes !== false && str_starts_with($bytes, "\xFF\xD8\xFF"), 'Foto inválida.'); $movement['photo'] = $photo;
    }
    array_unshift($state['movements'], $movement); $state['revision']++;
    return $state;
}
