const fs   = require('fs');
const path = require('path');

const { minify: minifyJS }   = require('terser');
const CleanCSS               = require('clean-css');
const { minify: minifyHTML } = require('html-minifier-terser');

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

  // PHP — copy as-is
  for (const f of fs.readdirSync('api')) {
    fs.copyFileSync(path.join('api', f), path.join('dist/api', f));
    console.log('api/' + f);
  }

  console.log('\ndist/ ready');
}

build().catch(err => { console.error(err); process.exit(1); });
