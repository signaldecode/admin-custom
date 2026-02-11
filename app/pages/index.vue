<script setup>
/**
 * Root Index Page
 * 루트 경로 접근 시 자동 리다이렉트
 */
definePageMeta({
  layout: false,
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral-100">
    <UiSpinner size="lg" />
  </div>
</template>
