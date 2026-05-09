import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true  // 端口被占用时报错，不自动切换，确保localStorage数据一致
  }
})