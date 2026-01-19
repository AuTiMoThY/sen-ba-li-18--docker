<script setup lang="ts">
import ImageZoomViewer from "@/components/image-zoom/ImageZoomViewer.vue";
import { baseUrl } from "@/config/constants";

const route = useRoute();
const floor = route.query.q as string;

const floorTitle = computed(() => {
    return floor.replace(/f/g, "F");
});
console.log(floorTitle.value);

const floorPlanImage = `${baseUrl}images/floor_plan/${floorTitle.value}.webp`;
</script>
<template>
    <div id="floor-main" class="page-wrapper">
        <main id="floor-page" class="page-main">
            <div class="floor-pattern">
                <img :src="`${baseUrl}images/floor-pattern.png`" alt="">
            </div>
            <div class="floor-col floor-left">
                <div class="floor-col-inner">
                    <div class="floor-text">
                        <h2 class="title ff-jost">{{ floorTitle }}</h2>
                        <div class="subtitle-box">
                            <span class="subtitle ff-noto-serif-tc">
                                平面配置參考圖
                            </span>
                            <small class="small ff-noto-serif-tc-">
                                OVERALL FLOOR PLAN
                            </small>
                        </div>
                    </div>
                </div>
            </div>
            <div class="floor-col floor-right">
                <div class="floor-col-inner">
                    <div class="img-box">
                        <ImageZoomViewer
                            :image-src="floorPlanImage"
                            image-alt="平面圖"
                            :min-scale="0.5"
                            :max-scale="5"
                            :step="0.25"
                            :floor="floorTitle" />
                    </div>
                </div>
            </div>
        </main>
        <Nav />
    </div>
</template>
<style scoped>
@import "../../assets/scss/building/FloorPage.scss";
</style>
