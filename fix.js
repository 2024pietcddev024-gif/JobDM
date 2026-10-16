import fs from 'fs';

let c = fs.readFileSync('server/scripts/generate_batch10.js', 'utf8');
c = c.replace(/\\"/g, '"');
c = c.replace(/\\\\n/g, '\\n');
c = c.replace(/\\\\`/g, '`');
c = c.replace(/\\\\\$/g, '$');
c = c.replace(/\\`/g, '`');
fs.writeFileSync('server/scripts/generate_batch10.js', c);
console.log('Fixed');
