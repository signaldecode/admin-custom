<script setup>
/**
 * Layout Form Page
 * 폼 페이지 공통 레이아웃
 * - 상단 헤더 고정
 * - 하단 저장 버튼 푸터 고정
 * - 중앙 콘텐츠 스크롤
 */

defineProps({
  // 페이지 제목
  title: {
    type: String,
    default: '',
  },
  // 페이지 설명
  description: {
    type: String,
    default: '',
  },
  // 저장 버튼 텍스트
  saveText: {
    type: String,
    default: '저장',
  },
  // 저장 중 상태
  isSaving: {
    type: Boolean,
    default: false,
  },
  // 저장 버튼 비활성화
  saveDisabled: {
    type: Boolean,
    default: false,
  },
  // 취소 버튼 표시
  showCancel: {
    type: Boolean,
    default: false,
  },
  // 취소 버튼 텍스트
  cancelText: {
    type: String,
    default: '취소',
  },
  // 삭제 버튼 표시
  showDelete: {
    type: Boolean,
    default: false,
  },
  // 삭제 버튼 텍스트
  deleteText: {
    type: String,
    default: '삭제',
  },
  // 저장 버튼 표시
  showSave: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['save', 'cancel', 'delete'])

const handleSave = () => {
  emit('save')
}

const handleCancel = () => {
  emit('cancel')
}

const handleDelete = () => {
  emit('delete')
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0 overflow-hidden">
    <!-- Header (Fixed) -->
    <div class="flex-shrink-0 mb-4 md:mb-6">
      <h1 v-if="title" class="text-xl md:text-2xl font-bold text-neutral-900">{{ title }}</h1>
      <p v-if="description" class="text-sm text-neutral-500 mt-1">{{ description }}</p>
      <slot name="header" />
    </div>

    <!-- Content (Scrollable) -->
    <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-4 overscroll-contain">
      <slot />
    </div>

    <!-- Footer (Fixed) -->
    <div class="flex-shrink-0 border-t border-neutral-200 bg-white -mx-4 md:-mx-6 -mb-4 md:-mb-6 px-4 md:px-6 py-4 md:py-5 mt-auto">
      <div class="flex items-center justify-center gap-4">
        <slot name="footer">
          <UiButton
            v-if="showDelete"
            variant="danger"
            size="lg"
            :disabled="isSaving"
            @click="handleDelete"
          >
            {{ deleteText }}
          </UiButton>
          <UiButton
            v-if="showCancel"
            variant="outline"
            size="lg"
            :disabled="isSaving"
            @click="handleCancel"
          >
            {{ cancelText }}
          </UiButton>
          <UiButton
            v-if="showSave"
            variant="primary"
            size="lg"
            :disabled="isSaving || saveDisabled"
            @click="handleSave"
          >
            <UiSpinner v-if="isSaving" size="sm" class="mr-2" />
            {{ saveText }}
          </UiButton>
        </slot>
      </div>
    </div>
  </div>
</template>
