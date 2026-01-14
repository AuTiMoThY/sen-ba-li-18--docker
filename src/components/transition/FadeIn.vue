<template>
    <Transition name="fade" mode="out-in">
        <slot></slot>
    </Transition>
</template>

<script setup lang="ts"></script>

<style>
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
    opacity: 1;
}

.fade-enter-active,
.fade-leave-active {
    transition: all 0.75s;
}
</style>
