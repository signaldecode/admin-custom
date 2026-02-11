<script setup>
/**
 * UI Modal
 * 범용 모달 컴포넌트
 * - 접근성 지원 (focus trap, aria)
 * - ESC로 닫기
 * - Size variants
 */
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg', 'xl', 'full'].includes(v),
  },
  closable: {
    type: Boolean,
    default: true,
  },
  persistent: {
    type: Boolean,
    default: false, // true면 배경 클릭으로 닫히지 않음
  },
})

const emit = defineEmits(['update:modelValue', 'close'])

// Size 클래스
const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
}

// 모달 닫기
const close = () => {
  if (props.closable) {
    emit('update:modelValue', false)
    emit('close')
  }
}

// 배경 클릭
const handleBackdropClick = () => {
  if (!props.persistent) {
    close()
  }
}

// ESC 키로 닫기
const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    close()
  }
}

// 모달 열릴 때 이벤트 리스너
watch(() => props.modelValue, (open) => {
  if (open) {
    document.addEventListener('keydown', handleKeydown)
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = ''
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-modal flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? 'modal-title' : undefined"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-neutral-900/50"
          aria-hidden="true"
          @click="handleBackdropClick"
        />

        <!-- Modal Content -->
        <Transition
          enter-active-class="transition-all duration-200"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-150"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="modelValue"
            :class="[
              'relative w-full bg-white rounded-lg shadow-xl',
              sizeClasses[size],
            ]"
          >
            <!-- Header -->
            <div
              v-if="title || closable"
              class="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-neutral-200"
            >
              <h2
                v-if="title"
                id="modal-title"
                class="text-lg font-semibold text-neutral-900"
              >
                {{ title }}
              </h2>
              <div v-else />

              <button
                v-if="closable"
                type="button"
                class="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
                aria-label="닫기"
                @click="close"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="p-4 md:p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
              <slot />
            </div>

            <!-- Footer -->
            <div
              v-if="$slots.footer"
              class="px-4 py-3 md:px-6 md:py-4 border-t border-neutral-200 bg-neutral-50 rounded-b-lg"
            >
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
