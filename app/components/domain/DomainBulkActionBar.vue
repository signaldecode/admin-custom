<script setup>
/**
 * Domain Bulk Action Bar
 * 리스트 페이지 공통 벌크 액션 바
 * - 선택 개수 표시
 * - 액션 버튼 슬롯
 */

defineProps({
  count: {
    type: Number,
    required: true,
  },
  show: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="show"
      class="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg flex items-center justify-between"
    >
      <span class="text-sm font-medium text-primary-700">
        {{ count }}개 선택됨
      </span>
      <div class="flex items-center gap-2">
        <slot />
      </div>
    </div>
  </Transition>
</template>
