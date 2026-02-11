<script setup>
/**
 * FAQ 목록 페이지
 */

import { useUiStore } from '~/stores/ui'
import { useApi } from '~/composables/useApi'

const router = useRouter()
const uiStore = useUiStore()
const { get, post, patch, del } = useApi()

// 카테고리 (API 연동)
const categories = ref([])
const showCategoryModal = ref(false)
const newCategoryName = ref('')
const isCategorySaving = ref(false)
const editingCategory = ref(null)
const editCategoryName = ref('')

// 카테고리 목록 조회
const fetchCategories = async () => {
  try {
    const response = await get('/admin/faqs/categories')
    categories.value = response.data || []
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '카테고리 목록을 불러오는데 실패했습니다.',
    })
  }
}

// 카테고리 등록
const handleAddCategory = async () => {
  if (!newCategoryName.value.trim()) {
    uiStore.showToast({ type: 'error', message: '카테고리명을 입력해주세요.' })
    return
  }
  isCategorySaving.value = true
  try {
    await post('/admin/faqs/categories', {
      name: newCategoryName.value.trim(),
      isActive: true,
    })
    newCategoryName.value = ''
    uiStore.showToast({ type: 'success', message: '카테고리가 등록되었습니다.' })
    await fetchCategories()
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '카테고리 등록에 실패했습니다.',
    })
  } finally {
    isCategorySaving.value = false
  }
}

// 카테고리 수정
const startEditCategory = (cat) => {
  editingCategory.value = cat.id
  editCategoryName.value = cat.name
}
const handleEditCategory = async (cat) => {
  if (!editCategoryName.value.trim()) {
    uiStore.showToast({ type: 'error', message: '카테고리명을 입력해주세요.' })
    return
  }
  try {
    await patch(`/admin/faqs/categories/${cat.id}`, {
      name: editCategoryName.value.trim(),
      isActive: cat.isActive,
    })
    editingCategory.value = null
    uiStore.showToast({ type: 'success', message: '카테고리가 수정되었습니다.' })
    await fetchCategories()
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '카테고리 수정에 실패했습니다.',
    })
  }
}
const cancelEditCategory = () => {
  editingCategory.value = null
  editCategoryName.value = ''
}

// 카테고리 삭제
const handleDeleteCategory = async (cat) => {
  if (!confirm(`'${cat.name}' 카테고리를 삭제하시겠습니까?`)) return
  try {
    await del(`/admin/faqs/categories/${cat.id}`)
    uiStore.showToast({ type: 'success', message: '카테고리가 삭제되었습니다.' })
    await fetchCategories()
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '카테고리 삭제에 실패했습니다.',
    })
  }
}

// 카테고리 모달 열기
const openCategoryModal = async () => {
  showCategoryModal.value = true
  await fetchCategories()
}

// 카테고리 옵션 (필터용 computed)
const categoryOptions = computed(() =>
  categories.value.map((c) => ({ value: c.id, label: c.name }))
)

// FAQ 목록
const faqs = ref([])
const isLoading = ref(false)

const filterCategory = ref('')
const searchKeyword = ref('')

// 페이지네이션
const currentPage = ref(1)
const perPage = 20
const totalItems = ref(0)
const totalPages = computed(() => Math.ceil(totalItems.value / perPage))

// FAQ 목록 조회 API
const fetchFaqs = async () => {
  isLoading.value = true
  try {
    const params = {
      page: currentPage.value - 1,
      size: perPage,
    }
    if (filterCategory.value) params.categoryId = filterCategory.value
    if (searchKeyword.value.trim()) params.keyword = searchKeyword.value.trim()

    const response = await get('/admin/faqs', params)
    faqs.value = response.data.content || []
    totalItems.value = response.data.total_elements || 0
    selectedIds.value = []
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || 'FAQ 목록을 불러오는데 실패했습니다.',
    })
    faqs.value = []
    totalItems.value = 0
  } finally {
    isLoading.value = false
  }
}

const tableColumns = [
  { key: 'category', label: '분류', width: 'w-24' },
  { key: 'question', label: '질문' },
  { key: 'answer', label: '답변' },
]

const selectedIds = ref([])
const handleSelectAll = (selectAll) => { selectedIds.value = selectAll ? faqs.value.map((f) => f.id) : [] }
const handleSelect = (id) => {
  const idx = selectedIds.value.indexOf(id)
  idx > -1 ? selectedIds.value.splice(idx, 1) : selectedIds.value.push(id)
}

const bulkDelete = async () => {
  if (!selectedIds.value.length || !confirm(`선택한 ${selectedIds.value.length}개를 삭제하시겠습니까?`)) return
  try {
    await Promise.all(selectedIds.value.map((id) => del(`/admin/faqs/${id}`)))
    uiStore.showToast({ type: 'success', message: '삭제되었습니다.' })
    selectedIds.value = []
    await fetchFaqs()
  } catch (error) {
    uiStore.showToast({ type: 'error', message: error.message || '삭제에 실패했습니다.' })
  }
}

const goToCreate = () => router.push('/admin/contents/faq/new')
const goToDetail = (faq) => router.push(`/admin/contents/faq/${faq.id}`)

const handleSearch = () => {
  currentPage.value = 1
  fetchFaqs()
}
const handleReset = () => {
  filterCategory.value = ''
  searchKeyword.value = ''
  currentPage.value = 1
  fetchFaqs()
}

const handlePageChange = (page) => {
  currentPage.value = page
  fetchFaqs()
}

onMounted(() => {
  fetchFaqs()
  fetchCategories()
})
</script>

<template>
  <LayoutListPage title="FAQ 관리" description="자주 묻는 질문을 관리합니다.">
    <template #actions>
      <div class="flex gap-2">
        <UiButton variant="outline" @click="openCategoryModal">
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          </svg>
          FAQ 카테고리
        </UiButton>
        <UiButton variant="primary" @click="goToCreate">
          <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          FAQ 등록
        </UiButton>
      </div>
    </template>

    <template #filters>
      <DomainFilterCard @search="handleSearch" @reset="handleReset">
        <template #selects>
          <select v-model="filterCategory" class="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">분류 전체</option>
            <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </template>
        <template #search>
          <input v-model="searchKeyword" type="text" placeholder="질문으로 검색" class="flex-1 min-w-0 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" @keyup.enter="handleSearch">
        </template>
      </DomainFilterCard>
    </template>

    <template #bulk>
      <DomainBulkActionBar :count="selectedIds.length" :show="selectedIds.length > 0">
        <UiButton variant="danger" size="sm" @click="bulkDelete">삭제</UiButton>
      </DomainBulkActionBar>
    </template>

    <!-- 로딩 -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center bg-white rounded-lg border border-neutral-200">
      <UiSpinner size="lg" />
    </div>

    <DomainDataTable
      v-else
      :columns="tableColumns"
      :items="faqs"
      :selected-ids="selectedIds"
      selectable
      empty-title="등록된 FAQ가 없습니다"
      empty-description="새 FAQ를 등록해보세요."
      @select="handleSelect"
      @select-all="handleSelectAll"
      @row-click="goToDetail"
    >
      <template #cell-question="{ item }">
        <p class="text-sm font-medium text-neutral-900">{{ item.question }}</p>
      </template>
      <template #cell-category="{ item }">
        <span class="text-sm text-neutral-600">{{ item.categoryName || '-' }}</span>
      </template>
      <template #cell-answer="{ item }">
        <p class="text-sm text-neutral-500 truncate max-w-xs">{{ item.answer || '-' }}</p>
      </template>
      <template #mobile-card="{ item }">
        <div class="flex items-center justify-between mb-1">
          <p class="text-sm font-medium text-neutral-900 truncate flex-1 min-w-0">{{ item.question }}</p>
        </div>
        <div class="flex items-center gap-4 text-xs text-neutral-400">
          <span>{{ item.categoryName || '-' }}</span>
        </div>
      </template>
    </DomainDataTable>

    <template #pagination>
      <UiPagination
        v-if="totalPages > 0 && !isLoading"
        v-model:current-page="currentPage"
        :total-pages="totalPages"
        :total-items="totalItems"
        :per-page="perPage"
        @change="handlePageChange"
      />
    </template>
  </LayoutListPage>

  <!-- FAQ 카테고리 관리 모달 -->
  <UiModal v-model="showCategoryModal" title="FAQ 카테고리 관리" size="md">
    <!-- 등록 영역 -->
    <div class="flex gap-2 mb-4">
      <input
        v-model="newCategoryName"
        type="text"
        placeholder="새 카테고리명 입력"
        class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        @keyup.enter="handleAddCategory"
      >
      <UiButton variant="primary" size="sm" :disabled="isCategorySaving" @click="handleAddCategory">
        등록
      </UiButton>
    </div>

    <!-- 카테고리 리스트 -->
    <div class="border border-neutral-200 rounded-lg divide-y divide-neutral-200 max-h-80 overflow-y-auto">
      <div
        v-if="categories.length === 0"
        class="px-4 py-8 text-center text-sm text-neutral-400"
      >
        등록된 카테고리가 없습니다.
      </div>

      <div
        v-for="cat in categories"
        :key="cat.id"
        class="flex items-center justify-between px-4 py-3"
      >
        <!-- 수정 모드 -->
        <template v-if="editingCategory === cat.id">
          <div class="flex gap-2 flex-1">
            <input
              v-model="editCategoryName"
              type="text"
              class="flex-1 px-3 py-1.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              @keyup.enter="handleEditCategory(cat)"
            >
            <UiButton variant="primary" size="sm" @click="handleEditCategory(cat)">저장</UiButton>
            <UiButton variant="ghost" size="sm" @click="cancelEditCategory">취소</UiButton>
          </div>
        </template>

        <!-- 보기 모드 -->
        <template v-else>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-neutral-900">{{ cat.name }}</span>
            <UiBadge :variant="cat.isActive ? 'success' : 'warning'" size="sm">
              {{ cat.isActive ? '활성' : '비활성' }}
            </UiBadge>
          </div>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
              aria-label="수정"
              @click="startEditCategory(cat)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              type="button"
              class="p-1.5 rounded-lg text-neutral-400 hover:text-error-500 hover:bg-error-50"
              aria-label="삭제"
              @click="handleDeleteCategory(cat)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </template>
      </div>
    </div>
  </UiModal>
</template>
