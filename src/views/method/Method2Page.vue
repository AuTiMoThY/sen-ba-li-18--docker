<script setup lang="ts">
import { baseUrl } from "@/config/constants";
</script>
<template>
    <main id="method-2-page" class="page-main">
        <img :src="`${baseUrl}images/temp-bg.jpg`" alt="" />
        <h1 class="">建築工藝</h1>
    </main>
</template>
<style lang="scss" scoped>
img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
h1 {
    position: absolute;
    top: 1rem;
    left: 1rem;
}
</style>
