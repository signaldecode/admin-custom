<script setup>
/**
 * UI Badge
 * 상태/라벨 표시용 뱃지
 * Variants: primary, success, warning, error, info, neutral
 * Sizes: sm, md
 */
defineProps({
  variant: {
    type: String,
    default: 'neutral',
    validator: (v) => ['primary', 'success', 'warning', 'error', 'info', 'neutral'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md'].includes(v),
  },
  dot: {
    type: Boolean,
    default: false,
  },
})

const variantClasses = {
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  error: 'bg-error-100 text-error-700',
  info: 'bg-info-100 text-info-700',
  neutral: 'bg-neutral-100 text-neutral-700',
}

const dotClasses = {
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  error: 'bg-error-500',
  info: 'bg-info-500',
  neutral: 'bg-neutral-500',
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 font-medium rounded-full',
      variantClasses[variant],
      sizeClasses[size],
    ]"
  >
    <span
      v-if="dot"
      :class="[
        'w-1.5 h-1.5 rounded-full',
        dotClasses[variant],
      ]"
    />
    <slot />
  </span>
</template>
