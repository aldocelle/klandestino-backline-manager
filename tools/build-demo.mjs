import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const seed=execFileSync(process.execPath,['tools/php.mjs','-r','require "src/seed.php"; echo json_encode(seed_state(), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);'],{encoding:'utf8'});
JSON.parse(seed);writeFileSync('frontend/demo-seed.json',seed+'\n');
mkdirSync('demo/assets',{recursive:true});
cpSync('public/assets','demo/assets',{recursive:true});
writeFileSync('demo/index.html',readFileSync('public/index.html','utf8').replace('assets/app.bundle.js','assets/demo.bundle.js'));
execFileSync('node_modules/.bin/esbuild',['frontend/demo-entry.js','--bundle','--minify','--format=esm','--outfile=demo/assets/demo.bundle.js'],{stdio:'inherit'});
console.log('Static demonstration built in demo/. The PHP installation remains in public/.');
