#!/usr/bin/env node
/**
 * Stub módulos Node-only puxados pelo Azure Cognitive Speech SDK que
 * o esbuild do Angular 20 não consegue tree-shake (https-proxy-agent +
 * agent-base aninhados, versão 4.x antiga sem `browser` field).
 *
 * O SDK marca esses módulos como `browser: false` no seu próprio
 * package.json — em runtime browser eles NUNCA são chamados. Mas o
 * esbuild ainda tenta resolver os requires `assert`, `https`, `util`.
 *
 * Solução: sobrescrever os index.js dos dois pacotes aninhados com
 * stubs vazios. Roda automaticamente em `npm install` via `postinstall`.
 */
const fs = require('node:fs');
const path = require('node:path');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const STUBS = [
  {
    file: path.join(
      FRONTEND_ROOT,
      'node_modules/microsoft-cognitiveservices-speech-sdk/node_modules/https-proxy-agent/index.js',
    ),
    content:
      '// Stubado por scripts/patch-azure-sdk.js — SDK marca este módulo como browser:false\n' +
      'module.exports = function() { return null; };\n' +
      'module.exports.HttpsProxyAgent = function() { return null; };\n',
  },
  {
    file: path.join(
      FRONTEND_ROOT,
      'node_modules/microsoft-cognitiveservices-speech-sdk/node_modules/agent-base/dist/index.js',
    ),
    content:
      '// Stubado por scripts/patch-azure-sdk.js\n' +
      'module.exports = { Agent: function() {} };\n',
  },
];

let patched = 0;
for (const { file, content } of STUBS) {
  if (!fs.existsSync(file)) continue; // SDK não instalado ainda
  try {
    fs.writeFileSync(file, content, 'utf8');
    patched++;
  } catch (err) {
    console.error(`[patch-azure-sdk] falhou em ${file}: ${err.message}`);
  }
}
if (patched > 0) {
  console.log(`[patch-azure-sdk] ${patched} stub(s) aplicado(s).`);
}
