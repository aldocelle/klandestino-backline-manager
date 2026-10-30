import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
const overrides=existsSync('.local/dev-env.json')?JSON.parse(readFileSync('.local/dev-env.json','utf8')):{};
const portArg=process.argv.indexOf('--port');
const port=portArg>=0?process.argv[portArg+1]:(process.env.PORT||'3000');
const child = spawn(process.execPath, ['tools/php.mjs', '-S', `0.0.0.0:${port}`, '-t', 'public'], {
  stdio:'inherit', env:{...process.env, KB_DEMO_MODE: process.env.KB_DB_DSN ? '0' : '1', ...overrides}
});
child.on('exit', code => process.exit(code || 0));
process.on('SIGTERM',()=>child.kill('SIGTERM'));
