<script setup>
/**
 * 쿠폰 상태 변경 모달
 * - 리스트/상세 페이지에서 공통 사용
 */

import { useCoupon } from '~/composables/useCoupon'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  couponName: {
    type: String,
    default: '',
  },
  targetStatus: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const { issuanceStatusOptions } = useCoupon()

const isVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const getStatusLabel = (status) => {
  return issuanceStatusOptions.find(s => s.value === status)?.label || status
}

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  isVisible.value = false
}
</script>

<template>
  <UiModal v-model="isVisible" title="쿠폰 상태 변경">
    <div class="space-y-4">
      <p class="text-sm text-neutral-700">
        <strong>{{ couponName }}</strong> 쿠폰을
        <strong>{{ getStatusLabel(targetStatus) }}</strong> 상태로 변경하시겠습니까?
      </p>

      <!-- 종료 시 경고 -->
      <div v-if="targetStatus === 'ENDED'" class="p-4 bg-error-50 border border-error-200 rounded-lg">
        <div class="flex gap-2">
          <svg class="w-5 h-5 text-error-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p class="text-sm text-error-700">
            종료된 쿠폰은 다시 발급할 수 없습니다. 신중하게 결정해주세요.
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-center gap-4 w-full">
        <UiButton variant="outline" @click="handleCancel">취소</UiButton>
        <UiButton
          :variant="targetStatus === 'ENDED' ? 'danger' : 'primary'"
          @click="handleConfirm"
        >
          확인
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
