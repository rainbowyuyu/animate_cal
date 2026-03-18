import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  root: ".",
  // 让 Vite 直接使用后端项目里的 html_root/static 作为静态资源根目录
  // 这样 /static/css/main.css 等路径在开发环境下也能正常访问，样式不会丢失
  publicDir: "../html_root",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "index.html"
    }
  },
  server: {
    port: 5173
  }
});

