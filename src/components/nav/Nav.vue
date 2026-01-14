<script setup lang="ts">
import screenfull from "screenfull";
import { nanoid } from "nanoid";
import { navLink } from "@/components/nav/navLink";
import { baseUrl } from "@/config/constants";
const navRef = ref<HTMLElement | null>(null);
const navChildBgRef = ref<HTMLElement | null>(null);

const navHeight = ref<number | undefined>(undefined);
const navChildHeight = ref<number | undefined>(undefined);

// 更新高度值並設置 CSS 變數
const updateNavHeights = () => {
    if (!navRef.value) return;

    // 讀取 nav 高度
    navHeight.value = navRef.value.clientHeight;

    // 讀取所有 .nav-child 元素的高度，取最大值
    const allNavChildren = navRef.value.querySelectorAll(
        ".nav-child"
    ) as NodeListOf<HTMLElement>;
    let maxHeight = 0;

    if (allNavChildren.length > 0) {
        const firstChild = allNavChildren[0];
        if (firstChild) {
            const wasVisible = firstChild.classList.contains("show");

            // 臨時顯示第一個 nav-child 來讀取其真實高度
            if (!wasVisible) {
                firstChild.classList.add("show");
                void firstChild.offsetHeight; // 強制重新計算
            }

            // 讀取所有元素的高度
            allNavChildren.forEach((child) => {
                const height =
                    child.offsetHeight ||
                    child.scrollHeight ||
                    child.getBoundingClientRect().height;
                if (height > maxHeight) {
                    maxHeight = height;
                }
            });

            // 恢復原始狀態
            if (!wasVisible) {
                firstChild.classList.remove("show");
            }
        }
    }

    navChildHeight.value = maxHeight || 0;

    // 設置 CSS 變數
    if (navHeight.value !== undefined) {
        document.documentElement.style.setProperty(
            "--nav-height",
            `${navHeight.value}px`
        );
    }
    if (navChildHeight.value !== undefined) {
        document.documentElement.style.setProperty(
            "--nav-child-height",
            `${navChildHeight.value}px`
        );
    }
};

// 防抖更新函數
let resizeTimer: ReturnType<typeof setTimeout> | null = null;
const debouncedUpdate = () => {
    if (resizeTimer) {
        clearTimeout(resizeTimer);
    }
    resizeTimer = setTimeout(() => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                updateNavHeights();
            });
        });
    }, 300);
};

const exitFullscreen = () => {
    if (screenfull.isEnabled) {
        screenfull.exit();
    }
};

const toggleFullscreen = () => {
    if (screenfull.isEnabled) {
        screenfull.toggle();
    }
};

// 事件監聽器清理函數
let handleClickOutside: ((e: Event) => void) | null = null;
let resizeObserver: ResizeObserver | null = null;

// 顯示指定的子選單
const showNavChild = (navChild: HTMLElement) => {
    if (!navChildBgRef.value) return;

    // 先隱藏所有子選單
    hideAllNavChildren();

    // 顯示背景和當前子選單
    navChildBgRef.value.classList.add("show");
    navChild.classList.add("show");
};

// 隱藏所有子選單和背景
const hideAllNavChildren = () => {
    if (!navRef.value || !navChildBgRef.value) return;

    const allNavChildren = navRef.value.querySelectorAll(".nav-child");
    allNavChildren.forEach((child) => {
        child.classList.remove("show");
    });
    navChildBgRef.value.classList.remove("show");
};

onMounted(() => {
    // 初始化高度
    updateNavHeights();

    // 監聽 window resize
    window.addEventListener("resize", debouncedUpdate);

    // 使用 ResizeObserver 監聽 nav 和 nav-child 元素的實際尺寸變化
    nextTick(() => {
        if (!navRef.value) return;

        resizeObserver = new ResizeObserver(debouncedUpdate);
        resizeObserver.observe(navRef.value);

        // 監聽所有 nav-child 元素
        const allNavChildren = navRef.value.querySelectorAll(".nav-child");
        allNavChildren.forEach((child) => {
            resizeObserver?.observe(child as HTMLElement);
        });
    });

    // 處理 .nav-child-bg 和 .nav-child 的顯示/隱藏
    nextTick(() => {
        if (!navRef.value || !navChildBgRef.value) return;

        const isTouchDevice = "ontouchstart" in window;
        const menuItems = navRef.value.querySelectorAll(".nav-menu-item");

        // 點擊外部區域時隱藏所有子選單（觸控設備）
        handleClickOutside = (e: Event) => {
            if (!isTouchDevice) return;

            const target = e.target as HTMLElement;
            const clickedInsideNav = navRef.value?.contains(target);

            if (!clickedInsideNav) {
                hideAllNavChildren();
            }
        };

        if (isTouchDevice) {
            document.addEventListener("click", handleClickOutside);
        }

        menuItems.forEach((item) => {
            const navChild = item.querySelector(
                ".nav-child"
            ) as HTMLElement | null;
            if (!navChild) return;

            if (isTouchDevice) {
                // 觸控設備：點擊顯示子選單
                item.addEventListener("click", (e) => {
                    e.stopPropagation(); // 防止觸發外部點擊事件
                    showNavChild(navChild);
                });
            } else {
                // 非觸控設備：滑鼠 hover 顯示/隱藏
                item.addEventListener("mouseenter", () => {
                    showNavChild(navChild);
                });
                item.addEventListener("mouseleave", () => {
                    hideAllNavChildren();
                });
            }
        });
    });
});

onUnmounted(() => {
    if (handleClickOutside) {
        document.removeEventListener("click", handleClickOutside);
    }
    window.removeEventListener("resize", debouncedUpdate);
    if (resizeObserver) {
        resizeObserver.disconnect();
    }
    if (resizeTimer) {
        clearTimeout(resizeTimer);
    }
});
</script>
<template>
    <nav id="nav" ref="navRef">
        <div class="nav-child-bg" ref="navChildBgRef"></div>
        <div class="nav-container">
            <div class="nav-col nav-icon">
                <router-link :to="{ name: 'home' }" class="nav-icon-link">
                    <img
                        :src="`${baseUrl}images/nav-icon.png`"
                        alt="nav-icon" />
                </router-link>
            </div>
            <div class="nav-col nav-menu">
                <ul class="nav-menu-list">
                    <li
                        v-for="item in navLink"
                        class="nav-menu-item"
                        :key="nanoid()">
                        <div class="nav-menu-item-inner">
                            <router-link
                                v-if="item.pathName"
                                :to="{ name: item.pathName }"
                                class="nav-menu-item-link">
                                <span class="zh-name ff-noto-serif-tc">
                                    {{ item.zhName }}
                                </span>
                                <span class="en-name ff-microsoft-jhenghei">
                                    {{ item.name }}
                                </span>
                            </router-link>
                            <p v-else class="nav-menu-item-link">
                                <span class="zh-name ff-noto-serif-tc">
                                    {{ item.zhName }}
                                </span>
                                <span class="en-name ff-microsoft-jhenghei">
                                    {{ item.name }}
                                </span>
                            </p>
                        </div>
                        <div
                            ref="navChildRef"
                            class="nav-child"
                            v-if="item.child && item.child.length > 0">
                            <template
                                v-for="child in item.child"
                                :key="nanoid()">
                                <router-link
                                    v-if="child.pathName"
                                    :to="{ name: child.pathName }"
                                    class="nav-child-link">
                                    <span class="zh-name ff-microsoft-jhenghei">
                                        {{ child.zhName }}
                                    </span>
                                </router-link>
                                <p v-else class="nav-child-link">
                                    <span class="zh-name ff-microsoft-jhenghei">
                                        {{ child.zhName }}
                                    </span>
                                </p>
                            </template>
                        </div>
                    </li>
                    <li class="nav-menu-item">
                        <div class="exit-fullscreen" @click="exitFullscreen">
                            <span class="en-name ff-noto-serif-tc">ESC</span>
                        </div>
                    </li>
                    <li class="nav-menu-item">
                        <div
                            class="toggle-fullscreen"
                            @click="toggleFullscreen">
                            <div class="img-box">
                                <img
                                    :src="`${baseUrl}images/toggle-fullscreen.svg`"
                                    alt="" />
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
</template>

<style scoped>
@import "../../assets/scss/nav/nav.scss";
</style>
