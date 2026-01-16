<script setup lang="ts">
const baseUrl = import.meta.env.BASE_URL;
// const title = "建築工藝";
</script>
<template>
    <main id="method-2-page" class="page-main">
        <img :src="`${baseUrl}images/temp-bg.jpg`" alt="" />
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
