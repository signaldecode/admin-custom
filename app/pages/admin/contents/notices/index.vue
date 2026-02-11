<script setup>
/**
 * 공지사항 목록 페이지
 * GET /admin/notices
 * - status: ACTIVE | INACTIVE
 * - page: number (0-based)
 * - size: number (default: 20)
 */

import { useUiStore } from '~/stores/ui'
import { useApi } from '~/composables/useApi'
import { formatDate } from '~/utils/formatters'

const router = useRouter()
const uiStore = useUiStore()
const { get } = useApi()

// 상태 옵션
const statusOptions = [
  { value: 'ACTIVE', label: '노출', color: 'success' },
  { value: 'INACTIVE', label: '숨김', color: 'warning' },
]

// 분류(타입) 옵션
const typeOptions = [
  { value: 'NOTICE', label: '공지' },
  { value: 'EVENT', label: '이벤트' },
  { value: 'GUIDELINES', label: '안내' },
  { value: 'INSPECTION', label: '점검' },
]

// 공지사항 목록
const notices = ref([])

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

// 공지사항 목록 조회 API
const fetchNotices = async () => {
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

    const response = await get('/admin/notices', params)

    notices.value = response.data.content || []
    totalItems.value = response.data.total_elements || 0
    selectedIds.value = []
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '공지사항 목록을 불러오는데 실패했습니다.',
    })
    notices.value = []
    totalItems.value = 0
  } finally {
    isLoading.value = false
  }
}

// 프론트 필터링 (keyword는 API에서 지원 안 함)
const filteredNotices = computed(() => {
  let result = [...notices.value]
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter((n) => n.title?.toLowerCase().includes(keyword))
  }
  // 고정글 우선 정렬
  return result.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
})

// 테이블 컬럼
const tableColumns = [
  { key: 'title', label: '제목' },
  { key: 'type', label: '분류' },
  { key: 'viewCount', label: '조회수', align: 'center' },
  { key: 'createdAt', label: '등록일' },
  { key: 'status', label: '상태', align: 'center' },
]

// 벌크 선택
const selectedIds = ref([])
const handleSelectAll = (selectAll) => {
  selectedIds.value = selectAll ? filteredNotices.value.map((n) => n.id) : []
}
const handleSelect = (id) => {
  const idx = selectedIds.value.indexOf(id)
  idx > -1 ? selectedIds.value.splice(idx, 1) : selectedIds.value.push(id)
}

// 벌크 삭제
const bulkDelete = () => {
  if (!selectedIds.value.length || !confirm(`선택한 ${selectedIds.value.length}개를 삭제하시겠습니까?`)) return
  // TODO: 벌크 삭제 API 연동
  notices.value = notices.value.filter((n) => !selectedIds.value.includes(n.id))
  selectedIds.value = []
  uiStore.showToast({ type: 'success', message: '삭제되었습니다.' })
}

// 헬퍼
const getStatusBadge = (status) => {
  return statusOptions.find((s) => s.value === status) || { label: status || '-', color: 'neutral' }
}

const getTypeLabel = (type) => {
  return typeOptions.find((t) => t.value === type)?.label || type || '-'
}

// 페이지 이동
const goToCreate = () => router.push('/admin/contents/notices/new')
const goToDetail = (notice) => router.push(`/admin/contents/notices/${notice.id}`)

// 검색
const handleSearch = () => {
  currentPage.value = 1
  fetchNotices()
}

const handleReset = () => {
  filterStatus.value = ''
  searchKeyword.value = ''
  currentPage.value = 1
  fetchNotices()
}

// 페이지 변경
const handlePageChange = (page) => {
  currentPage.value = page
  fetchNotices()
}

// 초기 로드
onMounted(() => {
  fetchNotices()
})
</script>

<template>
  <LayoutListPage title="공지사항 관리" description="공지사항을 관리합니다.">
    <template #actions>
      <UiButton variant="primary" @click="goToCreate">
        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        공지 등록
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
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
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
      :items="filteredNotices"
      :selected-ids="selectedIds"
      selectable
      empty-title="등록된 공지사항이 없습니다"
      empty-description="새 공지사항을 등록해보세요."
      @select="handleSelect"
      @select-all="handleSelectAll"
      @row-click="goToDetail"
    >
      <template #cell-title="{ item }">
        <div class="flex items-center gap-2">
          <span v-if="item.isPinned" class="text-primary-500">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v2h2a1 1 0 010 2h-1.268l-.686 6.858A2 2 0 0113.06 18H6.94a2 2 0 01-1.986-1.858L4.268 9H3a1 1 0 010-2h2V5z" />
            </svg>
          </span>
          <p class="text-sm font-medium text-neutral-900">{{ item.title || '-' }}</p>
        </div>
      </template>

      <template #cell-type="{ item }">
        <span class="text-sm text-neutral-600">{{ getTypeLabel(item.type) }}</span>
      </template>

      <template #cell-viewCount="{ item }">
        <span class="text-sm text-neutral-600">{{ (item.viewCount || 0).toLocaleString() }}</span>
      </template>

      <template #cell-createdAt="{ item }">
        <span class="text-sm text-neutral-600">{{ item.createdAt ? formatDate(item.createdAt) : '-' }}</span>
      </template>

      <template #cell-status="{ item }">
        <UiBadge :variant="getStatusBadge(item.status).color" size="sm">
          {{ getStatusBadge(item.status).label }}
        </UiBadge>
      </template>

      <template #mobile-card="{ item }">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <span v-if="item.isPinned" class="text-primary-500">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v2h2a1 1 0 010 2h-1.268l-.686 6.858A2 2 0 0113.06 18H6.94a2 2 0 01-1.986-1.858L4.268 9H3a1 1 0 010-2h2V5z" />
              </svg>
            </span>
            <p class="text-sm font-medium text-neutral-900 truncate">{{ item.title || '-' }}</p>
          </div>
          <UiBadge :variant="getStatusBadge(item.status).color" size="sm">
            {{ getStatusBadge(item.status).label }}
          </UiBadge>
        </div>
        <div class="flex items-center gap-4 text-xs text-neutral-400">
          <span>{{ getTypeLabel(item.type) }}</span>
          <span>{{ item.createdAt ? formatDate(item.createdAt) : '-' }}</span>
          <span>조회 {{ item.viewCount || 0 }}</span>
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
