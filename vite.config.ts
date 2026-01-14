import { defineConfig } from "vite";
import { fileURLToPath, URL } from "url";

import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

// https://vite.dev/config/
export default defineConfig({
    base: "./",
    plugins: [
        vue(),
        AutoImport({
            imports: ["vue", "vue-router", "pinia"],
            resolvers: [ElementPlusResolver()],
            dts: true
        }),
        Components({
            resolvers: [ElementPlusResolver()]
        })
    ],
    resolve: {
        alias: [
            {
                find: "@",
                replacement: fileURLToPath(new URL("./src", import.meta.url))
            }
        ]
    },
    assetsInclude: ["**/*.png", "**/*.jpg", "**/*.jpeg", "**/*.gif", "**/*.svg"],
    css: {
        preprocessorOptions: {
            scss: {
                silenceDeprecations: ["import"]
            }
        }
    },
    server: {
        host: "0.0.0.0", // 監聽所有網路介面，允許區網內其他設備訪問
        port: 5173, // 可選：指定端口號
        strictPort: false // 如果端口被占用，自動嘗試下一個可用端口
    }
});
