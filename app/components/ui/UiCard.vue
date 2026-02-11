<script setup>
/**
 * UI Card
 * 범용 카드 컴포넌트
 * - 헤더, 바디, 푸터 슬롯
 * - Padding variants
 */
defineProps({
  padding: {
    type: String,
    default: 'md',
    validator: (v) => ['none', 'sm', 'md', 'lg'].includes(v),
  },
  hoverable: {
    type: Boolean,
    default: false,
  },
})

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-8',
}
</script>

<template>
  <div
    :class="[
      'bg-white rounded-lg border border-neutral-200 shadow-sm',
      hoverable ? 'hover:shadow-md transition-shadow cursor-pointer' : '',
    ]"
  >
    <!-- Header -->
    <div
      v-if="$slots.header"
      class="px-6 py-4 border-b border-neutral-200"
    >
      <slot name="header" />
    </div>

    <!-- Body -->
    <div :class="paddingClasses[padding]">
      <slot />
    </div>

    <!-- Footer -->
    <div
      v-if="$slots.footer"
      class="px-6 py-4 border-t border-neutral-200 bg-neutral-50 rounded-b-lg"
    >
      <slot name="footer" />
    </div>
  </div>
</template>
