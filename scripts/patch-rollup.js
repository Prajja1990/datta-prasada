import fs from 'fs';
import path from 'path';

try {
  const sourceWasm = path.resolve('node_modules/@rollup/wasm-node/dist/wasm-node');
  const sourceNative = path.resolve('node_modules/@rollup/wasm-node/dist/native.js');
  const targetWasm = path.resolve('node_modules/rollup/dist/wasm-node');
  const targetNative = path.resolve('node_modules/rollup/dist/native.js');

  if (fs.existsSync(sourceWasm) && fs.existsSync(path.dirname(targetWasm))) {
    fs.cpSync(sourceWasm, targetWasm, { recursive: true, force: true });
    fs.copyFileSync(sourceNative, targetNative);
    console.log('[Datta Prasada] Rollup WASM bindings verified.');
  }
} catch (e) {
  // Ignore in environments where native rollup is allowed
}
