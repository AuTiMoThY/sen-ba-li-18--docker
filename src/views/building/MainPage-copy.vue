<script setup lang="ts">
import Nav from "@/components/nav/Nav.vue";
import ImageZoomViewer from "@/components/image-zoom/ImageZoomViewer.vue";
import { baseUrl } from "@/config/constants";

// 平面圖圖片路徑（請替換為實際的平面圖路徑）
const floorPlanImage = `${baseUrl}images/temp-bg.jpg`;
</script>
<template>
    <div id="building-Page" class="page-wrapper">
        <main id="building-page" class="page-main">
            <ImageZoomViewer
                :image-src="floorPlanImage"
                image-alt="平面圖"
                :min-scale="0.5"
                :max-scale="5"
                :step="0.25" />
            <h1 class="page-title">匠心建築</h1>
        </main>
        <Nav />
    </div>
</template>
<style lang="scss" scoped>
.page-main {
    position: relative;
    width: 100%;
    height: 100%;
}

.page-title {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 20;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    pointer-events: none;
}
</style>
