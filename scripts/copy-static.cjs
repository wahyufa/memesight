const fs = require('fs');
const path = require('path');
const files = ['memesight.html','call.html','token.html','candidates.html','scanner-config.js'];
files.forEach(f => {
  try { fs.copyFileSync(f, path.join('dist', f)); console.log('copied', f); }
  catch(e) { console.warn('skip', f, e.message); }
});

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
  console.log('copied', src);
}

copyDir(path.join('src', 'img'), path.join('dist', 'src', 'img'));
