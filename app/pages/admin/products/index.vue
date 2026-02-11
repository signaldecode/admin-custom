<script setup>
/**
 * 상품 목록 페이지
 * - 검색: 상품명, 상품ID
 * - 필터: 상태, 할인여부, 태그
 * - 벌크 선택 + 상태 변경
 * - 페이지네이션 (30개)
 */

import { useUiStore } from '~/stores/ui'
import { useApi } from '~/composables/useApi'
import { formatCurrency } from '~/utils/formatters'

const router = useRouter()
const uiStore = useUiStore()
const { get } = useApi()

// 검색 필터
const filterStatus = ref('')
const filterDiscount = ref('')
const filterTag = ref('')
const searchType = ref('PRODUCT_NAME')
const searchKeyword = ref('')

const searchOptions = [
  { value: 'PRODUCT_NAME', label: '상품명' },
  { value: 'PRODUCT_ID', label: '상품ID' },
]

const statusOptions = [
  { value: 'ON_SALE', label: '판매중' },
  { value: 'DISCONTINUED', label: '판매중지' },
  { value: 'SOLD_OUT', label: '품절' },
]

const discountOptions = [
  { value: 'true', label: '할인중' },
  { value: 'false', label: '할인없음' },
]

// TODO: 태그 목록 API 연동 시 동적으로 변경
const tagOptions = ref([])

// 상태 매핑 (API 응답값 기준)
const statusMap = {
  ON_SALE: { label: '판매중', variant: 'success' },
  DISCONTINUED: { label: '판매중지', variant: 'neutral' },
  SOLD_OUT: { label: '품절', variant: 'error' },
}

// 로딩 상태
const isLoading = ref(false)

// 페이지네이션
const currentPage = ref(1)
const perPage = 30
const totalItems = ref(0)
const totalPages = computed(() => Math.ceil(totalItems.value / perPage))

// 상품 목록
const products = ref([])

// 벌크 선택
const selectedIds = ref([])

// 상태 변경 모달
const showStatusModal = ref(false)
const selectedStatus = ref('')

// 상품 목록 조회 API
const fetchProducts = async () => {
  isLoading.value = true

  try {
    // API 파라미터 구성
    const params = {
      page: currentPage.value,
      size: perPage,
    }

    // 필터 적용 (빈 값이 아닐 때만)
    if (filterStatus.value) {
      params.status = filterStatus.value
    }
    if (filterDiscount.value) {
      params.hasDiscount = filterDiscount.value
    }
    if (filterTag.value) {
      params.tagId = filterTag.value
    }
    if (searchKeyword.value) {
      params.searchType = searchType.value
      params.keyword = searchKeyword.value
    }

    const response = await get('/admin/products', params)

    // 응답 데이터 매핑
    products.value = response.data.content
    totalItems.value = response.data.total_elements

    // 페이지 변경 시 선택 초기화
    selectedIds.value = []
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '상품 목록을 불러오는데 실패했습니다.',
    })
    products.value = []
    totalItems.value = 0
  } finally {
    isLoading.value = false
  }
}

// 할인 여부 확인
const hasDiscount = (product) => {
  return product.regularPrice > product.salePrice
}

// 검색 실행
const handleSearch = () => {
  currentPage.value = 1
  fetchProducts()
}

// 검색 초기화
const handleReset = () => {
  filterStatus.value = ''
  filterDiscount.value = ''
  filterTag.value = ''
  searchType.value = 'name'
  searchKeyword.value = ''
  currentPage.value = 1
  fetchProducts()
}

// 페이지 변경
const handlePageChange = (page) => {
  currentPage.value = page
  fetchProducts()
}

// 테이블 컬럼 정의
const tableColumns = [
  { key: 'id', label: 'ID', width: 'w-16', align: 'center' },
  { key: 'thumbnailUrl', label: '이미지', width: 'w-16' },
  { key: 'name', label: '상품명' },
  { key: 'categoryName', label: '카테고리' },
  { key: 'salePrice', label: '판매가', align: 'right' },
  { key: 'discountRate', label: '할인', align: 'center' },
  { key: 'stockQuantity', label: '재고', align: 'center' },
  { key: 'tags', label: '태그', align: 'center' },
  { key: 'status', label: '상태', align: 'center' },
]

// 전체 선택/해제
const handleSelectAll = (selectAll) => {
  if (selectAll) {
    selectedIds.value = products.value.map((p) => p.id)
  } else {
    selectedIds.value = []
  }
}

// 개별 선택
const handleSelect = (id) => {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
}

// 상태 변경 모달 열기
const openStatusModal = () => {
  selectedStatus.value = ''
  showStatusModal.value = true
}

// 상태 변경 실행
const handleStatusChange = async () => {
  if (!selectedStatus.value) return

  // Mock: 로컬 데이터 업데이트
  products.value = products.value.map((product) => {
    if (selectedIds.value.includes(product.id)) {
      return { ...product, status: selectedStatus.value }
    }
    return product
  })

  const changedCount = selectedIds.value.length
  showStatusModal.value = false
  selectedIds.value = []

  uiStore.showToast({
    type: 'success',
    message: `${changedCount}건의 상품 상태가 변경되었습니다.`,
  })
}

// 상품 상세/수정으로 이동
const goToDetail = (productId) => {
  router.push(`/admin/products/${productId}`)
}

// 상품 등록으로 이동
const goToNew = () => {
  router.push('/admin/products/new')
}

// 초기 로드
onMounted(() => {
  fetchProducts()
})
</script>

<template>
  <LayoutListPage title="상품 목록">
    <!-- Description -->
    <template #description>
      전체 상품 {{ totalItems.toLocaleString() }}개
    </template>

    <!-- Actions -->
    <template #actions>
      <UiButton variant="primary" @click="goToNew">
        상품 등록
      </UiButton>
    </template>

    <!-- Filters -->
    <template #filters>
      <DomainFilterCard @search="handleSearch" @reset="handleReset">
        <template #selects>
          <select
            v-model="filterStatus"
            class="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">상태 전체</option>
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <select
            v-model="filterDiscount"
            class="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">할인 전체</option>
            <option v-for="option in discountOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <select
            v-if="tagOptions.length > 0"
            v-model="filterTag"
            class="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">태그 전체</option>
            <option v-for="option in tagOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <select
            v-model="searchType"
            class="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option v-for="option in searchOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </template>
        <template #search>
          <input
            v-model="searchKeyword"
            type="text"
            :placeholder="`${searchOptions.find(o => o.value === searchType)?.label}(으)로 검색`"
            class="flex-1 min-w-0 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            @keyup.enter="handleSearch"
          >
        </template>
      </DomainFilterCard>
    </template>

    <!-- Bulk Actions -->
    <template #bulk>
      <DomainBulkActionBar :count="selectedIds.length" :show="selectedIds.length > 0">
        <UiButton variant="primary" size="sm" @click="openStatusModal">
          상태 변경
        </UiButton>
        <UiButton variant="ghost" size="sm" @click="selectedIds = []">
          선택 해제
        </UiButton>
      </DomainBulkActionBar>
    </template>

    <!-- Loading -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center bg-white rounded-lg border border-neutral-200">
      <UiSpinner size="lg" />
    </div>

    <!-- Product List -->
    <DomainDataTable
      v-else
      :columns="tableColumns"
      :items="products"
      :selected-ids="selectedIds"
      selectable
      empty-title="상품이 없습니다"
      empty-description="상품을 등록해보세요."
      @select="handleSelect"
      @select-all="handleSelectAll"
      @row-click="(product) => goToDetail(product.id)"
    >
      <!-- ID -->
      <template #cell-id="{ item }">
        <span class="text-sm text-neutral-500 font-mono">{{ item.id }}</span>
      </template>

      <!-- 썸네일 -->
      <template #cell-thumbnailUrl="{ item }">
        <div class="w-12 h-12 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0">
          <img
            v-if="item.thumbnailUrl"
            :src="item.thumbnailUrl"
            :alt="item.name"
            class="w-full h-full object-cover"
          >
          <div v-else class="w-full h-full bg-neutral-200 flex items-center justify-center text-neutral-400 text-xs">
            IMG
          </div>
        </div>
      </template>

      <!-- 상품명 -->
      <template #cell-name="{ item }">
        <div>
          <p class="text-sm font-medium text-neutral-900 line-clamp-1">{{ item.name }}</p>
          <p class="text-xs text-neutral-500">옵션 {{ item.optionCount }}개</p>
        </div>
      </template>

      <!-- 카테고리 -->
      <template #cell-categoryName="{ item }">
        <span class="text-sm text-neutral-600">{{ item.categoryName }}</span>
      </template>

      <!-- 판매가 -->
      <template #cell-salePrice="{ item }">
        <div class="text-right">
          <p v-if="hasDiscount(item)" class="text-xs text-neutral-400 line-through">
            {{ formatCurrency(item.regularPrice) }}
          </p>
          <p class="text-sm font-medium text-neutral-900">
            {{ formatCurrency(item.salePrice) }}
          </p>
        </div>
      </template>

      <!-- 할인 -->
      <template #cell-discountRate="{ item }">
        <span
          v-if="item.discountRate"
          class="text-sm font-medium text-error-600"
        >
          {{ item.discountRate }}
        </span>
        <span v-else class="text-sm text-neutral-400">-</span>
      </template>

      <!-- 재고 -->
      <template #cell-stockQuantity="{ item }">
        <span
          :class="[
            'text-sm font-medium',
            item.stockQuantity === 0 ? 'text-error-600' : item.stockQuantity < 10 ? 'text-warning-600' : 'text-neutral-700',
          ]"
        >
          {{ item.stockQuantity }}
        </span>
      </template>

      <!-- 태그 -->
      <template #cell-tags="{ item }">
        <div class="flex flex-wrap gap-1 justify-center">
          <template v-if="item.tags && item.tags.length > 0">
            <UiBadge v-for="tag in item.tags" :key="tag" variant="info" size="sm">
              {{ tag }}
            </UiBadge>
          </template>
          <span v-else class="text-neutral-400">-</span>
        </div>
      </template>

      <!-- 상태 -->
      <template #cell-status="{ item }">
        <UiBadge :variant="statusMap[item.status]?.variant || 'neutral'" size="sm">
          {{ statusMap[item.status]?.label || item.status }}
        </UiBadge>
      </template>

      <!-- 모바일 카드 -->
      <template #mobile-card="{ item }">
        <div class="flex gap-3">
          <!-- 썸네일 -->
          <div class="w-16 h-16 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0">
            <img
              v-if="item.thumbnailUrl"
              :src="item.thumbnailUrl"
              :alt="item.name"
              class="w-full h-full object-cover"
            >
            <div v-else class="w-full h-full bg-neutral-200 flex items-center justify-center text-neutral-400 text-xs">
              IMG
            </div>
          </div>

          <!-- 정보 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2 mb-1">
              <p class="text-sm font-medium text-neutral-900 line-clamp-1">{{ item.name }}</p>
              <UiBadge :variant="statusMap[item.status]?.variant" size="sm" class="flex-shrink-0">
                {{ statusMap[item.status]?.label }}
              </UiBadge>
            </div>
            <div class="flex items-center gap-2 text-xs text-neutral-500 mb-1">
              <span class="font-mono">#{{ item.id }}</span>
              <span>{{ item.categoryName }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="hasDiscount(item)" class="text-xs text-neutral-400 line-through">
                {{ formatCurrency(item.regularPrice) }}
              </span>
              <span class="text-sm font-semibold text-neutral-900">
                {{ formatCurrency(item.salePrice) }}
              </span>
              <span v-if="item.discountRate" class="text-xs font-medium text-error-600">
                {{ item.discountRate }}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs text-neutral-500">재고 {{ item.stockQuantity }}</span>
              <span class="text-xs text-neutral-500">옵션 {{ item.optionCount }}개</span>
            </div>
            <div v-if="item.tags && item.tags.length > 0" class="flex gap-1 mt-2">
              <UiBadge v-for="tag in item.tags" :key="tag" variant="info" size="sm">
                {{ tag }}
              </UiBadge>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty action -->
      <template #empty>
        <UiButton variant="primary" size="sm" @click="goToNew">
          상품 등록하기
        </UiButton>
      </template>
    </DomainDataTable>

    <!-- Pagination -->
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

    <!-- Status Change Modal -->
    <UiModal
      v-model="showStatusModal"
      title="상품 상태 변경"
      size="sm"
    >
      <p class="text-sm text-neutral-600 mb-4">
        선택한 <span class="font-medium text-neutral-900">{{ selectedIds.length }}개</span>의 상품 상태를 변경합니다.
      </p>

      <div class="space-y-2">
        <label
          v-for="option in statusOptions"
          :key="option.value"
          :class="[
            'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
            selectedStatus === option.value
              ? 'border-primary-500 bg-primary-50'
              : 'border-neutral-200 hover:border-neutral-300',
          ]"
        >
          <input
            v-model="selectedStatus"
            type="radio"
            :value="option.value"
            class="w-4 h-4 text-primary-600 focus:ring-primary-500"
          >
          <span class="font-medium">{{ option.label }}</span>
          <UiBadge :variant="statusMap[option.value]?.variant" size="sm" class="ml-auto">
            {{ option.label }}
          </UiBadge>
        </label>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UiButton variant="outline" @click="showStatusModal = false">
            취소
          </UiButton>
          <UiButton variant="primary" :disabled="!selectedStatus" @click="handleStatusChange">
            변경
          </UiButton>
        </div>
      </template>
    </UiModal>
  </LayoutListPage>
</template>
