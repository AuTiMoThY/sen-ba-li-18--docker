<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import FadeIn from "@/components/transition/FadeIn.vue";

const handleResize = () => {
    // 使用 requestAnimationFrame 確保在瀏覽器完成渲染後再讀取尺寸
    requestAnimationFrame(() => {
        // 1. 計算並儲存視窗寬度
        const vw = window.innerWidth || document.documentElement.clientWidth || document.documentElement.offsetWidth;
        (window as any).vw = vw;

        // 設置 CSS 自定義屬性，可在 CSS 中使用 var(--vw)
        document.documentElement.style.setProperty("--vw", `${vw}px`);

        // 2. 計算 Large Viewport Height (移動端大視窗高度)
        const tempDiv = document.createElement("div");
        tempDiv.style.height = "100dvh";
        tempDiv.style.position = "fixed";
        tempDiv.style.visibility = "hidden";
        document.body.append(tempDiv);

        const dvh = tempDiv.offsetHeight;
        (window as any).dvh = dvh;

        tempDiv.remove();

        // 設置 CSS 自定義屬性
        document.documentElement.style.setProperty("--dvh", `${dvh}px`);

    });
};

onMounted(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    // 也監聽 orientationchange 事件（移動端旋轉）
    window.addEventListener("orientationchange", handleResize);
});

onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("orientationchange", handleResize);
});
</script>

<template>
    <router-view v-slot="{ Component, route }">
        <FadeIn>
            <component :is="Component" :key="route.path"></component>
        </FadeIn>
    </router-view>
</template>

<style scoped></style>
