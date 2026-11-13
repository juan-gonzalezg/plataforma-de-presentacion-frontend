import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import { RobotAvatar } from '../src/components/RobotAvatar';

const moods = [
  'idle_atento',
  'empujar_pantalla',
  'apuntar_puntero',
  'buscar_antena',
  'sin_senal',
  'celebrar'
] as const;

const cards = moods
  .map(
    (mood) => `
    <div class="card">
      <div class="robot">${renderToStaticMarkup(
        <RobotAvatar mood={mood} size="hero" />
      )}</div>
      <p>${mood}</p>
    </div>`
  )
  .join('');

const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Logos · vista previa</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
        padding: 32px;
        background: radial-gradient(circle at 50% 0%, #0f172a 0%, #020617 65%);
        color: #e2e8f0;
        font-family: system-ui, sans-serif;
      }
      .card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 24px;
        border: 1px solid #1e293b;
        border-radius: 24px;
        background: rgba(15, 23, 42, 0.65);
      }
      .robot > div { display: inline-flex; flex-direction: column; align-items: center; }
      .robot svg { width: 208px; height: 208px; }
      p { margin: 0; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #67e8f9; }
    </style>
  </head>
  <body>${cards}</body>
</html>`;

writeFileSync('scripts/.tmp-preview-robot.html', html, 'utf8');
console.log('preview written');
