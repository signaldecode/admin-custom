<script setup>
/**
 * App Root
 * - NuxtLayout으로 레이아웃 적용
 * - 전역 에러 핸들링
 */
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
