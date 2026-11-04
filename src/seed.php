<?php
declare(strict_types=1);
require_once __DIR__ . '/domain.php';

function seed_state(): array
{
    $assets = [];
    $kits = [];
    $add = function (string $id, string $name, string $category, string $brand, string $model, ?string $kitId = null, ?string $section = null) use (&$assets): string {
        $asset = ['id' => $id, 'code' => $id, 'name' => $name, 'category' => $category,
            'brand' => $brand, 'model' => $model, 'kitId' => $kitId, 'location' => 'Bodega A', 'home' => 'Bodega A',
            'status' => 'available', 'condition' => 'ok', 'eventId' => null, 'note' => '', 'serial' => ''];
        if ($section) $asset['section'] = $section;
        $assets[] = $asset;
        return $id;
    };
    // Varias unidades iguales: «Nombre 01», «Nombre 02»… con código PREFIJO-001.
    $many = function (string $prefix, string $name, int $qty, string $category, string $brand, string $model, ?string $section = null) use ($add): void {
        for ($n = 1; $n <= $qty; $n++) $add(sprintf('%s-%03d', $prefix, $n), $qty > 1 ? sprintf('%s %02d', $name, $n) : $name, $category, $brand, $model, null, $section);
    };

    // Inventario oficial 2026 (planilla «INVENTARIO BACKLINE KLAN FULL»).
    // Batería: 2 kits Tama Starclassic armados con las piezas de la planilla; el resto queda individual.
    $parts = [
        ['BD1', 'Bombo 22” · derecho', 'Tambores'], ['BD2', 'Bombo 22” · izquierdo', 'Tambores'],
        ['T10', 'Tom 10”', 'Tambores'], ['T12', 'Tom 12”', 'Tambores'], ['T13', 'Tom 13”', 'Tambores'],
        ['F14', 'Tom de piso 14”', 'Tambores'], ['F16', 'Tom de piso 16”', 'Tambores'],
        ['SN', 'Caja 14”', 'Tambores'],
        ['SS', 'Atril de caja', 'Fierros'], ['HH', 'Atril hi-hat 3 patas', 'Fierros'], ['ST', 'Sillín', 'Fierros'],
        ['B1', 'Atril con boom 01', 'Fierros'], ['B2', 'Atril con boom 02', 'Fierros'],
        ['B3', 'Atril con boom 03', 'Fierros'], ['B4', 'Atril con boom 04', 'Fierros'],
        ['R1', 'Atril recto 01', 'Fierros'], ['R2', 'Atril recto 02', 'Fierros'],
        // No están en la planilla, pero bodega confirmó su existencia el 3/11/2026 (por kit).
        ['TM1', 'Soporte de tom 01', 'Fierros'], ['TM2', 'Soporte de tom 02', 'Fierros'], ['TM3', 'Soporte de tom 03', 'Fierros'],
        ['PD1', 'Pedal de bombo 01', 'Fierros'], ['PD2', 'Pedal de bombo 02', 'Fierros'], ['DP', 'Pedal doble', 'Fierros'],
        ['HR', 'Varilla hi-hat', 'Accesorios'], ['CL', 'Clutch hi-hat', 'Accesorios'],
        ['FBD1', 'Funda bombo 22” · derecho', 'Cases'], ['FBD2', 'Funda bombo 22” · izquierdo', 'Cases'], ['FSN', 'Funda caja 14”', 'Cases'],
        ['FT10', 'Funda tom 10”', 'Cases'], ['FT12', 'Funda tom 12”', 'Cases'], ['FT13', 'Funda tom 13”', 'Cases'],
        ['FF14', 'Funda tom de piso 14”', 'Cases'], ['FF16', 'Funda tom de piso 16”', 'Cases'],
    ];
    foreach ([1, 2] as $n) {
        $code = 'TAM-SCM-00' . $n;
        $snare = $n === 1 ? ['Mapex', 'Black Panther'] : ['Tama', 'Starclassic'];
        $ids = [];
        foreach ($parts as [$suffix, $name, $category]) {
            [$brand, $model] = $suffix === 'SN' ? $snare : ['Tama', 'Starclassic'];
            $ids[] = $add($code . '-' . $suffix, $suffix === 'SN' ? $name . ' · ' . $brand . ' ' . $model : $name, $category, $brand, $model, $code);
        }
        $kits[] = ['id' => $code, 'name' => 'Tama Starclassic 0' . $n, 'brand' => 'Tama',
            'finish' => $n === 1 ? 'Maple Tobacco Burst' : 'Dark Mocha Fade', 'assembled' => true,
            'expectedIds' => $ids, 'note' => 'Doble bombo 2×22” · toms 10”, 12”, 13” · piso 14”, 16” · caja ' . $snare[0] . ' ' . $snare[1] . ' 14” · fundas para cada tambor · ' . count($ids) . ' piezas trazables.'];
    }
    $add('TAM-SCM-T08-001', 'Tom 8”', 'Tambores', 'Tama', 'Starclassic');
    $many('TAM-SCM-F18', 'Tom de piso 18”', 2, 'Tambores', 'Tama', 'Starclassic');
    // Platillos
    $seq = [];
    foreach ([
        ['HH', 'Hi-hat 14”', 'Zildjian', 'Z3'], ['HH', 'Hi-hat 14”', 'Zildjian', 'Z Custom'],
        ['CR', 'Crash 20”', 'Zildjian', 'Z3'], ['CR', 'Crash 16”', 'Zildjian', 'A Custom'], ['CR', 'Crash 17”', 'Zildjian', 'Z Custom'],
        ['CR', 'Crash 18”', 'Zildjian', 'Z Custom'], ['CR', 'Crash 18”', 'Zildjian', 'Z Custom'], ['CR', 'Crash 18”', 'Meinl', 'Classics Custom'],
        ['RD', 'Ride 22”', 'Zildjian', 'Z Custom'], ['RD', 'Ride 20”', 'Zildjian', 'ZBT'], ['RD', 'Ride 20”', 'Zildjian', 'ZHT'],
        ['RD', 'Ride 20”', 'Zildjian', ''], ['RD', 'Ride 20”', 'Zildjian', 'S'],
        ['CH', 'China 18”', 'Zildjian', 'Z Custom'], ['CH', 'China 16”', 'Paiste', 'Red'], ['CH', 'China 16”', 'Paiste', 'Purple'], ['CH', 'China 18”', 'Paiste', 'PST8'],
        ['SP', 'Splash 8”', 'Zildjian', 'Z Custom'], ['SP', 'Splash 10”', 'Paiste', 'PST5'],
    ] as [$type, $name, $brand, $model]) {
        $seq[$type] = ($seq[$type] ?? 0) + 1;
        $add(sprintf('CYM-%s-%03d', $type, $seq[$type]), $name . ' · ' . trim($brand . ' ' . $model), 'Platillos', $brand, $model);
    }
    // Hardware suelto (fuera de los kits)
    $many('HW-BOOM', 'Atril con boom', 8, 'Fierros', 'Tama', '');
    $many('HW-SS', 'Atril de caja', 2, 'Fierros', 'Tama', '');
    $many('HW-HH2', 'Atril hi-hat 2 patas', 2, 'Fierros', 'Tama', '');
    $many('HW-CLAMP', 'Clamp', 10, 'Accesorios', 'Tama', '');
    $many('HW-HHA', 'HH attachment', 2, 'Accesorios', 'Tama', '');
    // Guitarra
    $many('MES-TRIPLEREC', 'Mesa Boogie Triple Rectifier', 1, 'Cabezales', 'Mesa Boogie', 'Triple Rectifier', 'guitar');
    $many('FEN-EVH5150', 'Fender EVH 5150', 2, 'Cabezales', 'Fender', 'EVH 5150', 'guitar');
    $many('PEA-6505H', 'Peavey 6505', 3, 'Cabezales', 'Peavey', '6505', 'guitar');
    $many('LAN-GH100', 'Laney GH100', 1, 'Cabezales', 'Laney', 'GH100', 'guitar');
    $many('LAN-IRT120', 'Laney Ironheart 120', 1, 'Cabezales', 'Laney', 'Ironheart 120', 'guitar');
    $many('KEM-PROFILER', 'Kemper Profiler', 2, 'Cabezales', 'Kemper', 'Profiler Amp', 'guitar');
    $many('MAR-1960B', 'Marshall 1960B', 4, 'Gabinetes', 'Marshall', '1960B · 4×12', 'guitar');
    $many('LAN-GS21', 'Laney GS21', 2, 'Gabinetes', 'Laney', 'GS21', 'guitar');
    $many('PEA-6505C', 'Peavey 6505', 1, 'Gabinetes', 'Peavey', '6505', 'guitar');
    $many('PEA-212', 'Peavey 2×12”', 1, 'Gabinetes', 'Peavey', '2×12', 'guitar');
    $many('GAT-GBOAT', 'Guitarboat Gator', 3, 'Accesorios', 'Gator', 'Guitarboat', 'guitar');
    $many('HER-GTR', 'Atril de guitarra Hercules', 3, 'Fierros', 'Hercules', '', 'guitar');
    // Bajo
    $many('HAR-LH1000', 'Hartke LH 1000', 1, 'Cabezales', 'Hartke', 'LH 1000', 'bass');
    $many('HAR-LX5500', 'Hartke LX 5500', 1, 'Cabezales', 'Hartke', 'LX 5500', 'bass');
    $many('AMP-SVTCL', 'Ampeg SVT CL', 1, 'Cabezales', 'Ampeg', 'SVT CL', 'bass');
    $many('AMP-SVT450', 'Ampeg SVT 450', 1, 'Cabezales', 'Ampeg', 'SVT 450', 'bass');
    $many('HAR-BASSATK', 'Preamp Hartke Bass Attack', 1, 'Accesorios', 'Hartke', 'Bass Attack', 'bass');
    $many('AMP-810', 'Ampeg Classic 8×10”', 2, 'Gabinetes', 'Ampeg', 'Classic 8×10', 'bass');
    $many('AMP-610', 'Ampeg Classic 6×10”', 1, 'Gabinetes', 'Ampeg', 'Classic 6×10', 'bass');
    $many('ASH-410', 'Ashdown Classic 4×10”', 1, 'Gabinetes', 'Ashdown', 'Classic 4×10', 'bass');
    // Varios
    $many('ACC-FAN', 'Ventilador', 4, 'Accesorios', '', '');
    $many('ACC-RUG', 'Alfombra', 2, 'Accesorios', '', '');
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
        if (in_array($asset['id'], ['MAR-1960B-003', 'AMP-810-002', 'KEM-PROFILER-002', 'HW-BOOM-007', 'CYM-CR-002'], true)) {
            $asset['status'] = 'out'; $asset['eventId'] = 'EVT-DEMO-002'; $asset['location'] = 'Sesión en vivo · Valparaíso';
            $events[1]['items'][] = ['assetId' => $asset['id'], 'status' => 'out', 'condition' => 'ok', 'note' => ''];
        }
        if ($asset['id'] === 'HW-BOOM-008') { $asset['status'] = 'maintenance'; $asset['condition'] = 'damage'; $asset['location'] = 'Taller'; $asset['note'] = 'Revisar mariposa de ajuste.'; }
    }
    unset($asset);
    return ['version' => 1, 'revision' => 0, 'assets' => $assets, 'kits' => $kits, 'events' => $events, 'crew' => default_crew(),
        'movements' => [['id' => 'MOV-SEED', 'at' => $now->format(DATE_ATOM), 'type' => 'seed',
            'summary' => 'Inventario oficial 2026 cargado', 'assetIds' => [], 'actor' => 'Sistema demo', 'eventId' => null, 'note' => 'Planilla «INVENTARIO BACKLINE KLAN FULL». Eventos y movimientos de ejemplo solo en la demo.']]];
}
