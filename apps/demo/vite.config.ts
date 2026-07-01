import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const designerSrc = path.resolve(__dirname, '../../packages/designer/src');

// Self-signed cert so the demo runs on a secure context over the LAN —
// camera / MediaRecorder / BarcodeDetector APIs refuse to load on plain HTTP
// origins (only localhost is exempted).
const certDir = path.join(__dirname, '.certs');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');
const httpsOpts = fs.existsSync(keyPath) && fs.existsSync(certPath)
  ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
  : undefined;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@qnn/designer/style.css', replacement: path.join(designerSrc, 'designer/styles.css') },
      { find: '@qnn/designer/runtime', replacement: path.join(designerSrc, 'runtime/index.ts') },
      { find: '@qnn/designer', replacement: path.join(designerSrc, 'index.ts') },
    ],
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    ...(httpsOpts ? { https: httpsOpts } : {}),
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
    ...(httpsOpts ? { https: httpsOpts } : {}),
  },
});
