<script setup>
/**
 * Loading Overlay
 * 전역 로딩 오버레이
 */
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-white/80 backdrop-blur-sm z-modal flex items-center justify-center"
      role="status"
      aria-label="로딩 중"
    >
      <div class="flex flex-col items-center gap-3">
        <!-- Spinner -->
        <svg
          class="w-10 h-10 text-primary-600 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>

        <span class="text-sm text-neutral-600">잠시만 기다려주세요...</span>
      </div>
    </div>
  </Teleport>
</template>
