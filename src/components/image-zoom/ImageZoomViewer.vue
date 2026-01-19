<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

interface Props {
    imageSrc: string;
    imageAlt?: string;
    minScale?: number;
    maxScale?: number;
    step?: number;
    floor?: string;
}

const props = withDefaults(defineProps<Props>(), {
    imageAlt: "圖片",
    minScale: 0.5,
    maxScale: 5,
    step: 0.25,
    floor: ""
});

const containerRef = ref<HTMLElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
const currentScale = ref(1);
const currentX = ref(0);
const currentY = ref(0);

// 拖曳相關狀態
const isDragging = ref(false);
const startX = ref(0);
const startY = ref(0);
const initialX = ref(0);
const initialY = ref(0);

// 更新圖片變換
const updateTransform = () => {
    if (!imageRef.value) return;
    imageRef.value.style.transform = `translate(${currentX.value}px, ${currentY.value}px) scale(${currentScale.value})`;
};

// 限制平移範圍
const constrainPosition = () => {
    if (!imageRef.value || !containerRef.value) return;

    const img = imageRef.value;
    const container = containerRef.value;
    const scaledWidth = img.offsetWidth * currentScale.value;
    const scaledHeight = img.offsetHeight * currentScale.value;

    const maxX = Math.max(0, (scaledWidth - container.offsetWidth) / 2);
    const maxY = Math.max(0, (scaledHeight - container.offsetHeight) / 2);

    currentX.value = Math.max(-maxX, Math.min(maxX, currentX.value));
    currentY.value = Math.max(-maxY, Math.min(maxY, currentY.value));

    updateTransform();
};

// 放大
const zoomIn = () => {
    if (currentScale.value >= props.maxScale) return;

    const oldScale = currentScale.value;
    currentScale.value = Math.min(
        currentScale.value + props.step,
        props.maxScale
    );

    // 以中心點縮放
    if (containerRef.value && imageRef.value) {
        const container = containerRef.value;
        const rect = container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const scaleChange = currentScale.value / oldScale;
        currentX.value = centerX - (centerX - currentX.value) * scaleChange;
        currentY.value = centerY - (centerY - currentY.value) * scaleChange;
    }

    constrainPosition();
};

// 縮小
const zoomOut = () => {
    if (currentScale.value <= props.minScale) return;

    const oldScale = currentScale.value;
    currentScale.value = Math.max(
        currentScale.value - props.step,
        props.minScale
    );

    // 以中心點縮放
    if (containerRef.value && imageRef.value) {
        const container = containerRef.value;
        const rect = container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const scaleChange = currentScale.value / oldScale;
        currentX.value = centerX - (centerX - currentX.value) * scaleChange;
        currentY.value = centerY - (centerY - currentY.value) * scaleChange;
    }

    constrainPosition();
};

// 重置
const reset = () => {
    currentScale.value = 1;
    currentX.value = 0;
    currentY.value = 0;
    updateTransform();
};

// 滑鼠事件處理
const handleMouseDown = (e: MouseEvent) => {
    if (currentScale.value <= 1) return; // 只有在放大時才能拖曳

    isDragging.value = true;
    startX.value = e.clientX;
    startY.value = e.clientY;
    initialX.value = currentX.value;
    initialY.value = currentY.value;

    if (containerRef.value) {
        containerRef.value.style.cursor = "grabbing";
    }
};

const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.value) return;

    const deltaX = e.clientX - startX.value;
    const deltaY = e.clientY - startY.value;

    currentX.value = initialX.value + deltaX;
    currentY.value = initialY.value + deltaY;

    constrainPosition();
};

const handleMouseUp = () => {
    isDragging.value = false;
    if (containerRef.value) {
        containerRef.value.style.cursor =
            currentScale.value > 1 ? "grab" : "default";
    }
};

// 觸控事件處理
const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1 && currentScale.value > 1) {
        // 單指拖曳
        isDragging.value = true;
        startX.value = e.touches[0].clientX;
        startY.value = e.touches[0].clientY;
        initialX.value = currentX.value;
        initialY.value = currentY.value;
    } else if (e.touches.length === 2) {
        // 雙指縮放
        e.preventDefault();
    }
};

const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1 && isDragging.value) {
        // 單指拖曳
        const deltaX = e.touches[0].clientX - startX.value;
        const deltaY = e.touches[0].clientY - startY.value;

        currentX.value = initialX.value + deltaX;
        currentY.value = initialY.value + deltaY;

        constrainPosition();
    } else if (e.touches.length === 2) {
        // 雙指縮放
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        const distance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );

        if (!imageRef.value) return;
        const initialDistance =
            (imageRef.value as any).initialDistance || distance;
        (imageRef.value as any).initialDistance = distance;

        const scaleChange = distance / initialDistance;
        const newScale = currentScale.value * scaleChange;

        if (newScale >= props.minScale && newScale <= props.maxScale) {
            currentScale.value = newScale;
            constrainPosition();
        }
    }
};

const handleTouchEnd = () => {
    isDragging.value = false;
    if (imageRef.value) {
        (imageRef.value as any).initialDistance = null;
    }
};

// 滾輪縮放
const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const delta = e.deltaY > 0 ? -props.step : props.step;
    const oldScale = currentScale.value;
    const newScale = Math.max(
        props.minScale,
        Math.min(props.maxScale, currentScale.value + delta)
    );

    if (newScale === oldScale) return;

    currentScale.value = newScale;

    // 以滑鼠位置為中心縮放
    if (containerRef.value && imageRef.value) {
        const container = containerRef.value;
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scaleChange = newScale / oldScale;
        currentX.value = mouseX - (mouseX - currentX.value) * scaleChange;
        currentY.value = mouseY - (mouseY - currentY.value) * scaleChange;
    }

    constrainPosition();
};

// 鍵盤快捷鍵
const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
    } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
    } else if (e.key === "0") {
        e.preventDefault();
        reset();
    }
};

// 圖片載入完成後初始化
const handleImageLoad = () => {
    reset();
};

onMounted(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    if (containerRef.value) {
        containerRef.value.addEventListener("wheel", handleWheel, {
            passive: false
        });
    }
});

onUnmounted(() => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("keydown", handleKeyDown);

    if (containerRef.value) {
        containerRef.value.removeEventListener("wheel", handleWheel);
    }
});
</script>

<template>
    <div class="image-zoom-viewer">
        <div
            ref="containerRef"
            class="image-zoom-container"
            :class="{ 'is-dragging': isDragging }"
            @mousedown="handleMouseDown"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd">
            <div class="img-box">
                <img
                    ref="imageRef"
                    class="zoom-image"
                    :src="imageSrc"
                    :alt="imageAlt"
                    @load="handleImageLoad"
                    draggable="false" />

                <div class="floor-point">A</div>
            </div>

            <span class="text ff-microsoft-jhenghei"
                >本圖面配置僅供參考，實際規劃以合約內容附圖為準</span
            >
        </div>

        <div class="zoom-controls">
            <button
                class="zoom-btn zoom-in"
                @click="zoomIn"
                :disabled="currentScale >= maxScale"
                aria-label="放大">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 42.24 42.24">
                    <rect
                        x=".38"
                        y=".38"
                        width="41.49"
                        height="41.49"
                        fill="none"
                        stroke="#ece17e"
                        stroke-miterlimit="10"
                        stroke-width=".75" />
                    <polygon
                        points="36.35 19.71 21.23 19.71 21.23 4.59 20.36 4.59 20.36 19.71 5.24 19.71 5.24 20.58 20.36 20.58 20.36 35.7 21.23 35.7 21.23 20.58 36.35 20.58 36.35 19.71"
                        fill="#ece17e" />
                </svg>
            </button>

            <button
                class="zoom-btn zoom-out"
                @click="zoomOut"
                :disabled="currentScale <= minScale"
                aria-label="縮小">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    `
                    viewBox="0 0 42.24 42.24"
                    fill="none">
                    <rect
                        x=".38"
                        y=".38"
                        width="41.49"
                        height="41.49"
                        fill="none"
                        stroke="#ece17e"
                        stroke-miterlimit="10"
                        stroke-width=".75" />
                    <line
                        x1="5.24"
                        y1="20.15"
                        x2="36.35"
                        y2="20.15"
                        fill="none"
                        stroke="#ece17e"
                        stroke-miterlimit="10"
                        stroke-width=".75" />
                </svg>
            </button>

            <button
                class="zoom-btn zoom-reset"
                @click="reset"
                :disabled="
                    currentScale === 1 && currentX === 0 && currentY === 0
                "
                aria-label="重置">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path
                        d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
            </button>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@use "../../assets/scss/image-zoom/imageZoomViewer.scss" as *;
</style>
