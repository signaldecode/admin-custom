<script setup>
/**
 * 배너 목록 페이지
 */

import { useUiStore } from '~/stores/ui'
import { useApi } from '~/composables/useApi'
import { formatDate } from '~/utils/formatters'

const router = useRouter()
const uiStore = useUiStore()
const { get, del, patch } = useApi()

// 배너 위치 옵션 (API 스펙에 맞춤)
const positionOptions = [
  { value: 'HERO', label: '히어로' },
  { value: 'SLIDE', label: '슬라이드' },
  { value: 'HALF', label: '하프' },
  { value: 'FULL', label: '풀' },
]

// 상태 옵션 (API 스펙에 맞춤)
const statusOptions = [
  { value: 'ACTIVE', label: '노출중', color: 'success' },
  { value: 'SCHEDULED', label: '예약', color: 'info' },
  { value: 'INACTIVE', label: '비활성', color: 'warning' },
]

// 배너 목록
const banners = ref([])

// 로딩 상태
const isLoading = ref(false)

// 필터
const filterPosition = ref('')
const filterStatus = ref('')
const searchKeyword = ref('')

// 페이지네이션
const currentPage = ref(1)
const perPage = 30
const totalItems = ref(0)
const totalPages = computed(() => Math.ceil(totalItems.value / perPage))

// 배너 목록 조회 API
const fetchBanners = async () => {
  isLoading.value = true

  try {
    const params = {
      page: currentPage.value - 1, // API는 0부터 시작
      size: perPage,
    }

    if (filterPosition.value) {
      params.position = filterPosition.value
    }
    if (filterStatus.value) {
      params.status = filterStatus.value
    }

    const response = await get('/admin/banners', params)

    banners.value = response.data.content
    totalItems.value = response.data.total_elements

    // 페이지 변경 시 선택 초기화
    selectedIds.value = []
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '배너 목록을 불러오는데 실패했습니다.',
    })
    banners.value = []
    totalItems.value = 0
  } finally {
    isLoading.value = false
  }
}

// 테이블 컬럼
const tableColumns = [
  { key: 'sortOrder', label: '순서', width: 'w-12' },
  { key: 'info', label: '배너정보' },
  { key: 'position', label: '위치' },
  { key: 'period', label: '노출기간' },
  { key: 'status', label: '상태' },
]

// 벌크 선택
const selectedIds = ref([])

const handleSelectAll = (selectAll) => {
  selectedIds.value = selectAll ? banners.value.map((b) => b.id) : []
}

const handleSelect = (id) => {
  const index = selectedIds.value.indexOf(id)
  index > -1 ? selectedIds.value.splice(index, 1) : selectedIds.value.push(id)
}

// 벌크 삭제
const bulkDelete = async () => {
  if (selectedIds.value.length === 0) return
  if (!confirm(`선택한 ${selectedIds.value.length}개의 배너를 삭제하시겠습니까?`)) return

  try {
    // 개별 삭제 API 순차 호출
    await Promise.all(
      selectedIds.value.map((id) => del(`/admin/banners/${id}`))
    )

    uiStore.showToast({ type: 'success', message: '선택한 배너가 삭제되었습니다.' })
    selectedIds.value = []
    fetchBanners()
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '삭제에 실패했습니다.',
    })
  }
}

// 벌크 상태 변경
const bulkChangeStatus = async (status) => {
  if (selectedIds.value.length === 0) return

  try {
    // 개별 상태 변경 API 순차 호출
    await Promise.all(
      selectedIds.value.map((id) => patch(`/admin/banners/${id}`, { status }))
    )

    uiStore.showToast({ type: 'success', message: '상태가 변경되었습니다.' })
    selectedIds.value = []
    fetchBanners()
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '상태 변경에 실패했습니다.',
    })
  }
}

// 헬퍼 함수
const getStatusBadge = (status) => statusOptions.find((s) => s.value === status) || { label: status, color: 'neutral' }
const getPositionLabel = (position) => positionOptions.find((p) => p.value === position)?.label || position

// 페이지 이동
const goToCreate = () => router.push('/admin/contents/banners/new')
const goToDetail = (banner) => router.push(`/admin/contents/banners/${banner.id}`)

// 검색
const handleSearch = () => {
  currentPage.value = 1
  fetchBanners()
}

const handleReset = () => {
  filterPosition.value = ''
  filterStatus.value = ''
  searchKeyword.value = ''
  currentPage.value = 1
  fetchBanners()
}

// 페이지 변경
const handlePageChange = (page) => {
  currentPage.value = page
  fetchBanners()
}

// 초기 로드
onMounted(() => {
  fetchBanners()
})
</script>

<template>
  <LayoutListPage title="배너 관리" description="사이트 배너를 관리합니다.">
    <template #actions>
      <UiButton variant="primary" @click="goToCreate">
        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        배너 등록
      </UiButton>
    </template>

    <template #filters>
      <DomainFilterCard @search="handleSearch" @reset="handleReset">
        <template #selects>
          <select v-model="filterPosition" class="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">위치 전체</option>
            <option v-for="opt in positionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <select v-model="filterStatus" class="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">상태 전체</option>
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </template>
        <template #search>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="제목으로 검색"
            class="flex-1 min-w-0 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            @keyup.enter="handleSearch"
          >
        </template>
      </DomainFilterCard>
    </template>

    <template #bulk>
      <DomainBulkActionBar :count="selectedIds.length" :show="selectedIds.length > 0">
        <UiButton variant="outline" size="sm" @click="bulkChangeStatus('ACTIVE')">노출</UiButton>
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
      :items="banners"
      :selected-ids="selectedIds"
      selectable
      empty-title="등록된 배너가 없습니다"
      empty-description="새 배너를 등록해보세요."
      @select="handleSelect"
      @select-all="handleSelectAll"
      @row-click="goToDetail"
    >
      <template #cell-sortOrder="{ item }">
        <span class="w-6 h-6 flex items-center justify-center bg-neutral-100 rounded text-xs font-medium text-neutral-600">{{ item.sortOrder }}</span>
      </template>

      <template #cell-info="{ item }">
        <div class="flex items-center gap-3">
          <div class="w-24 h-14 bg-neutral-100 rounded overflow-hidden flex-shrink-0">
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :alt="item.title"
              class="w-full h-full object-cover"
            >
            <div v-else class="w-full h-full flex items-center justify-center text-neutral-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p class="text-sm font-medium text-neutral-900 truncate">{{ item.title }}</p>
        </div>
      </template>

      <template #cell-position="{ item }">
        <span class="text-sm text-neutral-600">{{ getPositionLabel(item.position) }}</span>
      </template>

      <template #cell-period="{ item }">
        <div class="text-sm text-neutral-600">
          <p>{{ formatDate(item.startedAt) }}</p>
          <p class="text-xs text-neutral-400">~ {{ item.noEndDate ? '종료일 없음' : formatDate(item.endedAt) }}</p>
        </div>
      </template>

      <template #cell-status="{ item }">
        <UiBadge :variant="getStatusBadge(item.status).color" size="sm">{{ getStatusBadge(item.status).label }}</UiBadge>
      </template>

      <template #mobile-card="{ item }">
        <div class="flex items-center gap-2 mb-1">
          <span class="w-5 h-5 flex items-center justify-center bg-neutral-100 rounded text-xs font-medium text-neutral-600">{{ item.sortOrder }}</span>
          <p class="text-sm font-medium text-neutral-900 truncate flex-1">{{ item.title }}</p>
          <UiBadge :variant="getStatusBadge(item.status).color" size="sm">{{ getStatusBadge(item.status).label }}</UiBadge>
        </div>
        <div class="flex items-center gap-4 text-xs text-neutral-400">
          <span>{{ getPositionLabel(item.position) }}</span>
          <span>{{ formatDate(item.startedAt) }} ~</span>
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
