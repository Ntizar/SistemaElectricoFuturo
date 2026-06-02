// postbuild.js — Reemplaza /js/ por js/ en el HTML generado por Vite
// Vite no transforma scripts de página (IIFEs sin type="module"),
// así que las referencias /js/... no se actualizan.
// Este script lo hace manualmente.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const htmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(htmlPath)) {
    console.error('Error: dist/index.html no existe');
    process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf-8');

// Reemplazar /js/ por js/ en el HTML
html = html.replace(/src="\/js\//g, 'src="js/');
html = html.replace(/href="\/css\//g, 'href="css/');

fs.writeFileSync(htmlPath, html);
console.log('Post-build: referencias transformadas correctamente');
