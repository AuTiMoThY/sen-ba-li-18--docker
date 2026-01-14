<script setup lang="ts">
import Nav from "@/components/nav/Nav.vue";
import { baseUrl } from "@/config/constants";
</script>
<template>
    <div id="building-Page" class="page-wrapper">
        <main id="building-page" class="page-main">
            <img :src="`${baseUrl}images/temp-bg.jpg`" alt="" />
            <h1 class="">匠心建築</h1>
        </main>
        <Nav />
    </div>
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
