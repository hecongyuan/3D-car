import vue from '@vitejs/plugin-vue'
import nodeCrypto, { createHash } from 'node:crypto'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // 生产环境移除console
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // 移除所有console语句
        drop_debugger: true, // 移除debugger语句
      },
    },
    // 优化chunk分割
    rollupOptions: {
      output: {
        manualChunks: {
          // 将Three.js单独打包
          'three-vendor': ['three'],
          // 将Vue相关库单独打包
          'vue-vendor': ['vue'],
        },
      },
    },
  },
})

const cryptoAny = nodeCrypto as unknown as {
  hash?: (algorithm: string, data: string, encoding?: any) => string
}

if (typeof cryptoAny.hash !== 'function') {
  cryptoAny.hash = (algorithm: string, data: string, encoding = 'hex') => {
    return createHash(algorithm).update(data).digest(encoding)
  }
}
