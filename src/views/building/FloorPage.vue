<script setup lang="ts">
const route = useRoute();
const floor = route.query.q as string;
const baseUrl = import.meta.env.BASE_URL;
console.log(floor);
</script>
<template>
    <div id="floor-main" class="page-wrapper">
        <main id="floor-page" class="page-main">
            <div class="floor-col floor-left">
                <h2 class="floor-page-title">{{ floor }}</h2>
            </div>
            <div class="floor-col floor-right">
                <img :src="`${baseUrl}images/floor_plan/1F.webp`" alt="" />
            </div>
        </main>
        <Nav />
    </div>
</template>
<style scoped>
@import "@/assets/scss/building/FloorPage.scss";
</style>
