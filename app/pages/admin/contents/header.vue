<script setup>
/**
 * 헤더 관리 페이지
 * - 쇼핑몰 헤더 네비게이션 구성 설정
 * - 칩으로 선택 → 헤더 미리보기에 표시 → 드래그앤드롭으로 순서 변경
 */

import { useUiStore } from '~/stores/ui'

const { $api } = useNuxtApp()
const uiStore = useUiStore()

const isLoading = ref(true)
const isSaving = ref(false)

// 사용 가능한 네비게이션 항목
const availableNavItems = [
  { id: 'best', label: '베스트' },
  { id: 'category', label: '카테고리' },
  { id: 'qna', label: 'Q&A' },
  { id: 'faq', label: 'FAQ' },
  { id: 'notice', label: '공지사항' },
  { id: 'review', label: '리뷰' },
  { id: 'support', label: '고객센터' },
  { id: 'coupons', label: '쿠폰' },
]

// 선택된 네비게이션 항목 (순서대로)
const selectedNavItems = ref([])

// 드래그 상태
const draggedIndex = ref(null)
const dragOverIndex = ref(null)

// 항목이 선택되어 있는지 확인
const isSelected = (id) => {
  return selectedNavItems.value.some(item => item.id === id)
}

// 칩 토글 (선택/해제)
const toggleNavItem = (item) => {
  const index = selectedNavItems.value.findIndex(i => i.id === item.id)
  if (index > -1) {
    // 이미 선택됨 → 제거
    selectedNavItems.value.splice(index, 1)
  } else {
    // 선택 안 됨 → 추가
    selectedNavItems.value.push({ ...item })
  }
}

// 헤더에서 항목 제거
const removeFromHeader = (index) => {
  selectedNavItems.value.splice(index, 1)
}

// 드래그 시작
const onDragStart = (e, index) => {
  draggedIndex.value = index
  e.dataTransfer.effectAllowed = 'move'
}

// 드래그 오버
const onDragOver = (e, index) => {
  e.preventDefault()
  dragOverIndex.value = index
}

// 드래그 떠남
const onDragLeave = () => {
  dragOverIndex.value = null
}

// 드롭
const onDrop = (e, index) => {
  e.preventDefault()
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    const items = [...selectedNavItems.value]
    const [draggedItem] = items.splice(draggedIndex.value, 1)
    items.splice(index, 0, draggedItem)
    selectedNavItems.value = items
  }
  draggedIndex.value = null
  dragOverIndex.value = null
}

// 드래그 종료
const onDragEnd = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
}

// 데이터 로드
const fetchHeaderConfig = async () => {
  isLoading.value = true
  try {
    const response = await $api.get('/admin/tenant/header-menu')

    // order 기준으로 정렬하여 저장
    const menus = response.data?.menus || []
    selectedNavItems.value = menus
      .sort((a, b) => a.order - b.order)
      .map(item => ({ id: item.id, label: item.label }))
  } catch (error) {
    uiStore.showToast({ type: 'error', message: '헤더 설정을 불러오지 못했습니다.' })
  } finally {
    isLoading.value = false
  }
}

// 저장
const handleSave = async () => {
  isSaving.value = true
  try {
    const payload = {
      menus: selectedNavItems.value.map((item, index) => ({
        id: item.id,
        label: item.label,
        order: index,
      }))
    }

    await $api.put('/admin/tenant/header-menu', payload)

    uiStore.showToast({ type: 'success', message: '헤더 설정이 저장되었습니다.' })
  } catch (error) {
    uiStore.showToast({ type: 'error', message: '저장에 실패했습니다.' })
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  fetchHeaderConfig()
})
</script>

<template>
  <LayoutFormPage
    title="헤더 관리"
    description="쇼핑몰 헤더에 표시될 네비게이션을 설정합니다."
    :is-saving="isSaving"
    @save="handleSave"
  >
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <UiSpinner size="lg" />
    </div>

    <div v-else class="space-y-6">
      <!-- 헤더 미리보기 -->
      <UiCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-neutral-900">헤더 미리보기</h3>
            <span class="text-xs text-neutral-400">드래그하여 순서를 변경하세요</span>
          </div>
        </template>

        <!-- 미리보기 영역 -->
        <div class="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div class="bg-white border-b border-neutral-200 px-6 py-4">
            <div class="flex items-center">
              <!-- 로고 -->
              <div class="text-neutral-900 font-bold text-lg">LOGO</div>

              <!-- 네비게이션 (드래그 가능) -->
              <nav class="flex items-center gap-1 ml-6">
                <div
                  v-for="(item, index) in selectedNavItems"
                  :key="item.id"
                  draggable="true"
                  :class="[
                    'group relative px-4 py-2 text-neutral-900 text-sm cursor-move rounded transition-all',
                    dragOverIndex === index ? 'bg-primary-100' : 'hover:bg-neutral-100',
                    draggedIndex === index ? 'opacity-50' : '',
                  ]"
                  @dragstart="onDragStart($event, index)"
                  @dragover="onDragOver($event, index)"
                  @dragleave="onDragLeave"
                  @drop="onDrop($event, index)"
                  @dragend="onDragEnd"
                >
                  {{ item.label }}
                  <!-- 삭제 버튼 (호버 시 표시) -->
                  <button
                    type="button"
                    class="absolute -top-1 -right-1 w-4 h-4 bg-error-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    @click.stop="removeFromHeader(index)"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <!-- 빈 상태 -->
                <span v-if="selectedNavItems.length === 0" class="text-neutral-400 text-sm px-4 py-2">
                  아래에서 항목을 선택하세요
                </span>
              </nav>

              <!-- 아이콘 영역 -->
              <div class="flex items-center gap-4 text-neutral-700 ml-auto">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- 네비게이션 항목 선택 -->
      <UiCard>
        <template #header>
          <h3 class="font-semibold text-neutral-900">네비게이션 항목</h3>
        </template>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="item in availableNavItems"
            :key="item.id"
            type="button"
            :class="[
              'px-4 py-2 rounded-full text-sm font-medium text-white transition-colors',
              isSelected(item.id)
                ? 'bg-primary-600'
                : 'bg-neutral-500 hover:bg-neutral-600',
            ]"
            @click="toggleNavItem(item)"
          >
            {{ item.label }}
          </button>
        </div>

        <p class="text-xs text-neutral-400 mt-3">클릭하여 선택/해제합니다. 선택된 항목은 헤더에 표시됩니다.</p>
      </UiCard>
    </div>
  </LayoutFormPage>
</template>
