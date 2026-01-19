<script setup lang="ts">
import Nav from "@/components/nav/Nav.vue";
import ImageZoomViewer from "@/components/image-zoom/ImageZoomViewer.vue";
import { baseUrl } from "@/config/constants";

// 平面圖圖片路徑（請替換為實際的平面圖路徑）
const floorPlanImage = `${baseUrl}images/temp-bg.jpg`;

const floorList = [
    {
        label: "10F",
        to: "/building/floor?q=10f"
    },
    {
        label: "3F-9F",
        to: "/building/floor?q=3f-9f"
    },
    {
        label: "2F",
        to: "/building/floor?q=2f"
    },
    {
        label: "1F",
        to: "/building/floor?q=1f"
    },
    {
        label: "B1",
        to: "/building/floor?q=b1"
    }
];
</script>
<template>
    <div id="building-main" class="page-wrapper">
        <main id="building-page" class="page-main">
            <img
                :src="`${baseUrl}images/temp-bg.jpg`"
                class="building-img"
                alt="" />
            <small class="img-caption ff-microsoft-jhenghei">
                3D外觀示意圖
            </small>
            <div class="floor_box">
                <div class="floor_box-inner">
                    <div class="title ff-cormorant-garamond">FLOOR</div>
                    <ul class="floor_list ff-jost">
                        <li
                            v-for="item in floorList"
                            :key="item.label"
                            class="floor_item">
                            <router-link :to="item.to" class="floor_item-link">
                                <div class="txt">
                                    {{ item.label }}
                                </div>
                            </router-link>
                        </li>
                    </ul>
                </div>
            </div>
        </main>
        <Nav />
    </div>
</template>
<style scoped>
@import "../../assets/scss/building/MainPage.scss";
</style>
