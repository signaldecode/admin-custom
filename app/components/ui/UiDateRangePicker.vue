<script setup>
/**
 * 기간 설정 컴포넌트
 * - 시작일시, 종료일시 선택
 * - 시작일 기본 시간: 00:00:00
 * - 종료일 기본 시간: 23:59:59
 * - 시간 수동 수정 가능
 * - 날짜 유효성 검증 내장
 */

const props = defineProps({
  // 시작일시 (v-model:start)
  start: {
    type: String,
    default: '',
  },
  // 종료일시 (v-model:end)
  end: {
    type: String,
    default: '',
  },
  // 시작일 라벨
  startLabel: {
    type: String,
    default: '시작일시',
  },
  // 종료일 라벨
  endLabel: {
    type: String,
    default: '종료일시',
  },
  // 시작일 필수 여부
  startRequired: {
    type: Boolean,
    default: false,
  },
  // 종료일 필수 여부
  endRequired: {
    type: Boolean,
    default: false,
  },
  // 종료일 없음 옵션 표시
  showNoEndDate: {
    type: Boolean,
    default: false,
  },
  // 종료일 없음 체크박스 라벨
  noEndDateLabel: {
    type: String,
    default: '종료일 없음',
  },
  // 비활성화
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:start', 'update:end', 'validation-change'])

// datetime 값을 YYYY-MM-DDTHH:mm:00 형식으로 정규화 (나노초 제거)
const normalizeDateTime = (value, defaultTime = '00:00') => {
  if (!value) return ''
  const datePart = value.slice(0, 10)
  const timePart = value.slice(11, 16) || defaultTime
  return `${datePart}T${timePart}:00`
}

// 종료일 없음 체크 상태
const hasNoEndDate = ref(false)

// 내부 에러 상태 (UI 표시용)
const errorMessage = ref('')
const hasDateRangeError = ref(false)

// 시작일 변경 핸들러
const handleStartChange = (e) => {
  const value = e.target.value
  if (!value) {
    emit('update:start', '')
    validateDates('', props.end)
    return
  }

  // YYYY-MM-DDTHH:mm:00 형식으로 정규화 (기본 시간: 00:00)
  const newValue = normalizeDateTime(value, '00:00')

  emit('update:start', newValue)
  validateDates(newValue, props.end)
}

// 종료일 변경 핸들러
const handleEndChange = (e) => {
  const value = e.target.value
  if (!value) {
    emit('update:end', '')
    validateDates(props.start, '')
    return
  }

  // YYYY-MM-DDTHH:mm:00 형식으로 정규화 (기본 시간: 23:59)
  const newValue = normalizeDateTime(value, '23:59')

  emit('update:end', newValue)
  validateDates(props.start, newValue)
}

// 종료일 없음 토글
const toggleNoEndDate = (e) => {
  hasNoEndDate.value = e.target.checked
  if (hasNoEndDate.value) {
    emit('update:end', '')
  }
  validateDates(props.start, hasNoEndDate.value ? '' : props.end)
}

// 날짜 유효성 검증
const validateDates = (startDate, endDate) => {
  // 에러 상태 초기화
  errorMessage.value = ''
  hasDateRangeError.value = false

  // 시작일 필수 체크
  if (props.startRequired && !startDate) {
    const message = `${props.startLabel}를 입력해주세요.`
    errorMessage.value = message
    emit('validation-change', { valid: false, message })
    return
  }

  // 종료일 필수 체크 (종료일 없음이 아닐 때)
  if (props.endRequired && !hasNoEndDate.value && !endDate) {
    const message = `${props.endLabel}를 입력해주세요.`
    errorMessage.value = message
    emit('validation-change', { valid: false, message })
    return
  }

  // 종료일이 시작일보다 앞인지 검증
  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (end < start) {
      const message = '종료일시는 시작일시보다 이후여야 합니다.'
      errorMessage.value = message
      hasDateRangeError.value = true
      emit('validation-change', { valid: false, message })
      return
    }
  }

  emit('validation-change', { valid: true, message: '' })
}

// 초기화 시 종료일 없음 상태 설정
watch(() => props.end, (newEnd) => {
  if (props.showNoEndDate && !newEnd) {
    hasNoEndDate.value = true
  }
}, { immediate: true })

// props 변경 시 유효성 검증
watch([() => props.start, () => props.end], ([newStart, newEnd]) => {
  validateDates(newStart, newEnd)
}, { immediate: true })
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- 시작일시 -->
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-1">
          {{ startLabel }}
          <span v-if="startRequired" class="text-error-500">*</span>
        </label>
        <input
          :value="start"
          type="datetime-local"
          step="1"
          :disabled="disabled"
          :class="[
            'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2',
            disabled ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed border-neutral-300' : '',
            !disabled && hasDateRangeError ? 'border-error-500 focus:ring-error-500' : 'border-neutral-300 focus:ring-primary-500',
          ]"
          @change="handleStartChange"
        >
      </div>

      <!-- 종료일시 -->
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-1">
          {{ endLabel }}
          <span v-if="endRequired && !hasNoEndDate" class="text-error-500">*</span>
        </label>
        <input
          :value="end"
          type="datetime-local"
          step="1"
          :disabled="disabled || hasNoEndDate"
          :class="[
            'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2',
            disabled || hasNoEndDate ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed border-neutral-300' : '',
            !disabled && !hasNoEndDate && hasDateRangeError ? 'border-error-500 focus:ring-error-500' : 'border-neutral-300 focus:ring-primary-500',
          ]"
          @change="handleEndChange"
        >
      </div>
    </div>

    <!-- 에러 메시지 -->
    <p v-if="errorMessage" class="text-sm text-error-600 flex items-center gap-1.5">
      <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {{ errorMessage }}
    </p>

    <!-- 종료일 없음 옵션 -->
    <label v-if="showNoEndDate" class="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        :checked="hasNoEndDate"
        :disabled="disabled"
        class="w-4 h-4 text-primary-600 rounded"
        @change="toggleNoEndDate"
      >
      <span class="text-sm text-neutral-700">{{ noEndDateLabel }}</span>
    </label>
  </div>
</template>
