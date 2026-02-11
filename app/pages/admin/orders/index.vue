<script setup>
/**
 * 주문 목록 페이지
 * - 검색: 주문번호, 유저ID, 연락처
 * - 벌크 선택 + 상태 변경
 * - 페이지네이션 (30개)
 */
import { useUiStore } from '~/stores/ui'
import { formatCurrency, formatDate, truncateAddress } from '~/utils/formatters'

const router = useRouter()
const route = useRoute()
const { $api } = useNuxtApp()
const uiStore = useUiStore()

// 검색 필터
const filterStatus = ref('')
const searchType = ref('ORDER_NUMBER')
const searchKeyword = ref('')

const searchOptions = [
  { value: 'ORDER_NUMBER', label: '주문번호' },
  { value: 'USER_ID', label: '유저ID' },
  { value: 'PHONE', label: '연락처' },
]

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
const isChangingStatus = ref(false)

// 주문 상태 옵션 (필터용)
const statusOptions = [
  { value: 'PENDING', label: '입금대기' },
  { value: 'PAID', label: '결제완료' },
  { value: 'PREPARING', label: '상품준비중' },
  { value: 'SHIPPING', label: '배송중' },
  { value: 'DELIVERED', label: '배송완료' },
  { value: 'CONFIRMED', label: '구매확정' },
  { value: 'CANCELLED', label: '주문취소' },
  { value: 'REFUNDED', label: '환불완료' },
  { value: 'RETURN_REQUESTED', label: '반품요청' },
  { value: 'RETURN_IN_PROGRESS', label: '반품진행중' },
  { value: 'RETURN_COMPLETED', label: '반품완료' },
  { value: 'EXCHANGE_REQUESTED', label: '교환요청' },
  { value: 'EXCHANGE_IN_PROGRESS', label: '교환진행중' },
  { value: 'EXCHANGE_COMPLETED', label: '교환완료' },
]

// 주문 상태 매핑
const statusMap = {
  PENDING: { label: '입금대기', variant: 'neutral' },
  PAID: { label: '결제완료', variant: 'primary' },
  PREPARING: { label: '상품준비중', variant: 'warning' },
  SHIPPING: { label: '배송중', variant: 'info' },
  DELIVERED: { label: '배송완료', variant: 'success' },
  CONFIRMED: { label: '구매확정', variant: 'success' },
  CANCELLED: { label: '주문취소', variant: 'neutral' },
  REFUNDED: { label: '환불완료', variant: 'neutral' },
  // 반품
  RETURN_REQUESTED: { label: '반품요청', variant: 'warning' },
  RETURN_IN_PROGRESS: { label: '반품진행중', variant: 'warning' },
  RETURN_COMPLETED: { label: '반품완료', variant: 'neutral' },
  PARTIAL_RETURN_IN_PROGRESS: { label: '부분반품진행중', variant: 'warning' },
  PARTIAL_RETURN_COMPLETED: { label: '부분반품완료', variant: 'neutral' },
  // 교환
  EXCHANGE_REQUESTED: { label: '교환요청', variant: 'warning' },
  EXCHANGE_IN_PROGRESS: { label: '교환진행중', variant: 'warning' },
  EXCHANGE_COMPLETED: { label: '교환완료', variant: 'neutral' },
  PARTIAL_EXCHANGE_IN_PROGRESS: { label: '부분교환진행중', variant: 'warning' },
  PARTIAL_EXCHANGE_COMPLETED: { label: '부분교환완료', variant: 'neutral' },
}

// 결제수단 매핑
const paymentMethodMap = {
  CARD: '신용카드',
  BANK_TRANSFER: '계좌이체',
  VIRTUAL_ACCOUNT: '가상계좌',
  PHONE: '휴대폰',
  KAKAO_PAY: '카카오페이',
  NAVER_PAY: '네이버페이',
  POINT: '포인트',
}

// API 데이터 로드
const fetchOrders = async () => {
  isLoading.value = true
  error.value = null

  try {
    const params = {
      page: currentPage.value,
      size: perPage,
    }

    if (filterStatus.value) {
      params.status = filterStatus.value
    }

    if (searchKeyword.value) {
      params.searchType = searchType.value
      params.keyword = searchKeyword.value
    }

    const response = await $api.get('/admin/orders', params)
    const data = response.data

    orders.value = data.content || []
    totalItems.value = data.total_elements || 0

    // 페이지 변경 시 선택 초기화
    selectedIds.value = []
  } catch (err) {
    console.error('Orders fetch error:', err)
    error.value = err.data?.error?.message || err.data?.message || err.message || '주문 목록을 불러오는데 실패했습니다.'
  } finally {
    isLoading.value = false
  }
}

// API 데이터 로드
const handleSearch = () => {
  currentPage.value = 1
  fetchOrders()
}

// 검색 초기화
const handleReset = () => {
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
  { key: 'orderedAt', label: '주문일시' },
  { key: 'userId', label: '유저ID', align: 'center' },
  { key: 'phone', label: '연락처' },
  { key: 'address', label: '주소' },
  { key: 'itemCount', label: '건수', align: 'center' },
  { key: 'paymentMethod', label: '결제수단', align: 'center' },
  { key: 'grandTotal', label: '주문금액', align: 'right' },
  { key: 'status', label: '주문상태', align: 'center' },
]

// 전체 선택/해제
const handleSelectAll = (selectAll) => {
  if (selectAll) {
    selectedIds.value = orders.value.map((o) => o.id)
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
  if (!selectedStatus.value || selectedIds.value.length === 0) return

  isChangingStatus.value = true

  try {
    const response = await $api.patch('/admin/orders/statuses', {
      orderIds: selectedIds.value,
      status: selectedStatus.value,
    })

    const changedCount = response.data || selectedIds.value.length

    showStatusModal.value = false
    selectedIds.value = []

    uiStore.showToast({
      type: 'success',
      message: `${changedCount}건의 주문 상태가 변경되었습니다.`,
    })

    // 목록 새로고침
    fetchOrders()
  } catch (err) {
    console.error('Status change error:', err)
    uiStore.showToast({
      type: 'error',
      message: err.data?.error?.message || err.data?.message || err.message || '상태 변경에 실패했습니다.',
    })
  } finally {
    isChangingStatus.value = false
  }
}

// 주문 상세로 이동
const goToDetail = (orderId) => {
  router.push(`/admin/orders/${orderId}`)
}

// 초기 로드
onMounted(() => {
  if (route.query.searchType) searchType.value = route.query.searchType
  if (route.query.keyword) searchKeyword.value = route.query.keyword
  if (route.query.status) filterStatus.value = route.query.status
  if (route.query.page) currentPage.value = parseInt(route.query.page) || 1
  fetchOrders()
})
</script>

<template>
  <LayoutListPage title="주문 목록">
    <!-- Description -->
    <template #description>
      전체 주문 {{ totalItems.toLocaleString() }}건
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
    <div v-if="isLoading" class="flex-1 flex items-center justify-center bg-white rounded-lg border border-neutral-200 min-h-96">
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
      empty-title="검색 결과가 없습니다"
      empty-description="다른 검색어로 다시 시도해보세요."
      @select="handleSelect"
      @select-all="handleSelectAll"
      @row-click="(order) => goToDetail(order.id)"
    >
      <!-- 주문번호 -->
      <template #cell-orderNumber="{ item }">
        <span class="text-sm font-medium text-primary-600">{{ item.orderNumber }}</span>
      </template>

      <!-- 주문일시 -->
      <template #cell-orderedAt="{ item }">
        <span class="text-sm text-neutral-600">{{ formatDate(item.orderedAt) }}</span>
      </template>

      <!-- 유저ID -->
      <template #cell-userId="{ item }">
        <span class="text-sm text-neutral-900">{{ item.userId }}</span>
      </template>

      <!-- 연락처 -->
      <template #cell-phone="{ item }">
        <span class="text-sm text-neutral-600">{{ item.phone || '-' }}</span>
      </template>

      <!-- 주소 -->
      <template #cell-address="{ item }">
        <span class="text-sm text-neutral-600" :title="item.address">{{ truncateAddress(item.address, 25) }}</span>
      </template>

      <!-- 건수 -->
      <template #cell-itemCount="{ item }">
        <span class="text-sm text-neutral-700">{{ item.itemCount }}건</span>
      </template>

      <!-- 결제수단 -->
      <template #cell-paymentMethod="{ item }">
        <span class="text-sm text-neutral-600">{{ paymentMethodMap[item.paymentMethod] || item.paymentMethod }}</span>
      </template>

      <!-- 주문금액 -->
      <template #cell-grandTotal="{ item }">
        <span class="text-sm font-medium text-neutral-900">{{ formatCurrency(item.grandTotal) }}</span>
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
            <p class="text-xs text-neutral-500">{{ formatDate(item.orderedAt) }}</p>
          </div>
          <UiBadge :variant="statusMap[item.status]?.variant || 'neutral'" size="sm">
            {{ statusMap[item.status]?.label || item.status }}
          </UiBadge>
        </div>
        <div class="text-sm text-neutral-600 space-y-1">
          <p>유저ID: {{ item.userId }}</p>
          <p>{{ item.phone || '-' }}</p>
          <p class="text-xs text-neutral-500 truncate">{{ item.address || '-' }}</p>
        </div>
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-neutral-100">
          <span class="text-sm text-neutral-500">{{ item.itemCount }}건 · {{ paymentMethodMap[item.paymentMethod] || item.paymentMethod }}</span>
          <span class="text-sm font-semibold text-neutral-900">{{ formatCurrency(item.grandTotal) }}</span>
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
      title="주문 상태 변경"
      size="sm"
    >
      <p class="text-sm text-neutral-600 mb-4">
        선택한 <span class="font-medium text-neutral-900">{{ selectedIds.length }}건</span>의 주문 상태를 변경합니다.
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
          <UiButton
            variant="outline"
            :disabled="isChangingStatus"
            @click="showStatusModal = false"
          >
            취소
          </UiButton>
          <UiButton
            variant="primary"
            :disabled="!selectedStatus"
            :loading="isChangingStatus"
            @click="handleStatusChange"
          >
            변경
          </UiButton>
        </div>
      </template>
    </UiModal>
  </LayoutListPage>
</template>
