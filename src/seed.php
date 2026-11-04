<?php
declare(strict_types=1);
require_once __DIR__ . '/domain.php';

function seed_state(): array
{
    $assets = [];
    $kits = [];
    $add = function (string $id, string $name, string $category, string $brand, string $model, ?string $kitId = null, string $location = 'Bodega A') use (&$assets): string {
        $assets[] = ['id' => $id, 'code' => $id, 'name' => $name, 'category' => $category,
            'brand' => $brand, 'model' => $model, 'kitId' => $kitId, 'location' => $location, 'home' => 'Bodega A',
            'status' => 'available', 'condition' => 'ok', 'eventId' => null, 'note' => '',
            'serial' => 'DEMO-' . $id];
        return $id;
    };
    // Composición por kit confirmada con bodega (3/11/2026): doble bombo, 3 toms, 2 toms de piso,
    // atril de caja, 2 pedales + pedal doble, 3 soportes de tom, 4 boom, 4 rectos, sillín e hi-hat
    // con atril, varilla y clutch trazables por separado. Caja Mapex Black Panther 14”.
    $parts = [
        ['BD1', 'Bombo 22” maple · derecho', 'Tambores'], ['BD2', 'Bombo 22” maple · izquierdo', 'Tambores'],
        ['SN', 'Caja 14” Mapex Black Panther', 'Tambores', 'Mapex', 'Black Panther'],
        ['T10', 'Tom 10”', 'Tambores'], ['T12', 'Tom 12”', 'Tambores'], ['T13', 'Tom 13”', 'Tambores'],
        ['F14', 'Tom de piso 14”', 'Tambores'], ['F16', 'Tom de piso 16”', 'Tambores'],
        ['SS', 'Atril de caja', 'Fierros'],
        ['B1', 'Atril boom 01', 'Fierros'], ['B2', 'Atril boom 02', 'Fierros'],
        ['B3', 'Atril boom 03', 'Fierros'], ['B4', 'Atril boom 04', 'Fierros'],
        ['R1', 'Atril recto 01', 'Fierros'], ['R2', 'Atril recto 02', 'Fierros'],
        ['R3', 'Atril recto 03', 'Fierros'], ['R4', 'Atril recto 04', 'Fierros'],
        ['TM1', 'Soporte de tom 01', 'Fierros'], ['TM2', 'Soporte de tom 02', 'Fierros'], ['TM3', 'Soporte de tom 03', 'Fierros'],
        ['PD1', 'Pedal de bombo 01', 'Fierros'], ['PD2', 'Pedal de bombo 02', 'Fierros'], ['DP', 'Pedal doble', 'Fierros'],
        ['ST', 'Sillín', 'Fierros'],
        ['HH', 'Atril hi-hat', 'Fierros'], ['HR', 'Varilla hi-hat', 'Accesorios'], ['CL', 'Clutch hi-hat', 'Accesorios'],
        ['FBD1', 'Funda bombo 22” · derecho', 'Cases'], ['FBD2', 'Funda bombo 22” · izquierdo', 'Cases'], ['FSN', 'Funda caja 14”', 'Cases'],
        ['FT10', 'Funda tom 10”', 'Cases'], ['FT12', 'Funda tom 12”', 'Cases'], ['FT13', 'Funda tom 13”', 'Cases'],
        ['FF14', 'Funda tom de piso 14”', 'Cases'], ['FF16', 'Funda tom de piso 16”', 'Cases'],
    ];
    foreach ([1, 2] as $n) {
        $code = 'TAM-SCM-00' . $n;
        $ids = [];
        foreach ($parts as $part) {
            [$suffix, $name, $category] = $part;
            $ids[] = $add($code . '-' . $suffix, $name, $category, $part[3] ?? 'Tama', $part[4] ?? 'Starclassic Maple', $code);
        }
        $kits[] = ['id' => $code, 'name' => 'Tama Starclassic Maple 0' . $n, 'brand' => 'Tama',
            'finish' => $n === 1 ? 'Maple Tobacco Burst' : 'Dark Mocha Fade', 'assembled' => true,
            'expectedIds' => $ids, 'note' => 'Doble bombo 2×22” · toms 10”, 12”, 13” · piso 14”, 16” · caja Mapex Black Panther 14” · fundas para cada tambor · 35 piezas trazables.'];
    }
    for ($n = 1; $n <= 4; $n++) $add(sprintf('MAR-1960A-%03d', $n), 'Marshall 1960A ' . sprintf('%02d', $n), 'Gabinetes', 'Marshall', '1960A · 4×12');
    for ($n = 1; $n <= 2; $n++) {
        $add(sprintf('AMP-810-%03d', $n), 'Ampeg SVT 8×10 ' . sprintf('%02d', $n), 'Gabinetes', 'Ampeg', 'SVT-810E');
        $add(sprintf('KEM-GTR-%03d', $n), 'Kemper Profiler ' . sprintf('%02d', $n), 'Cabezales', 'Kemper', 'Profiler Head');
    }
    foreach ([['BOOM', 'Atril con boom', 8], ['RECT', 'Atril recto', 6], ['HH', 'Atril hi-hat', 3], ['CL', 'Clutch de repuesto', 4]] as [$prefix, $name, $count]) {
        for ($n = 1; $n <= $count; $n++) $add(sprintf('HW-%s-%03d', $prefix, $n), $name . ' ' . sprintf('%02d', $n), $prefix === 'CL' ? 'Accesorios' : 'Fierros', 'Tama / Pearl', 'Serie profesional');
    }
    for ($n = 1; $n <= 6; $n++) $add(sprintf('MIC-SM57-%03d', $n), 'Shure SM57 ' . sprintf('%02d', $n), 'Micrófonos', 'Shure', 'SM57');
    for ($n = 1; $n <= 6; $n++) $add(sprintf('CBL-XLR-%03d', $n), 'Cable XLR 10 m ' . sprintf('%02d', $n), 'Cables', 'Proel', 'Balanceado 10 m');
    for ($n = 1; $n <= 4; $n++) $add(sprintf('CASE-%03d', $n), 'Flight case ' . sprintf('%02d', $n), 'Cases', 'Klandestino', 'Backline case');
    $now = new DateTimeImmutable('now', new DateTimeZone('America/Santiago'));
    $events = [
        ['id' => 'EVT-DEMO-001', 'name' => 'Festival Metal', 'place' => 'Santiago · Escenario principal',
            'start' => $now->modify('+1 day')->format('Y-m-d') . 'T09:00', 'end' => $now->modify('+2 days')->format('Y-m-d') . 'T12:00',
            'responsible' => 'Krew Norte', 'vehicle' => 'Furgón 01', 'service' => 'Backline', 'items' => []],
        ['id' => 'EVT-DEMO-002', 'name' => 'Sesión en vivo', 'place' => 'Valparaíso · Sala demo',
            'start' => $now->format('Y-m-d') . 'T10:00', 'end' => $now->modify('+1 day')->format('Y-m-d') . 'T11:00',
            'responsible' => 'Krew Costa', 'vehicle' => 'Camión 02', 'service' => 'Backline + Krew', 'items' => []],
    ];
    foreach ($assets as &$asset) {
        if (in_array($asset['id'], ['MAR-1960A-003', 'AMP-810-002', 'KEM-GTR-002', 'HW-BOOM-007', 'HW-RECT-004'], true)) {
            $asset['status'] = 'out'; $asset['eventId'] = 'EVT-DEMO-002'; $asset['location'] = 'Sesión en vivo · Valparaíso';
            $events[1]['items'][] = ['assetId' => $asset['id'], 'status' => 'out', 'condition' => 'ok', 'note' => ''];
        }
        if ($asset['id'] === 'HW-BOOM-008') { $asset['status'] = 'maintenance'; $asset['condition'] = 'damage'; $asset['location'] = 'Taller'; $asset['note'] = 'Revisar mariposa de ajuste.'; }
    }
    unset($asset);
    return ['version' => 1, 'revision' => 0, 'assets' => $assets, 'kits' => $kits, 'events' => $events, 'crew' => default_crew(),
        'movements' => [['id' => 'MOV-SEED', 'at' => $now->format(DATE_ATOM), 'type' => 'seed',
            'summary' => 'Inventario de demostración cargado', 'assetIds' => [], 'actor' => 'Sistema demo', 'eventId' => null, 'note' => 'Datos ficticios; confirmar equipos y cantidades con bodega.']]];
}
