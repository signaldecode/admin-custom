<script setup>
/**
 * UI Pagination
 * 페이지네이션 컴포넌트
 * - 30개 기준 페이지
 * - 모바일 최적화
 */
const props = defineProps({
  currentPage: {
    type: Number,
    required: true,
  },
  totalPages: {
    type: Number,
    required: true,
  },
  totalItems: {
    type: Number,
    default: 0,
  },
  perPage: {
    type: Number,
    default: 30,
  },
  maxVisible: {
    type: Number,
    default: 5,
  },
})

const emit = defineEmits(['update:currentPage', 'change'])

// 표시할 페이지 번호 계산
const visiblePages = computed(() => {
  const pages = []
  const { currentPage, totalPages, maxVisible } = props

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    const half = Math.floor(maxVisible / 2)
    let start = currentPage - half
    let end = currentPage + half

    if (start < 1) {
      start = 1
      end = maxVisible
    }

    if (end > totalPages) {
      end = totalPages
      start = totalPages - maxVisible + 1
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
  }

  return pages
})

// 현재 표시 범위
const displayRange = computed(() => {
  const start = (props.currentPage - 1) * props.perPage + 1
  const end = Math.min(props.currentPage * props.perPage, props.totalItems)
  return { start, end }
})

// 페이지 변경
const goToPage = (page) => {
  if (page < 1 || page > props.totalPages || page === props.currentPage) return
  emit('update:currentPage', page)
  emit('change', page)
}

// 이전/다음
const goPrev = () => goToPage(props.currentPage - 1)
const goNext = () => goToPage(props.currentPage + 1)
const goFirst = () => goToPage(1)
const goLast = () => goToPage(props.totalPages)
</script>

<template>
  <div
    v-if="totalPages > 0"
    class="flex flex-col sm:flex-row items-center justify-between gap-4"
  >
    <!-- Info -->
    <p class="text-sm text-neutral-600">
      총 <span class="font-medium">{{ totalItems.toLocaleString() }}</span>개 중
      <span class="font-medium">{{ displayRange.start }}-{{ displayRange.end }}</span>
    </p>

    <!-- Pagination Controls -->
    <div class="flex items-center gap-1">
      <!-- First -->
      <button
        type="button"
        :disabled="currentPage === 1"
        class="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed hidden sm:block"
        aria-label="첫 페이지"
        @click="goFirst"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>

      <!-- Prev -->
      <button
        type="button"
        :disabled="currentPage === 1"
        class="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="이전"
        @click="goPrev"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Page Numbers -->
      <div class="flex items-center gap-1">
        <!-- First page indicator -->
        <template v-if="visiblePages[0] > 1">
          <button
            type="button"
            class="w-8 h-8 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100"
            @click="goToPage(1)"
          >
            1
          </button>
          <span v-if="visiblePages[0] > 2" class="px-1 text-neutral-400">...</span>
        </template>

        <!-- Visible pages -->
        <button
          v-for="page in visiblePages"
          :key="page"
          type="button"
          :class="[
            'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
            page === currentPage
              ? 'bg-primary-600 text-white'
              : 'text-neutral-600 hover:bg-neutral-100',
          ]"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>

        <!-- Last page indicator -->
        <template v-if="visiblePages[visiblePages.length - 1] < totalPages">
          <span v-if="visiblePages[visiblePages.length - 1] < totalPages - 1" class="px-1 text-neutral-400">...</span>
          <button
            type="button"
            class="w-8 h-8 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100"
            @click="goToPage(totalPages)"
          >
            {{ totalPages }}
          </button>
        </template>
      </div>

      <!-- Next -->
      <button
        type="button"
        :disabled="currentPage === totalPages"
        class="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="다음"
        @click="goNext"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Last -->
      <button
        type="button"
        :disabled="currentPage === totalPages"
        class="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed hidden sm:block"
        aria-label="마지막 페이지"
        @click="goLast"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>
