<script setup>
/**
 * UiTooltip - 툴팁 컴포넌트
 *
 * @prop {string} content - 툴팁 내용
 * @prop {string} position - 위치 (top, bottom, left, right)
 * @prop {string} size - 아이콘 크기 (sm, md)
 *
 * @example
 * <UiTooltip content="도움말 내용" />
 * <UiTooltip content="도움말 내용" position="bottom" />
 */

const props = defineProps({
  content: {
    type: String,
    required: true,
  },
  position: {
    type: String,
    default: 'top',
    validator: (v) => ['top', 'bottom', 'left', 'right'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md'].includes(v),
  },
})

const isVisible = ref(false)

const positionClasses = computed(() => {
  const base = 'absolute z-50 px-2.5 py-1.5 text-xs font-normal text-white bg-neutral-800 rounded-lg shadow-lg whitespace-nowrap'
  const arrow = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }
  return `${base} ${arrow[props.position]}`
})

const arrowClasses = computed(() => {
  const base = 'absolute w-2 h-2 bg-neutral-800 rotate-45'
  const positions = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1',
  }
  return `${base} ${positions[props.position]}`
})

const iconSizeClass = computed(() => {
  return props.size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
})
</script>

<template>
  <span
    class="relative inline-flex items-center"
    @mouseenter="isVisible = true"
    @mouseleave="isVisible = false"
  >
    <!-- 기본 슬롯 (아이콘 커스터마이즈 가능) -->
    <slot>
      <svg
        :class="['text-neutral-400 hover:text-neutral-600 cursor-pointer transition-colors', iconSizeClass]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </slot>

    <!-- 툴팁 -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isVisible"
        :class="positionClasses"
      >
        {{ content }}
        <span :class="arrowClasses" />
      </div>
    </Transition>
  </span>
</template>
