<script setup>
/**
 * 할인 관리 목록 페이지
 */

import { useUiStore } from '~/stores/ui'
import { usePromotion } from '~/composables/usePromotion'
import { formatDate } from '~/utils/formatters'

const router = useRouter()
const uiStore = useUiStore()
const { getPromotions } = usePromotion()

// 할인 종류 옵션
const discountTypeOptions = [
  { value: 'RATE', label: '정률 (%)' },
  { value: 'AMOUNT', label: '정액 (원)' },
]

// 상태 옵션
const statusOptions = [
  { value: 'ACTIVE', label: '활성', color: 'success' },
  { value: 'INACTIVE', label: '비활성', color: 'warning' },
  { value: 'EXPIRED', label: '만료', color: 'neutral' },
]

// 할인 목록
const discounts = ref([])

// 로딩 상태
const isLoading = ref(false)

// 필터
const filterStatus = ref('')
const searchKeyword = ref('')

// 페이지네이션
const currentPage = ref(1)
const perPage = 20
const totalItems = ref(0)
const totalPages = computed(() => Math.ceil(totalItems.value / perPage))

// 할인 목록 조회
const fetchDiscounts = async () => {
  isLoading.value = true

  try {
    const params = {
      page: currentPage.value - 1,
      size: perPage,
    }

    if (searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim()
    }

    const result = await getPromotions(params)

    discounts.value = result.content
    totalItems.value = result.totalElements
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '할인 목록을 불러오는데 실패했습니다.',
    })
    discounts.value = []
    totalItems.value = 0
  } finally {
    isLoading.value = false
  }
}

// 필터링된 목록 (status는 프론트 필터링)
const filteredList = computed(() => {
  let result = [...discounts.value]
  if (filterStatus.value) {
    result = result.filter((d) => d.status === filterStatus.value)
  }
  return result
})

// 테이블 컬럼
const tableColumns = [
  { key: 'name', label: '할인명' },
  { key: 'discountType', label: '할인 유형', width: 'w-28', align: 'center' },
  { key: 'discountValue', label: '할인 값', width: 'w-24', align: 'right' },
  { key: 'period', label: '적용 기간' },
  { key: 'status', label: '상태', width: 'w-24', align: 'center' },
]

// 헬퍼 함수
const getStatusBadge = (status) => {
  return statusOptions.find((s) => s.value === status) || { label: status || '-', color: 'neutral' }
}

const getDiscountTypeLabel = (type) => {
  return discountTypeOptions.find((t) => t.value === type)?.label || type || '-'
}

const formatDiscountValue = (type, value) => {
  if (type === 'RATE') {
    return `${value}%`
  }
  return `${value?.toLocaleString() || 0}원`
}

// 페이지 이동
const goToCreate = () => router.push('/admin/promotions/discounts/new')
const goToDetail = (discount) => router.push(`/admin/promotions/discounts/${discount.id}`)

// 검색
const handleSearch = () => {
  currentPage.value = 1
  fetchDiscounts()
}
const handleReset = () => {
  filterStatus.value = ''
  searchKeyword.value = ''
  currentPage.value = 1
  fetchDiscounts()
}

// 페이지 변경
const handlePageChange = (page) => {
  currentPage.value = page
  fetchDiscounts()
}

// 초기 로드
onMounted(() => {
  fetchDiscounts()
})
</script>

<template>
  <LayoutListPage title="할인 관리" description="프로모션 할인을 관리합니다.">
    <template #actions>
      <UiButton variant="primary" @click="goToCreate">
        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        할인 등록
      </UiButton>
    </template>

    <template #filters>
      <DomainFilterCard @search="handleSearch" @reset="handleReset">
        <template #selects>
          <select
            v-model="filterStatus"
            class="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">상태 전체</option>
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </template>
        <template #search>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="할인명으로 검색"
            class="flex-1 min-w-0 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            @keyup.enter="handleSearch"
          >
        </template>
      </DomainFilterCard>
    </template>

    <!-- 안내 툴팁 -->
    <div class="mb-4 p-4 bg-primary-50 border border-primary-200 rounded-lg">
      <div class="flex gap-3">
        <svg class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-sm text-primary-800">
          <p class="font-medium mb-1">할인 적용 안내</p>
          <p class="text-primary-700">상품 별 할인을 원하시면 <strong>상품 수정</strong>에서 할인을 등록하시고, 카테고리 별 또는 전체 할인을 원하실 땐 여기서 등록하세요.</p>
        </div>
      </div>
    </div>

    <!-- 로딩 -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center bg-white rounded-lg border border-neutral-200">
      <UiSpinner size="lg" />
    </div>

    <DomainDataTable
      v-else
      :columns="tableColumns"
      :items="filteredList"
      empty-title="등록된 할인이 없습니다"
      empty-description="새 할인을 등록해보세요."
      @row-click="goToDetail"
    >
      <template #cell-name="{ item }">
        <p class="text-sm font-medium text-neutral-900">{{ item.name || '-' }}</p>
        <p v-if="item.applicableTarget" class="text-xs text-neutral-500 mt-0.5">{{ item.applicableTarget }}</p>
      </template>

      <template #cell-discountType="{ item }">
        <span class="text-sm text-neutral-600">{{ getDiscountTypeLabel(item.discountType) }}</span>
      </template>

      <template #cell-discountValue="{ item }">
        <span class="text-sm font-medium text-primary-600">{{ formatDiscountValue(item.discountType, item.discountValue) }}</span>
      </template>

      <template #cell-period="{ item }">
        <div class="text-sm text-neutral-600">
          <p>{{ item.startedAt ? formatDate(item.startedAt) : '-' }}</p>
          <p class="text-xs text-neutral-400">~ {{ item.endedAt ? formatDate(item.endedAt) : '종료일 없음' }}</p>
        </div>
      </template>

      <template #cell-status="{ item }">
        <UiBadge :variant="getStatusBadge(item.status).color" size="sm">
          {{ getStatusBadge(item.status).label }}
        </UiBadge>
      </template>

      <template #mobile-card="{ item }">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium text-neutral-900">{{ item.name || '-' }}</p>
            <UiBadge :variant="getStatusBadge(item.status).color" size="sm">
              {{ getStatusBadge(item.status).label }}
            </UiBadge>
          </div>
          <div class="flex items-center gap-3 text-xs text-neutral-500">
            <span>{{ getDiscountTypeLabel(item.discountType) }}</span>
            <span class="font-medium text-primary-600">{{ formatDiscountValue(item.discountType, item.discountValue) }}</span>
          </div>
          <p v-if="item.applicableTarget" class="text-xs text-neutral-500">{{ item.applicableTarget }}</p>
          <p class="text-xs text-neutral-400">
            {{ item.startedAt ? formatDate(item.startedAt) : '-' }} ~ {{ item.endedAt ? formatDate(item.endedAt) : '종료일 없음' }}
          </p>
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
</template>
