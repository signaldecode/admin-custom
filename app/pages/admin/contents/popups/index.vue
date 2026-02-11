<script setup>
/**
 * 팝업 목록 페이지
 */

import { useUiStore } from '~/stores/ui'
import { useApi } from '~/composables/useApi'
import { formatDate } from '~/utils/formatters'

const router = useRouter()
const uiStore = useUiStore()
const { get } = useApi()

// 팝업 타입 옵션
const popupTypeOptions = [
  { value: 'CENTER', label: '중앙' },
  { value: 'FLOATING', label: '플로팅' },
]

// 닫기 옵션
const closeOptions = [
  { value: 'CLOSE', label: '닫기' },
  { value: 'TODAY', label: '오늘 하루' },
]

// 팝업 목록
const popups = ref([])

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

// 팝업 목록 조회 API
const fetchPopups = async () => {
  isLoading.value = true

  try {
    const params = {
      page: currentPage.value - 1, // API는 0-based
      size: perPage,
    }

    // status 필터 적용
    if (filterStatus.value) {
      params.status = filterStatus.value
    }

    const response = await get('/admin/popups', params)

    popups.value = response.data.content || []
    totalItems.value = response.data.total_elements || 0
    selectedIds.value = []
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '팝업 목록을 불러오는데 실패했습니다.',
    })
    popups.value = []
    totalItems.value = 0
  } finally {
    isLoading.value = false
  }
}

// 프론트 필터링 (keyword는 API에서 지원 안 함)
const filteredPopups = computed(() => {
  let result = [...popups.value]
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter((p) => p.name?.toLowerCase().includes(keyword))
  }
  return result
})

// 테이블 컬럼
const tableColumns = [
  { key: 'image', label: '이미지', width: 'w-20' },
  { key: 'name', label: '팝업명' },
  { key: 'popupType', label: '타입' },
  { key: 'period', label: '노출기간' },
  { key: 'status', label: '상태' },
]

// 벌크 선택
const selectedIds = ref([])
const handleSelectAll = (selectAll) => { selectedIds.value = selectAll ? filteredPopups.value.map((p) => p.id) : [] }
const handleSelect = (id) => {
  const idx = selectedIds.value.indexOf(id)
  idx > -1 ? selectedIds.value.splice(idx, 1) : selectedIds.value.push(id)
}

// 벌크 액션
const bulkDelete = () => {
  if (!selectedIds.value.length || !confirm(`선택한 ${selectedIds.value.length}개의 팝업을 삭제하시겠습니까?`)) return
  popups.value = popups.value.filter((p) => !selectedIds.value.includes(p.id))
  selectedIds.value = []
  uiStore.showToast({ type: 'success', message: '삭제되었습니다.' })
}

const bulkChangeStatus = (status) => {
  if (!selectedIds.value.length) return
  popups.value = popups.value.map((p) => selectedIds.value.includes(p.id) ? { ...p, status } : p)
  selectedIds.value = []
  uiStore.showToast({ type: 'success', message: '상태가 변경되었습니다.' })
}

// 헬퍼
const getStatusBadge = (status) => {
  return status === 'ACTIVE'
    ? { label: '활성', color: 'success' }
    : { label: '비활성', color: 'warning' }
}
const getPopupTypeLabel = (type) => popupTypeOptions.find((t) => t.value === type)?.label || type || '-'

// 페이지 이동
const goToCreate = () => router.push('/admin/contents/popups/new')
const goToDetail = (popup) => router.push(`/admin/contents/popups/${popup.id}`)

// 검색
const handleSearch = () => {
  currentPage.value = 1
  fetchPopups()
}
const handleReset = () => {
  filterStatus.value = ''
  searchKeyword.value = ''
  currentPage.value = 1
  fetchPopups()
}

// 페이지 변경
const handlePageChange = (page) => {
  currentPage.value = page
  fetchPopups()
}

// 초기 로드
onMounted(() => {
  fetchPopups()
})
</script>

<template>
  <LayoutListPage title="팝업 관리" description="사이트 팝업을 관리합니다.">
    <template #actions>
      <UiButton variant="primary" @click="goToCreate">
        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        팝업 등록
      </UiButton>
    </template>

    <template #filters>
      <DomainFilterCard @search="handleSearch" @reset="handleReset">
        <template #selects>
          <select v-model="filterStatus" class="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">상태 전체</option>
            <option value="ACTIVE">활성</option>
            <option value="INACTIVE">비활성</option>
          </select>
        </template>
        <template #search>
          <input v-model="searchKeyword" type="text" placeholder="팝업명으로 검색" class="flex-1 min-w-0 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" @keyup.enter="handleSearch">
        </template>
      </DomainFilterCard>
    </template>

    <template #bulk>
      <DomainBulkActionBar :count="selectedIds.length" :show="selectedIds.length > 0">
        <UiButton variant="outline" size="sm" @click="bulkChangeStatus('ACTIVE')">활성</UiButton>
        <UiButton variant="outline" size="sm" @click="bulkChangeStatus('INACTIVE')">비활성</UiButton>
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
      :items="filteredPopups"
      :selected-ids="selectedIds"
      selectable
      empty-title="등록된 팝업이 없습니다"
      empty-description="새 팝업을 등록해보세요."
      @select="handleSelect"
      @select-all="handleSelectAll"
      @row-click="goToDetail"
    >
      <template #cell-image="{ item }">
        <div class="w-16 h-10 bg-neutral-100 rounded overflow-hidden flex-shrink-0">
          <img
            v-if="item.image"
            :src="item.image"
            :alt="item.name"
            class="w-full h-full object-cover"
          >
          <div v-else class="w-full h-full flex items-center justify-center text-neutral-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </template>

      <template #cell-name="{ item }">
        <p class="text-sm font-medium text-neutral-900">{{ item.name || '-' }}</p>
      </template>

      <template #cell-popupType="{ item }">
        <span class="text-sm text-neutral-600">{{ getPopupTypeLabel(item.popupType) }}</span>
      </template>

      <template #cell-period="{ item }">
        <div class="text-sm text-neutral-600">
          <p>{{ item.startedAt ? formatDate(item.startedAt) : '-' }}</p>
          <p class="text-xs text-neutral-400">~ {{ item.endedAt ? formatDate(item.endedAt) : '종료일 없음' }}</p>
        </div>
      </template>

      <template #cell-status="{ item }">
        <UiBadge :variant="getStatusBadge(item.status).color" size="sm">{{ getStatusBadge(item.status).label }}</UiBadge>
      </template>

      <template #mobile-card="{ item }">
        <div class="flex gap-3">
          <div class="w-14 h-10 bg-neutral-100 rounded overflow-hidden flex-shrink-0">
            <img v-if="item.image" :src="item.image" :alt="item.name" class="w-full h-full object-cover">
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <p class="text-sm font-medium text-neutral-900 truncate">{{ item.name || '-' }}</p>
              <UiBadge :variant="getStatusBadge(item.status).color" size="sm">{{ getStatusBadge(item.status).label }}</UiBadge>
            </div>
            <div class="flex items-center gap-4 text-xs text-neutral-400">
              <span>{{ getPopupTypeLabel(item.popupType) }}</span>
              <span>{{ item.startedAt ? formatDate(item.startedAt) : '-' }} ~</span>
            </div>
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
</template>
