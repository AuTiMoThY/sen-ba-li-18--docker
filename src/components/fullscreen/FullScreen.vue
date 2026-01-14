<script setup lang="ts">
import screenfull from "screenfull";
import { baseUrl } from "@/config/constants";
const fullRef = ref<HTMLElement | null>(null);
const emits = defineEmits(["home-Animation"]);
const handleClick = () => {
    screenfull.request();
    fullRef.value?.classList.add("js-hidden");
    emits("home-Animation");
};

defineExpose({
    fullRef
});

</script>
<template>
    <section id="fullscreen" ref="fullRef">
        <div class="full-img" @click.stop="handleClick">
            <img :src="`${baseUrl}images/logo.png`" alt="森巴黎18" />
        </div>
    </section>
</template>
<style scoped>
@import "../../assets/scss/fullscreen/fullscreen.scss";
</style>
