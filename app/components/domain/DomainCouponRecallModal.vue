<script setup>
/**
 * 쿠폰 회수 확인 모달
 * - 발급중지 상태에서 미사용 쿠폰 회수 시 사용
 */

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  couponName: {
    type: String,
    default: '',
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const isVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  if (!props.isLoading) {
    isVisible.value = false
  }
}
</script>

<template>
  <UiModal v-model="isVisible" title="미사용 쿠폰 회수">
    <div class="space-y-4">
      <p class="text-sm text-neutral-700">
        <strong>{{ couponName }}</strong> 쿠폰의 미사용 쿠폰을 회수하시겠습니까?
      </p>

      <!-- 안내 사항 -->
      <div class="p-4 bg-warning-50 border border-warning-200 rounded-lg">
        <ul class="space-y-2 text-sm text-warning-800">
          <li class="flex gap-2">
            <span class="text-warning-500">•</span>
            <span>회원이 다운로드한 미사용 쿠폰이 모두 무효화됩니다.</span>
          </li>
          <li class="flex gap-2">
            <span class="text-warning-500">•</span>
            <span>이미 사용된 쿠폰은 회수 대상에서 제외됩니다.</span>
          </li>
          <li class="flex gap-2">
            <span class="text-warning-500">•</span>
            <span>회수 완료 시 쿠폰이 <strong>자동 종료</strong>되며, 다시 발급할 수 없습니다.</span>
          </li>
        </ul>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-center gap-4 w-full">
        <UiButton variant="outline" :disabled="isLoading" @click="handleCancel">
          취소
        </UiButton>
        <UiButton variant="danger" :loading="isLoading" @click="handleConfirm">
          회수
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
