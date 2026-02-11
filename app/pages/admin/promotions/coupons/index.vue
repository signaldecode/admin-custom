<script setup>
/**
 * 쿠폰 관리 목록 페이지
 */

import { useUiStore } from '~/stores/ui'
import { useCoupon } from '~/composables/useCoupon'

const router = useRouter()
const uiStore = useUiStore()
const {
  couponTypeOptions,
  issuanceStatusOptions,
  getCoupons,
  updateCouponStatus,
} = useCoupon()

// 쿠폰 목록
const coupons = ref([])

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

// 쿠폰 목록 조회
const fetchCoupons = async () => {
  isLoading.value = true

  try {
    const params = {
      page: currentPage.value - 1,
      size: perPage,
    }

    if (searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim()
    }

    if (filterStatus.value) {
      params.status = filterStatus.value
    }

    const response = await getCoupons(params)

    coupons.value = response.content
    totalItems.value = response.totalElements
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '쿠폰 목록을 불러오는데 실패했습니다.',
    })
  } finally {
    isLoading.value = false
  }
}

// 테이블 컬럼
const tableColumns = [
  { key: 'name', label: '쿠폰명' },
  { key: 'couponType', label: '쿠폰 타입', width: 'w-24', align: 'center' },
  { key: 'discount', label: '할인', width: 'w-28', align: 'right' },
  { key: 'issued', label: '발급/한도', width: 'w-28', align: 'center' },
  { key: 'status', label: '상태', width: 'w-24', align: 'center' },
  { key: 'actions', label: '발급 관리', width: 'w-28', align: 'center' },
]

// 헬퍼 함수
const getStatusBadge = (status) => {
  return issuanceStatusOptions.find((s) => s.value === status) || { label: status || '-', color: 'neutral' }
}

const getCouponTypeLabel = (type) => {
  return couponTypeOptions.find((t) => t.value === type)?.label || type || '-'
}

const formatDiscount = (type, value) => {
  if (type === 'RATE') {
    return `${value}%`
  }
  return `${value?.toLocaleString() || 0}원`
}

const formatIssuedCount = (issued, total) => {
  const issuedCount = issued?.toLocaleString() || 0
  const totalText = total === 0 || total === null ? '무제한' : total?.toLocaleString() || 0
  return `${issuedCount} / ${totalText}`
}

// 페이지 이동
const goToCreate = () => router.push('/admin/promotions/coupons/new')
const goToDetail = (coupon) => router.push(`/admin/promotions/coupons/${coupon.id}`)

// 검색
const handleSearch = () => {
  currentPage.value = 1
  fetchCoupons()
}
const handleReset = () => {
  filterStatus.value = ''
  searchKeyword.value = ''
  currentPage.value = 1
  fetchCoupons()
}

// 페이지 변경
const handlePageChange = (page) => {
  currentPage.value = page
  fetchCoupons()
}

// 상태 변경 모달
const showStatusModal = ref(false)
const selectedCoupon = ref(null)
const targetStatus = ref('')

const openStatusModal = (coupon, status) => {
  selectedCoupon.value = coupon
  targetStatus.value = status
  showStatusModal.value = true
}

const handleStatusChange = async () => {
  try {
    await updateCouponStatus(selectedCoupon.value.id, targetStatus.value)

    // 목록에서 상태 즉시 반영
    selectedCoupon.value.status = targetStatus.value

    const statusLabel = getStatusBadge(targetStatus.value).label
    uiStore.showToast({
      type: 'success',
      message: `쿠폰이 ${statusLabel} 처리되었습니다.`,
    })

    showStatusModal.value = false
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '상태 변경에 실패했습니다.',
    })
  }
}

// 초기 로드
onMounted(() => {
  fetchCoupons()
})
</script>

<template>
  <LayoutListPage title="쿠폰 관리" description="프로모션 쿠폰을 관리합니다.">
    <template #actions>
      <UiButton variant="primary" @click="goToCreate">
        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        쿠폰 등록
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
            <option v-for="opt in issuanceStatusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </template>
        <template #search>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="쿠폰명으로 검색"
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
          <p class="font-medium mb-1">쿠폰 운영 안내</p>
          <ul class="text-primary-700 space-y-0.5">
            <li>- 발급중 상태에서는 수정할 수 없습니다. 발급 중지 후 수정해주세요.</li>
            <li>- 종료된 쿠폰은 다시 발급할 수 없습니다.</li>
            <li>- 소비자는 한 주문당 최대 1개의 쿠폰만 사용 가능합니다.</li>
          </ul>
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
      :items="coupons"
      empty-title="등록된 쿠폰이 없습니다"
      empty-description="새 쿠폰을 등록해보세요."
      @row-click="goToDetail"
    >
      <template #cell-name="{ item }">
        <div>
          <p class="text-sm font-medium text-neutral-900">{{ item.name || '-' }}</p>
          <p v-if="item.description" class="text-xs text-neutral-500 mt-0.5 line-clamp-1">{{ item.description }}</p>
        </div>
      </template>

      <template #cell-couponType="{ item }">
        <span class="text-sm text-neutral-600">{{ getCouponTypeLabel(item.couponType) }}</span>
      </template>

      <template #cell-discount="{ item }">
        <span class="text-sm font-medium text-primary-600">{{ formatDiscount(item.discountType, item.discountValue) }}</span>
      </template>

      <template #cell-issued="{ item }">
        <span class="text-sm text-neutral-600">{{ formatIssuedCount(item.issuedQuantity, item.totalQuantity) }}</span>
      </template>

      <template #cell-status="{ item }">
        <UiBadge :variant="getStatusBadge(item.status).color" size="sm">
          {{ getStatusBadge(item.status).label }}
        </UiBadge>
      </template>

      <template #cell-actions="{ item }">
        <!-- 등록 → 발급 시작 -->
        <button
          v-if="item.status === 'REGISTERED'"
          class="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          @click.stop="openStatusModal(item, 'ACTIVE')"
        >
          발급 시작
        </button>

        <!-- 발급중 → 발급 중지 -->
        <button
          v-else-if="item.status === 'ACTIVE'"
          class="px-3 py-1.5 text-xs font-medium text-white bg-warning-600 hover:bg-warning-700 rounded-lg transition-colors"
          @click.stop="openStatusModal(item, 'STOPPED')"
        >
          발급 중지
        </button>

        <!-- 발급중지 → 발급 재개 또는 종료 -->
        <template v-else-if="item.status === 'STOPPED'">
          <div class="flex gap-1">
            <button
              class="px-2 py-1.5 text-xs font-medium text-white bg-success-600 hover:bg-success-700 rounded-lg transition-colors"
              @click.stop="openStatusModal(item, 'ACTIVE')"
            >
              재개
            </button>
            <button
              class="px-2 py-1.5 text-xs font-medium text-white bg-error-600 hover:bg-error-700 rounded-lg transition-colors"
              @click.stop="openStatusModal(item, 'ENDED')"
            >
              종료
            </button>
          </div>
        </template>

        <!-- 종료 → 비활성 -->
        <span v-else class="text-xs text-neutral-400">-</span>
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
            <span>{{ getCouponTypeLabel(item.couponType) }}</span>
            <span class="font-medium text-primary-600">{{ formatDiscount(item.discountType, item.discountValue) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <p class="text-xs text-neutral-400">
              발급: {{ formatIssuedCount(item.issuedQuantity, item.totalQuantity) }}
            </p>
            <!-- 모바일 발급 버튼 -->
            <button
              v-if="item.status === 'REGISTERED'"
              class="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg"
              @click.stop="openStatusModal(item, 'ACTIVE')"
            >
              발급 시작
            </button>
            <button
              v-else-if="item.status === 'ACTIVE'"
              class="px-3 py-1.5 text-xs font-medium text-white bg-warning-600 rounded-lg"
              @click.stop="openStatusModal(item, 'STOPPED')"
            >
              발급 중지
            </button>
            <template v-else-if="item.status === 'STOPPED'">
              <div class="flex gap-1">
                <button
                  class="px-2 py-1.5 text-xs font-medium text-white bg-success-600 rounded-lg"
                  @click.stop="openStatusModal(item, 'ACTIVE')"
                >
                  재개
                </button>
                <button
                  class="px-2 py-1.5 text-xs font-medium text-white bg-error-600 rounded-lg"
                  @click.stop="openStatusModal(item, 'ENDED')"
                >
                  종료
                </button>
              </div>
            </template>
          </div>
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

  <!-- 상태 변경 모달 -->
  <DomainCouponStatusModal
    v-model="showStatusModal"
    :coupon-name="selectedCoupon?.name || ''"
    :target-status="targetStatus"
    @confirm="handleStatusChange"
  />
</template>
