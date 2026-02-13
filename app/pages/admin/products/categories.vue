<script setup>
/**
 * 카테고리 관리 페이지
 * - 대분류/소분류 2단계 구조 (중첩 구조)
 * - 인라인 추가/수정
 * - 드래그앤드롭 순서 변경
 * - 모든 변경사항은 저장 버튼으로 일괄 동기화
 * - API: GET /admin/categories, PUT /admin/categories/sync
 */

import draggable from 'vuedraggable'
import { useUiStore } from '~/stores/ui'
import { useCatalogStore } from '~/stores/catalog'

const uiStore = useUiStore()
const catalogStore = useCatalogStore()
const { get, put } = useApi()
const { $api } = useNuxtApp()

// 로딩 상태
const isLoading = ref(true)
const isSaving = ref(false)

// 카테고리 데이터 (작업용 - 중첩 구조)
const categories = ref([])

// 원본 데이터 (변경 감지용, JSON 문자열로 저장)
const originalData = ref('')

// 삭제된 ID 추적
const deletedIds = ref([])

// 새 카테고리 입력값
const newParentName = ref('')
const newChildNames = ref({}) // { parentId: '입력값' }

// 수정 모드
const editingId = ref(null)
const editingName = ref('')

// 삭제 확인 모달
const showDeleteModal = ref(false)
const deleteTarget = ref(null)
const deleteTargetParentId = ref(null)

// 현재 데이터를 JSON 문자열로 생성 (변경 감지용)
const getCurrentDataString = () => {
  return JSON.stringify({
    categories: categories.value,
    deletedIds: deletedIds.value,
  })
}

// 변경 여부 (추가/수정/삭제/순서변경 모두 감지)
const hasChanges = computed(() => {
  return originalData.value !== getCurrentDataString()
})

// 소분류 존재 여부
const hasChildren = (parent) => {
  return parent.children && parent.children.length > 0
}

// API 응답을 작업용 구조로 변환
const transformApiResponse = (data) => {
  return data.map((item) => ({
    id: item.id,
    name: item.name,
    sortOrder: item.sortOrder,
    children: item.children ? transformApiResponse(item.children) : [],
  }))
}

// 작업용 구조를 API 요청 구조로 변환
const transformForApi = (items) => {
  return items.map((item, index) => ({
    id: item.id,
    name: item.name,
    sortOrder: index,
    children: item.children ? transformForApi(item.children) : [],
  }))
}

// 데이터 로드
const fetchCategories = async () => {
  isLoading.value = true

  try {
    const response = await get('/admin/categories')
    const data = response.data || response

    categories.value = transformApiResponse(data)
    deletedIds.value = []

    // 원본 데이터 저장
    originalData.value = getCurrentDataString()
  } catch (err) {
    uiStore.showToast({
      type: 'error',
      message: err.data?.error?.message || err.data?.message || err.message || '카테고리를 불러오지 못했습니다.',
    })
  } finally {
    isLoading.value = false
  }
}

// 모든 변경사항 저장
const saveAllChanges = async () => {
  isSaving.value = true

  try {
    const payload = {
      categories: transformForApi(categories.value),
      deletedIds: deletedIds.value,
    }

    const response = await put('/admin/categories/sync', payload)
    const responseData = response?.data || response

    // 부분 성공 처리: 삭제 실패한 카테고리가 있는 경우
    const failedIds = responseData?.failedIds || []
    const failedReasons = responseData?.failedReasons || {}

    if (failedIds.length > 0) {
      // 삭제 실패한 ID는 deletedIds에서 제거 (다음 저장 시 다시 시도하지 않도록)
      deletedIds.value = deletedIds.value.filter((id) => !failedIds.includes(id))

      // 실패 사유별 메시지 생성
      const reasonMessages = {
        CATEGORY_HAS_PRODUCTS: '상품이 존재',
        CATEGORY_HAS_CHILDREN: '하위 카테고리가 존재',
      }

      // 사유별로 그룹핑
      const hasProducts = failedIds.filter((id) => failedReasons[id] === 'CATEGORY_HAS_PRODUCTS')
      const hasChildren = failedIds.filter((id) => failedReasons[id] === 'CATEGORY_HAS_CHILDREN')

      let message = '일부 카테고리를 삭제할 수 없습니다: '
      const parts = []
      if (hasProducts.length > 0) {
        parts.push(`${hasProducts.length}개 - 상품이 존재`)
      }
      if (hasChildren.length > 0) {
        parts.push(`${hasChildren.length}개 - 하위 카테고리가 존재`)
      }
      message += parts.join(', ')

      uiStore.showToast({ type: 'warning', message })
    } else {
      uiStore.showToast({ type: 'success', message: '카테고리가 저장되었습니다.' })
    }

    // 저장 성공 후 store 갱신 (다른 페이지에서도 최신 데이터 사용)
    await catalogStore.refreshCategories($api)

    // 서버의 최신 데이터로 동기화 (삭제 실패한 카테고리도 다시 표시됨)
    await fetchCategories()
  } catch (err) {
    uiStore.showToast({
      type: 'error',
      message: err.data?.error?.message || err.data?.message || err.message || '저장에 실패했습니다.',
    })

    // 에러 시에도 서버 데이터로 동기화 (부분 성공 케이스 대응)
    await fetchCategories()
  } finally {
    isSaving.value = false
  }
}

// 변경 취소 (원본 데이터로 복원)
const cancelChanges = () => {
  fetchCategories()
}

// 대분류 추가
const addParentCategory = () => {
  const name = newParentName.value.trim()
  if (!name) {
    uiStore.showToast({ type: 'error', message: '카테고리 이름을 입력해주세요.' })
    return
  }

  categories.value.push({
    id: null, // 새 항목은 null
    name,
    sortOrder: categories.value.length,
    children: [],
  })

  newParentName.value = ''
}

// 소분류 추가
const addChildCategory = (parent) => {
  const name = (newChildNames.value[parent.id || `new-${categories.value.indexOf(parent)}`] || '').trim()
  if (!name) {
    uiStore.showToast({ type: 'error', message: '카테고리 이름을 입력해주세요.' })
    return
  }

  if (!parent.children) {
    parent.children = []
  }

  parent.children.push({
    id: null, // 새 항목은 null
    name,
    sortOrder: parent.children.length,
    children: [],
  })

  // 입력값 초기화
  const key = parent.id || `new-${categories.value.indexOf(parent)}`
  newChildNames.value[key] = ''
}

// 수정 모드 시작
const startEdit = (category) => {
  editingId.value = category.id || `temp-${Date.now()}`
  editingName.value = category.name
  category._editKey = editingId.value
}

// 수정 취소
const cancelEdit = () => {
  editingId.value = null
  editingName.value = ''
}

// 수정 저장
const saveEdit = (category) => {
  const name = editingName.value.trim()
  if (!name) {
    uiStore.showToast({ type: 'error', message: '카테고리 이름을 입력해주세요.' })
    return
  }

  category.name = name
  delete category._editKey
  cancelEdit()
}

// 삭제 확인
const confirmDelete = (category, parentId = null) => {
  deleteTarget.value = category
  deleteTargetParentId.value = parentId
  showDeleteModal.value = true
}

// 삭제 실행
const executeDelete = () => {
  if (!deleteTarget.value) return

  const target = deleteTarget.value
  const parentId = deleteTargetParentId.value

  // 삭제 대상 ID 수집 (기존 항목만)
  const collectDeletedIds = (item) => {
    const ids = []
    if (item.id !== null) {
      ids.push(item.id)
    }
    if (item.children) {
      item.children.forEach((child) => {
        ids.push(...collectDeletedIds(child))
      })
    }
    return ids
  }

  // 삭제 ID 추가
  const idsToDelete = collectDeletedIds(target)
  deletedIds.value.push(...idsToDelete)

  // 목록에서 제거
  if (parentId === null) {
    // 대분류 삭제
    const index = categories.value.findIndex((c) => c === target)
    if (index > -1) {
      categories.value.splice(index, 1)
    }
  } else {
    // 소분류 삭제
    const parent = categories.value.find((c) => c.id === parentId || c === parentId)
    if (parent && parent.children) {
      const index = parent.children.findIndex((c) => c === target)
      if (index > -1) {
        parent.children.splice(index, 1)
      }
    }
  }

  showDeleteModal.value = false
  deleteTarget.value = null
  deleteTargetParentId.value = null
}

// 수정 중인지 확인
const isEditing = (category) => {
  return category._editKey === editingId.value
}

// 입력 키 생성 (새 항목용)
const getInputKey = (parent) => {
  return parent.id || `new-${categories.value.indexOf(parent)}`
}

// 초기 로드
onMounted(() => {
  fetchCategories()
})
</script>

<template>
  <LayoutFormPage
    title="카테고리 관리"
    description="상품 카테고리를 추가하고 관리합니다. 드래그하여 순서를 변경할 수 있습니다. 대분류는 상품 목록에 노출 및 메인 hero 영역아래 링크가 생성됩니다."
    :is-saving="isSaving"
    :save-disabled="!hasChanges"
    show-cancel
    @save="saveAllChanges"
    @cancel="cancelChanges"
  >
    <!-- 로딩 -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <UiSpinner size="lg" />
    </div>

    <div v-else class="max-w-2xl">
      <!-- 대분류 추가 -->
      <div class="mb-6">
        <div class="flex gap-2">
          <input
            v-model="newParentName"
            type="text"
            class="flex-1 px-4 py-3 border border-neutral-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="새 대분류 이름을 입력하세요"
            @keyup.enter="addParentCategory"
          >
          <button
            type="button"
            class="px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
            @click="addParentCategory"
          >
            추가
          </button>
        </div>
      </div>

      <!-- 카테고리 목록 (드래그앤드롭) -->
      <draggable
        v-model="categories"
        item-key="id"
        handle=".parent-drag-handle"
        ghost-class="opacity-50"
        class="space-y-4"
        :group="{ name: 'parents' }"
      >
        <template #item="{ element: parent, index: parentIndex }">
          <div class="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <!-- 대분류 헤더 -->
            <div class="flex items-center gap-3 px-4 py-3 bg-neutral-50 border-b border-neutral-200">
              <!-- 드래그 핸들 -->
              <button
                type="button"
                class="parent-drag-handle p-1 cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600"
                title="드래그하여 순서 변경"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                </svg>
              </button>

              <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>

              <!-- 수정 모드 -->
              <template v-if="isEditing(parent)">
                <input
                  v-model="editingName"
                  type="text"
                  class="flex-1 px-3 py-1.5 border border-primary-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-500"
                  @keyup.enter="saveEdit(parent)"
                  @keyup.escape="cancelEdit"
                >
                <button
                  type="button"
                  class="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  @click="saveEdit(parent)"
                >
                  저장
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900"
                  @click="cancelEdit"
                >
                  취소
                </button>
              </template>

              <!-- 보기 모드 -->
              <template v-else>
                <span class="flex-1 font-medium text-neutral-900">
                  {{ parent.name }}
                  <span v-if="parent.id === null" class="ml-2 text-xs text-primary-500 font-normal">(신규)</span>
                </span>
                <button
                  type="button"
                  class="p-2 text-neutral-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                  title="수정"
                  @click="startEdit(parent)"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="p-2 text-neutral-400 hover:text-error-500 hover:bg-error-50 rounded-lg transition-colors"
                  title="삭제"
                  @click="confirmDelete(parent, null)"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </template>
            </div>

            <!-- 소분류 영역 -->
            <div class="p-4">
              <!-- 소분류 추가 -->
              <div class="flex gap-2 mb-3">
                <input
                  v-model="newChildNames[getInputKey(parent)]"
                  type="text"
                  class="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="소분류 이름 입력"
                  @keyup.enter="addChildCategory(parent)"
                >
                <button
                  type="button"
                  class="px-4 py-2 text-sm bg-neutral-100 text-neutral-700 font-medium rounded-lg hover:bg-neutral-200 transition-colors"
                  @click="addChildCategory(parent)"
                >
                  추가
                </button>
              </div>

              <!-- 소분류 목록 (드래그앤드롭) -->
              <draggable
                v-if="hasChildren(parent)"
                v-model="parent.children"
                item-key="id"
                handle=".child-drag-handle"
                ghost-class="opacity-50"
                class="space-y-1"
                :group="{ name: `children-${parentIndex}` }"
              >
                <template #item="{ element: child }">
                  <div class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-50 group">
                    <!-- 드래그 핸들 -->
                    <button
                      type="button"
                      class="child-drag-handle p-0.5 cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500"
                      title="드래그하여 순서 변경"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                      </svg>
                    </button>

                    <span class="w-4 text-neutral-300">└</span>

                    <!-- 수정 모드 -->
                    <template v-if="isEditing(child)">
                      <input
                        v-model="editingName"
                        type="text"
                        class="flex-1 px-2 py-1 border border-primary-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        @keyup.enter="saveEdit(child)"
                        @keyup.escape="cancelEdit"
                      >
                      <button
                        type="button"
                        class="px-2 py-1 text-xs bg-primary-500 text-white rounded hover:bg-primary-600"
                        @click="saveEdit(child)"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        class="px-2 py-1 text-xs text-neutral-600 hover:text-neutral-900"
                        @click="cancelEdit"
                      >
                        취소
                      </button>
                    </template>

                    <!-- 보기 모드 -->
                    <template v-else>
                      <span class="flex-1 text-sm text-neutral-700">
                        {{ child.name }}
                        <span v-if="child.id === null" class="ml-1 text-xs text-primary-500">(신규)</span>
                      </span>
                      <button
                        type="button"
                        class="p-1.5 text-neutral-300 hover:text-primary-500 hover:bg-primary-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                        title="수정"
                        @click="startEdit(child)"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="p-1.5 text-neutral-300 hover:text-error-500 hover:bg-error-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                        title="삭제"
                        @click="confirmDelete(child, parent)"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </template>
                  </div>
                </template>
              </draggable>

              <!-- 소분류 없음 -->
              <p v-if="!hasChildren(parent)" class="text-sm text-neutral-400 text-center py-2">
                소분류가 없습니다
              </p>
            </div>
          </div>
        </template>
      </draggable>

      <!-- 카테고리 없음 -->
      <div v-if="categories.length === 0" class="text-center py-12 bg-white border border-neutral-200 rounded-xl">
        <svg class="w-12 h-12 mx-auto text-neutral-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <p class="text-neutral-500">등록된 카테고리가 없습니다</p>
        <p class="text-sm text-neutral-400 mt-1">위 입력창에서 대분류를 추가해보세요</p>
      </div>
    </div>

    <!-- 삭제 확인 모달 -->
    <UiModal
      v-model="showDeleteModal"
      title="카테고리 삭제"
      size="sm"
    >
      <div class="text-center py-4">
        <div class="w-12 h-12 mx-auto mb-4 bg-error-100 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p class="text-neutral-900 font-medium mb-2">
          "{{ deleteTarget?.name }}"을(를) 삭제하시겠습니까?
        </p>
        <p v-if="deleteTarget && deleteTargetParentId === null && hasChildren(deleteTarget)" class="text-sm text-error-600">
          하위 소분류도 함께 삭제됩니다.
        </p>
      </div>

      <template #footer>
        <div class="flex justify-center gap-3">
          <UiButton variant="outline" @click="showDeleteModal = false">
            취소
          </UiButton>
          <UiButton variant="error" @click="executeDelete">
            삭제
          </UiButton>
        </div>
      </template>
    </UiModal>
  </LayoutFormPage>
</template>
