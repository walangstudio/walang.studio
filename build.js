const fs   = require('fs');
const path = require('path');

const { minify: minifyJS }   = require('terser');
const CleanCSS               = require('clean-css');
const { minify: minifyHTML } = require('html-minifier-terser');

function copyDir(src, dest, ignore = []) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (ignore.includes(entry.name)) continue;
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, ignore);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function build() {
  fs.rmSync('dist', { recursive: true, force: true });
  fs.mkdirSync('dist/api', { recursive: true });

  // JS
  const jsIn  = fs.readFileSync('script.js', 'utf8');
  const jsOut = await minifyJS(jsIn, { compress: true, mangle: true });
  fs.writeFileSync('dist/script.js', jsOut.code);
  console.log('script.js');

  // CSS
  const cssIn  = fs.readFileSync('styles.css', 'utf8');
  const cssOut = new CleanCSS({ level: 2 }).minify(cssIn);
  fs.writeFileSync('dist/styles.css', cssOut.styles);
  console.log('styles.css');

  // HTML
  const htmlIn  = fs.readFileSync('index.html', 'utf8');
  const htmlOut = await minifyHTML(htmlIn, {
    collapseWhitespace:    true,
    removeComments:        true,
    minifyCSS:             true,
    minifyJS:              true,
    removeAttributeQuotes: true,
  });
  fs.writeFileSync('dist/index.html', htmlOut);
  console.log('index.html');

  // .htaccess
  fs.copyFileSync('.htaccess', 'dist/.htaccess');
  console.log('.htaccess');

  // PHP api/
  for (const f of fs.readdirSync('api')) {
    fs.copyFileSync(path.join('api', f), path.join('dist/api', f));
    console.log('api/' + f);
  }

  // backend/
  copyDir('backend', 'dist/backend');
  console.log('backend/');

  // _puwit/ — skip .env and tests (environment-specific / dev-only)
  copyDir('_puwit', 'dist/_puwit', ['.env', 'tests']);
  console.log('_puwit/');

  console.log('\ndist/ ready');
  console.log('Remember to create on server:');
  console.log('  _puwit/.env — DB_DRIVER, JWT_SECRET, CORS_ORIGINS');
}

build().catch(err => { console.error(err); process.exit(1); });
