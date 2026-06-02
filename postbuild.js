// postbuild.js — Copia scripts JS/CSS/SW al dist/ y transforma referencias en HTML
// Vite no transforma scripts IIFE (sin type="module"), así que los copiamos manualmente.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const srcJsDir = path.join(__dirname, 'js');
const srcCssDir = path.join(__dirname, 'css');

// Leer el HTML generado por Vite
const htmlPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');

// Lista de scripts JS a copiar
const jsFiles = [
    'constants.js', 'theme.js', 'nuclear.js', 'weather.js',
    'demand.js', 'storage.js', 'policy.js', 'scenarios.js',
    'simulator.js', 'montecarlo.js', 'trajectory.js',
    'charts.js', 'ree-data.js', 'app.js',
];

// Copiar JS a dist/js/
fs.mkdirSync(path.join(distDir, 'js'), { recursive: true });
for (const jsFile of jsFiles) {
    const src = path.join(srcJsDir, jsFile);
    const dest = path.join(distDir, 'js', jsFile);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
    }
}

// Copiar CSS a dist/css/
fs.mkdirSync(path.join(distDir, 'css'), { recursive: true });
const cssFiles = ['ntizar.css', 'app.css', 'ree-data.css'];
for (const cssFile of cssFiles) {
    const src = path.join(srcCssDir, cssFile);
    const dest = path.join(distDir, 'css', cssFile);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
    }
}

// Copiar Service Worker a dist/
const swSrc = path.join(__dirname, 'sw.js');
const swDest = path.join(distDir, 'sw.js');
if (fs.existsSync(swSrc)) {
    fs.copyFileSync(swSrc, swDest);
    console.log('Post-build: sw.js copiado a dist/');
}

// Copiar favicon.svg si existe
const favSrc = path.join(__dirname, 'favicon.svg');
const favDest = path.join(distDir, 'favicon.svg');
if (fs.existsSync(favSrc)) {
    fs.copyFileSync(favSrc, favDest);
    console.log('Post-build: favicon.svg copiado a dist/');
}

// Reemplazar las referencias en el HTML
html = html.replace(/src="\/js\//g, 'src="js/');
html = html.replace(/href="\/css\//g, 'href="css/');

fs.writeFileSync(htmlPath, html);
console.log('Post-build: JS, CSS y SW copiados, referencias transformadas');
