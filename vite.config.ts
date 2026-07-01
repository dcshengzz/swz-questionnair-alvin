import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react(), dts({ rollupTypes: false, insertTypesEntry: true, exclude: ['tests/**'] })],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        runtime: resolve(__dirname, 'src/runtime/index.ts'),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'antd',
        /^@ant-design\//,
        'dayjs',
        /^dayjs\//,
      ],
    },
    sourcemap: true,
    target: 'es2022',
  },
});
