<script setup lang="ts">
import screenfull from "screenfull";
import { gsap } from "gsap";
import FullScreen from "@/components/fullscreen/FullScreen.vue";
import { navLink } from "@/components/nav/navLink";
import { useHomeWaveCanvas } from "./useHomeWaveCanvas";
import { baseUrl } from "@/config/constants";

const fullScreenRef = ref<InstanceType<typeof FullScreen> | null>(null);
const skipRef = ref<HTMLElement | null>(null);


const homeInRef = ref<HTMLElement | null>(null);
const homeContentTitleRef = ref<HTMLElement | null>(null);
const navItemsRef = ref<HTMLElement | null>(null);
// @ts-expect-error - 這些 ref 在模板中使用（第 55、59 行），但 linter 無法識別
const { homeWaveCanvasRef, homeWaveCanvasBackRef } = useHomeWaveCanvas();
const animationStart = ref(true);


let homeTl = gsap.timeline();
const homeAnimation = () => {
    animationStart.value = false;
    homeTl
        .addLabel("start")
        .to(skipRef.value, {
            opacity: 1,
            duration: 0.1,
            ease: "power2.inOut"
        })
        .to(
            fullScreenRef.value?.fullRef || null,
            {
                opacity: 0,
                display: "none",
                duration: 1
            },
            "<"
        )
        .to(
            homeInRef.value,
            {
                maskPosition: "50% 40%",
                duration: 2
            },
            "<0.25"
        )
        .call(() => {
            homeContentTitleRef.value?.classList.add("ani-start");
        }, undefined, "<")
        .fromTo(
            homeContentTitleRef.value,
            {
                opacity: 0,
                yPercent: 30
            },
            {
                opacity: 1,
                yPercent: 0,
                duration: 1.5,
                ease: "power2.Out"
            },
            "start+=0.8"
        )
        .fromTo(
            navItemsRef.value,
            {
                opacity: 0,
                yPercent: 30
            },
            {
                opacity: 1,
                yPercent: 0,
                duration: 1.5,
                stagger: {
                    amount: 0.3,
                    from: "center"
                },
                ease: "power4.Out"
            },
            ">-0.8"
        )

};
const handleClose = () => {
    if (screenfull.isEnabled) {
        screenfull.exit();
    }
};

const maskImageUrl = `${baseUrl}images/home/mask-img.svg`;
const logoMaskImageUrl = `url(${baseUrl}images/logo.png)`;

// 為 navLink 添加 pathName 值
const navLinkWithPathName = computed(() => {
    return navLink.map((item) => {
        return {
            ...item,
            pathName: item.pathName || (item.child && item.child[0]?.pathName) || ""
        };
    });
});
</script>
<template>
    <main id="home">
        <div class="home-bg">
            <video
                class="home-bg-video"
                :src="`${baseUrl}images/home/home-bg-video.mp4`"
                autoplay
                muted
                loop></video>
            <img :src="`${baseUrl}images/home/home-bg.jpg`" alt="home-bg" />
        </div>
        <FullScreen ref="fullScreenRef" @home-Animation="homeAnimation" />

        <div
            ref="homeInRef"
            class="home-in"
            :style="`mask-image: url(${maskImageUrl})`">
            <div ref="homeWaveRef" class="home-wave">
                <div class="home-wave-container">
                    <!-- 後景 canvas（反向，速度慢，模糊） -->
                    <canvas
                        ref="homeWaveCanvasBackRef"
                        class="home-wave-canvas home-wave-canvas-back"></canvas>
                    <!-- 前景 canvas（正向，速度快） -->
                    <canvas
                        ref="homeWaveCanvasRef"
                        class="home-wave-canvas home-wave-canvas-front"></canvas>
                </div>
            </div>

            <div class="home-content">
                <div class="home-content-inner">
                    <div ref="homeContentTitleRef" class="home-content-title" :style="`mask-image: ${logoMaskImageUrl}`">
                        <img
                            :src="`${baseUrl}images/logo.png`"
                            alt="home-in-content-title" />
                        <div class="light"></div>
                    </div>
                    <nav class="home-content-nav">
                        <ul class="home-content-nav-list">
                            <li
                                ref="navItemsRef"
                                class="home-content-nav-item"
                                v-for="(item, index) in navLinkWithPathName"
                                :key="index">
                                <router-link
                                    :to="{ name: item.pathName }"
                                    class="home-content-nav-link">
                                    <span class="zh-name ff-noto-serif-tc">
                                        {{ item.zhName }}
                                    </span>
                                    <span class="en-name ff-cormorant-infant">
                                        {{ item.name }}
                                    </span>
                                </router-link>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </div>

        <div class="home-skip" ref="skipRef">
            <span class="home-close-in" @click.stop="handleClose">
                <div class="window-line">
                    <span class="line line-1"></span>
                    <span class="line line-2"></span>
                </div>
            </span>
        </div>
    </main>
</template>
<style scoped>
@import "../../assets/scss/home/home.scss";
</style>
