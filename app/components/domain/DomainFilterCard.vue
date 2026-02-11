<script setup>
/**
 * Domain Filter Card
 * 리스트 페이지 공통 필터 컴포넌트
 * - 모바일: 셀렉트 2열, 검색창 별도 줄
 * - PC: 모든 요소 한 줄
 */

const emit = defineEmits(['search', 'reset'])

const handleSearch = () => {
  emit('search')
}

const handleReset = () => {
  emit('reset')
}
</script>

<template>
  <UiCard>
    <!-- Mobile: 2-col grid for selects + separate search row -->
    <!-- Desktop: all in one row -->
    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
      <!-- Filter Selects -->
      <div v-if="$slots.selects" class="grid grid-cols-2 sm:flex gap-3 sm:shrink-0">
        <slot name="selects" />
      </div>

      <!-- Search Input + Buttons -->
      <div class="flex gap-2 sm:flex-1">
        <slot name="search">
          <input
            type="text"
            placeholder="검색"
            class="flex-1 min-w-0 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            @keyup.enter="handleSearch"
          >
        </slot>
        <UiButton variant="primary" @click="handleSearch">
          검색
        </UiButton>
        <UiButton variant="outline" @click="handleReset">
          초기화
        </UiButton>
      </div>
    </div>
  </UiCard>
</template>
