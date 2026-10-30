import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
const local = existsSync('.local/php.json') ? JSON.parse(readFileSync('.local/php.json', 'utf8')) : {};
const child = spawn(process.env.PHP_BIN || local.bin || 'php', [...(local.args || []), ...process.argv.slice(2)], {stdio:'inherit'});
child.on('error', e => { console.error(e.message); process.exit(1); });
child.on('exit', code => process.exit(code || 0));
