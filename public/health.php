<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');
echo json_encode(['status' => 'ok', 'service' => 'klandestino-backline-manager', 'runtime' => 'php']);
