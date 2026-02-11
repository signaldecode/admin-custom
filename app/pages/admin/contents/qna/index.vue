<script setup>
/**
 * Q&A 목록 페이지
 * GET /admin/qnas
 * - status: PENDING | ANSWERED | CLOSED
 * - qnaType: PRODUCT | ORDER | GENERAL | SHIPPING | PAYMENT | MEMBERSHIP
 * - keyword: string
 * - page: number (0-based)
 * - size: number (default: 20)
 */

import { useUiStore } from '~/stores/ui'
import { useApi } from '~/composables/useApi'
import { formatDate } from '~/utils/formatters'

const router = useRouter()
const uiStore = useUiStore()
const { get } = useApi()

// Q&A 타입 옵션
const qnaTypeOptions = [
  { value: 'PRODUCT', label: '상품문의' },
  { value: 'ORDER', label: '주문문의' },
  { value: 'GENERAL', label: '일반문의' },
  { value: 'SHIPPING', label: '배송문의' },
  { value: 'PAYMENT', label: '결제문의' },
  { value: 'MEMBERSHIP', label: '회원문의' },
]

// 상태 옵션
const statusOptions = [
  { value: 'PENDING', label: '답변대기', color: 'warning' },
  { value: 'ANSWERED', label: '답변완료', color: 'success' },
  { value: 'CLOSED', label: '종료', color: 'neutral' },
]

// Q&A 목록
const qnaList = ref([])

// 로딩 상태
const isLoading = ref(false)

// 필터
const filterStatus = ref('')
const filterQnaType = ref('')
const searchKeyword = ref('')

// 페이지네이션
const currentPage = ref(1)
const perPage = 20
const totalItems = ref(0)
const totalPages = computed(() => Math.ceil(totalItems.value / perPage))

// Q&A 목록 조회 API
const fetchQnaList = async () => {
  isLoading.value = true

  try {
    const params = {
      page: currentPage.value - 1, // API는 0-based
      size: perPage,
    }

    // 필터 적용
    if (filterStatus.value) {
      params.status = filterStatus.value
    }
    if (filterQnaType.value) {
      params.qnaType = filterQnaType.value
    }
    if (searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim()
    }

    const response = await get('/admin/qnas', params)

    qnaList.value = response.data.content || []
    totalItems.value = response.data.total_elements || 0
    selectedIds.value = []
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || 'Q&A 목록을 불러오는데 실패했습니다.',
    })
    qnaList.value = []
    totalItems.value = 0
  } finally {
    isLoading.value = false
  }
}

// 테이블 컬럼
const tableColumns = [
  { key: 'status', label: '상태', width: 'w-24' },
  { key: 'qnaType', label: '유형', width: 'w-28' },
  { key: 'title', label: '제목' },
  { key: 'createdAt', label: '작성일', width: 'w-36' },
]

// 벌크 선택
const selectedIds = ref([])
const handleSelectAll = (selectAll) => {
  selectedIds.value = selectAll ? qnaList.value.map((q) => q.id) : []
}
const handleSelect = (id) => {
  const idx = selectedIds.value.indexOf(id)
  idx > -1 ? selectedIds.value.splice(idx, 1) : selectedIds.value.push(id)
}

// 벌크 삭제
const bulkDelete = () => {
  if (!selectedIds.value.length || !confirm(`선택한 ${selectedIds.value.length}개를 삭제하시겠습니까?`)) return
  // TODO: 벌크 삭제 API 연동
  qnaList.value = qnaList.value.filter((q) => !selectedIds.value.includes(q.id))
  selectedIds.value = []
  uiStore.showToast({ type: 'success', message: '삭제되었습니다.' })
}

// 답변대기 건수
const pendingCount = computed(() => qnaList.value.filter((q) => q.status === 'PENDING').length)

// 헬퍼
const getStatusBadge = (status) => {
  return statusOptions.find((s) => s.value === status) || { label: status || '-', color: 'neutral' }
}

const getQnaTypeLabel = (qnaType) => {
  return qnaTypeOptions.find((t) => t.value === qnaType)?.label || qnaType || '-'
}

// 페이지 이동
const goToDetail = (qna) => router.push(`/admin/contents/qna/${qna.id}`)

// 검색
const handleSearch = () => {
  currentPage.value = 1
  fetchQnaList()
}

const handleReset = () => {
  filterStatus.value = ''
  filterQnaType.value = ''
  searchKeyword.value = ''
  currentPage.value = 1
  fetchQnaList()
}

// 페이지 변경
const handlePageChange = (page) => {
  currentPage.value = page
  fetchQnaList()
}

// 초기 로드
onMounted(() => {
  fetchQnaList()
})
</script>

<template>
  <LayoutListPage title="Q&A 관리">
    <template #description>
      고객 문의에 답변합니다.
      <span v-if="pendingCount > 0" class="text-warning-600 font-medium">(답변 대기 {{ pendingCount }}건)</span>
    </template>

    <template #filters>
      <DomainFilterCard @search="handleSearch" @reset="handleReset">
        <template #selects>
          <select
            v-model="filterStatus"
            class="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">상태 전체</option>
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <select
            v-model="filterQnaType"
            class="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">유형 전체</option>
            <option v-for="opt in qnaTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </template>
        <template #search>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="제목, 내용 검색"
            class="flex-1 min-w-0 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            @keyup.enter="handleSearch"
          >
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
      :items="qnaList"
      :selected-ids="selectedIds"
      selectable
      empty-title="등록된 Q&A가 없습니다"
      empty-description="고객 문의가 등록되면 여기에 표시됩니다."
      @select="handleSelect"
      @select-all="handleSelectAll"
      @row-click="goToDetail"
    >
      <template #cell-status="{ item }">
        <UiBadge :variant="getStatusBadge(item.status).color" size="sm">
          {{ getStatusBadge(item.status).label }}
        </UiBadge>
      </template>

      <template #cell-qnaType="{ item }">
        <span class="text-sm text-neutral-600">{{ getQnaTypeLabel(item.qnaType) }}</span>
      </template>

      <template #cell-title="{ item }">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-neutral-900 truncate">{{ item.title || '-' }}</span>
          <svg
            v-if="item.isSecret"
            class="w-4 h-4 text-neutral-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <svg
            v-if="item.isAnswered"
            class="w-4 h-4 text-success-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </template>

      <template #cell-createdAt="{ item }">
        <span class="text-sm text-neutral-500">{{ item.createdAt ? formatDate(item.createdAt) : '-' }}</span>
      </template>

      <template #mobile-card="{ item }">
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex items-center gap-2">
            <UiBadge :variant="getStatusBadge(item.status).color" size="sm">
              {{ getStatusBadge(item.status).label }}
            </UiBadge>
            <span class="text-xs text-neutral-500">{{ getQnaTypeLabel(item.qnaType) }}</span>
          </div>
          <div class="flex items-center gap-1">
            <svg
              v-if="item.isSecret"
              class="w-4 h-4 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <svg
              v-if="item.isAnswered"
              class="w-4 h-4 text-success-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <p class="text-sm font-medium text-neutral-900 mb-1 truncate">{{ item.title || '-' }}</p>
        <div class="flex items-center gap-3 text-xs text-neutral-400">
          <span>{{ item.createdAt ? formatDate(item.createdAt) : '-' }}</span>
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
