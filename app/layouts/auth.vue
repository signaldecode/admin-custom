<script setup>
/**
 * Auth Layout
 * 로그인/인증 페이지용 레이아웃
 * - 심플한 중앙 정렬 레이아웃
 * - Header/Sidebar 없음
 */
</script>

<template>
  <div class="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <slot />
    </div>
  </div>
</template>
