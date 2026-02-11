<script setup>
/**
 * 교환/반품 페이지
 * - 교환요청, 반품요청 상태 주문만 표시
 * - 벌크 선택 + 상태 변경
 */
import { formatCurrency, formatDate } from '~/utils/formatters'
import { useUiStore } from '~/stores/ui'

const router = useRouter()

// 검색 필터
const filterType = ref('')      // 유형 필터 (교환/반품)
const filterStatus = ref('')    // 상태 필터 (요청/승인/완료 등)
const searchType = ref('ORDER_NUMBER')
const searchKeyword = ref('')

const searchOptions = [
  { value: 'ORDER_NUMBER', label: '주문번호' },
  { value: 'USER_ID', label: '유저ID' },
  { value: 'PHONE', label: '연락처' },
]

// 유형에 따른 상태 필터 옵션
const statusFilterOptions = computed(() => {
  if (filterType.value === 'CANCEL') {
    return [
      { value: 'REQUESTED', label: '요청' },
      { value: 'APPROVED', label: '승인' },
      { value: 'ON_HOLD', label: '보류' },
      { value: 'COMPLETED', label: '완료' },
      { value: 'REJECTED', label: '거절' },
    ]
  }
  if (filterType.value === 'EXCHANGE' || filterType.value === 'RETURN') {
    return [
      { value: 'REQUESTED', label: '요청' },
      { value: 'APPROVED', label: '승인' },
      { value: 'IN_PROGRESS', label: '진행중' },
      { value: 'ON_HOLD', label: '보류' },
      { value: 'COMPLETED', label: '완료' },
      { value: 'REJECTED', label: '거절' },
    ]
  }
  // 전체일 경우 모든 상태
  return [
    { value: 'REQUESTED', label: '요청' },
    { value: 'APPROVED', label: '승인' },
    { value: 'IN_PROGRESS', label: '진행중' },
    { value: 'ON_HOLD', label: '보류' },
    { value: 'COMPLETED', label: '완료' },
    { value: 'REJECTED', label: '거절' },
  ]
})

// 유형 변경 시 상태 필터 초기화
watch(filterType, () => {
  filterStatus.value = ''
})

// 로딩 상태
const isLoading = ref(false)
const error = ref(null)

// 페이지네이션
const currentPage = ref(1)
const perPage = 30
const totalItems = ref(0)
const totalPages = computed(() => Math.ceil(totalItems.value / perPage))

// 주문 목록
const orders = ref([])

// 벌크 선택
const selectedIds = ref([])

// 상태 변경 모달
const showStatusModal = ref(false)
const selectedStatus = ref('')

// 클레임 상태 옵션 (백엔드 상태값)
const claimStatusOptions = [
  { value: 'APPROVED', label: '승인' },
  { value: 'IN_PROGRESS', label: '진행중' },
  { value: 'ON_HOLD', label: '보류' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'REJECTED', label: '거절' },
]

// 클레임 상태 매핑 (백엔드 상태값에 맞게)
const statusMap = {
  REQUESTED: { label: '요청', variant: 'warning' },
  APPROVED: { label: '승인', variant: 'info' },
  IN_PROGRESS: { label: '진행중', variant: 'info' },
  ON_HOLD: { label: '보류', variant: 'warning' },
  COMPLETED: { label: '완료', variant: 'success' },
  REJECTED: { label: '거절', variant: 'error' },
}

// 사유 타입 매핑 (통일된 버전)
const reasonTypeMap = {
  CHANGE_OF_MIND: '단순 변심',
  DEFECTIVE: '상품 불량/파손',
  WRONG_DELIVERY: '오배송',
  WRONG_OPTION: '옵션 오선택',
  DELAYED_DELIVERY: '배송 지연',
  INCOMPATIBILITY: '호환성 문제',
  OUT_OF_STOCK: '품절',
  PRICE_ERROR: '가격 오류',
  CUSTOMER_REQUEST: '고객 요청',
  OTHER: '기타',
}

// 클레임 타입 매핑
const claimTypeMap = {
  CANCEL: { label: '취소', variant: 'neutral' },
  EXCHANGE: { label: '교환', variant: 'warning' },
  RETURN: { label: '반품', variant: 'error' },
}

// 조합된 상태 라벨 반환 함수
const getCombinedStatusLabel = (claimType, status) => {
  const typeLabel = claimTypeMap[claimType]?.label || claimType
  const statusLabel = statusMap[status]?.label || status
  return `${typeLabel}${statusLabel}`
}

// 클레임 유형 기반 뱃지 variant
const getClaimVariant = (claimType) => {
  return claimTypeMap[claimType]?.variant || 'neutral'
}

// 클레임 유형 필터 옵션
const claimTypeOptions = [
  { value: 'CANCEL', label: '취소' },
  { value: 'EXCHANGE', label: '교환' },
  { value: 'RETURN', label: '반품' },
]

const fetchOrders = async () => {
  isLoading.value = true
  error.value = null

  try {
    const { $api } = useNuxtApp()
    const params = {
      page: currentPage.value,
      size: perPage,
    }

    if (filterType.value) {
      params.claimType = filterType.value
    }

    if (filterStatus.value) {
      params.status = filterStatus.value
    }

    if (searchKeyword.value) {
      params.searchType = searchType.value
      params.keyword = searchKeyword.value
    }

    const response = await $api.get('/admin/claims', params)
    // 응답 구조: response.data.data || response.data
    const data = response.data.data || response.data

    orders.value = data.content || []
    totalItems.value = data.total_elements || 0

    // 페이지 변경 시 선택 초기화
    selectedIds.value = []
  } catch (err) {
    console.error('Claims fetch error:', err)
    error.value = err.data?.message || err.data?.error?.message || err.message || '데이터를 불러오는데 실패했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 검색 실행
const handleSearch = () => {
  currentPage.value = 1
  fetchOrders()
}

// 검색 초기화
const handleReset = () => {
  filterType.value = ''
  filterStatus.value = ''
  searchType.value = 'ORDER_NUMBER'
  searchKeyword.value = ''
  currentPage.value = 1
  fetchOrders()
}

// 페이지 변경
const handlePageChange = (page) => {
  currentPage.value = page
  fetchOrders()
}

// 테이블 컬럼 정의
const tableColumns = [
  { key: 'orderNumber', label: '주문번호' },
  { key: 'requestedAt', label: '접수일시' },
  { key: 'userId', label: '유저ID' },
  { key: 'phone', label: '연락처' },
  { key: 'reasonType', label: '사유' },
  { key: 'itemCount', label: '건수', align: 'center' },
  { key: 'refundAmount', label: '환불금액', align: 'right' },
  { key: 'claimType', label: '유형', align: 'center' },
  { key: 'status', label: '상태', align: 'center' },
]

// 전체 선택/해제
const handleSelectAll = (selectAll) => {
  if (selectAll) {
    selectedIds.value = orders.value.map((o) => o.claimId)
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

  // 실제로는 API 호출
  orders.value = orders.value.map((order) => {
    if (selectedIds.value.includes(order.id)) {
      return { ...order, status: selectedStatus.value }
    }
    return order
  })

  const changedCount = selectedIds.value.length
  showStatusModal.value = false
  selectedIds.value = []

  // 성공 알림
  const uiStore = useUiStore()
  uiStore.showToast({
    type: 'success',
    message: `${changedCount}건의 상태가 변경되었습니다.`,
  })
}

// 주문 상세로 이동 (클레임에서 진입했음을 표시)
const goToDetail = (item) => {
  router.push({
    path: `/admin/orders/${item.orderId}`,
    query: { from: 'claims', claimId: item.claimId, claimType: item.claimType, claimStatus: item.status },
  })
}

// 초기 로드
onMounted(() => {
  fetchOrders()
})
</script>

<template>
  <LayoutListPage title="교환/반품/취소">
    <!-- Description -->
    <template #description>
      전체 {{ totalItems.toLocaleString() }}건
    </template>

    <!-- Filters -->
    <template #filters>
      <DomainFilterCard @search="handleSearch" @reset="handleReset">
        <template #selects>
          <!-- 유형 필터 -->
          <select
            v-model="filterType"
            class="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">유형 전체</option>
            <option v-for="option in claimTypeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <!-- 상태 필터 -->
          <select
            v-model="filterStatus"
            class="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">상태 전체</option>
            <option v-for="option in statusFilterOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <!-- 검색 유형 -->
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

    <!-- Error -->
    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center bg-white rounded-lg border border-neutral-200 min-h-96">
      <p class="text-error-600 mb-4">{{ error }}</p>
      <UiButton variant="outline" @click="fetchOrders">다시 시도</UiButton>
    </div>

    <!-- Order List -->
    <DomainDataTable
      v-else
      :columns="tableColumns"
      :items="orders"
      :selected-ids="selectedIds"
      selectable
      id-key="claimId"
      empty-title="검색 결과가 없습니다"
      empty-description="다른 검색어로 다시 시도해보세요."
      @select="handleSelect"
      @select-all="handleSelectAll"
      @row-click="(item) => goToDetail(item)"
    >
      <!-- 주문번호 -->
      <template #cell-orderNumber="{ item }">
        <span class="text-sm font-medium text-primary-600">{{ item.orderNumber }}</span>
      </template>

      <!-- 접수일시 -->
      <template #cell-requestedAt="{ item }">
        <span class="text-sm text-neutral-600">{{ formatDate(item.requestedAt, 'long') }}</span>
      </template>

      <!-- 유저ID -->
      <template #cell-userId="{ item }">
        <span class="text-sm text-neutral-900">{{ item.userId }}</span>
      </template>

      <!-- 연락처 -->
      <template #cell-phone="{ item }">
        <span class="text-sm text-neutral-600">{{ item.phone }}</span>
      </template>

      <!-- 사유 -->
      <template #cell-reasonType="{ item }">
        <span class="text-sm text-neutral-700">{{ reasonTypeMap[item.reasonType] || item.reasonType }}</span>
      </template>

      <!-- 건수 -->
      <template #cell-itemCount="{ item }">
        <span class="text-sm text-neutral-700">{{ item.itemCount }}건</span>
      </template>

      <!-- 환불금액 -->
      <template #cell-refundAmount="{ item }">
        <span class="text-sm font-medium text-neutral-900">{{ item.refundAmount ? formatCurrency(item.refundAmount) : '-' }}</span>
      </template>

      <!-- 유형 -->
      <template #cell-claimType="{ item }">
        <UiBadge :variant="getClaimVariant(item.claimType)" size="sm">
          {{ claimTypeMap[item.claimType]?.label || item.claimType }}
        </UiBadge>
      </template>

      <!-- 상태 -->
      <template #cell-status="{ item }">
        <UiBadge :variant="statusMap[item.status]?.variant || 'neutral'" size="sm">
          {{ statusMap[item.status]?.label || item.status }}
        </UiBadge>
      </template>

      <!-- 모바일 카드 -->
      <template #mobile-card="{ item }">
        <div class="flex items-start justify-between mb-2">
          <div>
            <span class="text-sm font-medium text-primary-600">{{ item.orderNumber }}</span>
            <p class="text-xs text-neutral-500">{{ formatDate(item.requestedAt, 'long') }}</p>
          </div>
          <div class="flex items-center gap-1">
            <UiBadge :variant="getClaimVariant(item.claimType)" size="sm">
              {{ claimTypeMap[item.claimType]?.label || item.claimType }}
            </UiBadge>
            <UiBadge :variant="statusMap[item.status]?.variant || 'neutral'" size="sm">
              {{ statusMap[item.status]?.label || item.status }}
            </UiBadge>
          </div>

        </div>
        <div class="text-sm text-neutral-600 space-y-1">
          <p>{{ item.userId }}</p>
          <p>{{ item.phone }}</p>
          <p class="text-neutral-500">사유: {{ reasonTypeMap[item.reasonType] || item.reasonType }}</p>
        </div>
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-neutral-100">
          <span class="text-sm text-neutral-500">{{ item.itemCount }}건</span>
          <span class="text-sm font-semibold text-neutral-900">{{ item.refundAmount ? formatCurrency(item.refundAmount) : '-' }}</span>
        </div>
      </template>

      <!-- Empty action -->
      <template #empty>
        <UiButton variant="outline" size="sm" @click="handleReset">
          검색 초기화
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
      title="상태 변경"
      size="sm"
    >
      <p class="text-sm text-neutral-600 mb-4">
        선택한 <span class="font-medium text-neutral-900">{{ selectedIds.length }}건</span>의 상태를 변경합니다.
      </p>

      <div class="space-y-2 max-h-72 overflow-y-auto">
        <label
          v-for="option in claimStatusOptions"
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
          <UiButton
            variant="outline"
            @click="showStatusModal = false"
          >
            취소
          </UiButton>
          <UiButton
            variant="primary"
            :disabled="!selectedStatus"
            @click="handleStatusChange"
          >
            변경
          </UiButton>
        </div>
      </template>
    </UiModal>
  </LayoutListPage>
</template>
