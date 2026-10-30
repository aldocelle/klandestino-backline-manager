<?php
// Copy to config.local.php, OUTSIDE the public web root. Never commit credentials.
return [
    'dsn' => 'mysql:host=localhost;dbname=klandestino;charset=utf8mb4',
    'user' => 'your_database_user',
    'password' => 'your_database_password',
    'setup_key' => 'replace-with-a-long-random-installation-key',
    'demo' => false,
];
