<script setup>
/**
 * UI Empty
 * 빈 상태 표시 컴포넌트
 */
defineProps({
  title: {
    type: String,
    default: '데이터가 없습니다',
  },
  description: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <!-- Icon -->
    <div class="w-16 h-16 mb-4 text-neutral-300">
      <slot name="icon">
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </slot>
    </div>

    <!-- Title -->
    <p class="text-neutral-600 font-medium">
      {{ title }}
    </p>

    <!-- Description -->
    <p
      v-if="description"
      class="mt-1 text-sm text-neutral-500"
    >
      {{ description }}
    </p>

    <!-- Action Slot -->
    <div
      v-if="$slots.action"
      class="mt-4"
    >
      <slot name="action" />
    </div>
  </div>
</template>
