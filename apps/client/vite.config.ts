import { defineConfig } from 'vite';
export default defineConfig({server: {host: '127.0.0.1', port: 5173, strictPort: true, proxy:{'/api':'http://127.0.0.1:2567'}},
  build: {assetsInlineLimit:0,rolldownOptions: {output: {manualChunks: id => id.includes('/phaser/') ? 'phaser' : undefined}}}});
