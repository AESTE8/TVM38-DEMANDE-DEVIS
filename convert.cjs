const fs = require('fs');
const content = fs.readFileSync('tsc_errors.txt', 'utf16le');
fs.writeFileSync('errors.txt', content.split('\n').filter(l => l.includes('error TS')).join('\n'), 'utf8');
