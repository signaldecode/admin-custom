<script setup>
/**
 * 리뷰 목록 페이지
 * - 리뷰 조회 전용 (수정 불가, 삭제만 가능)
 */

import { useUiStore } from '~/stores/ui'
import { useReview } from '~/composables/useReview'
import { formatDate } from '~/utils/formatters'

const router = useRouter()
const uiStore = useUiStore()
const { getReviews, toggleVisibility } = useReview()

// 리뷰 목록
const reviews = ref([])

// 로딩 상태
const isLoading = ref(false)

// 필터
const filterRating = ref('')
const searchKeyword = ref('')

// 페이지네이션
const currentPage = ref(1)
const perPage = 20
const totalItems = ref(0)
const totalPages = computed(() => Math.ceil(totalItems.value / perPage))

// 리뷰 목록 조회
const fetchReviews = async () => {
  isLoading.value = true

  try {
    const params = {
      page: currentPage.value - 1,
      size: perPage,
    }

    if (searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim()
    }

    if (filterRating.value) {
      params.rating = Number(filterRating.value)
    }

    const response = await getReviews(params)

    reviews.value = response.content
    totalItems.value = response.totalElements
    selectedIds.value = []
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '리뷰 목록을 불러오는데 실패했습니다.',
    })
  } finally {
    isLoading.value = false
  }
}

// 테이블 컬럼
const tableColumns = [
  { key: 'title', label: '제목' },
  { key: 'author', label: '작성자', width: 'w-28' },
  { key: 'rating', label: '평점', width: 'w-24', align: 'center' },
  { key: 'isVisible', label: '노출', width: 'w-20', align: 'center' },
  { key: 'createdAt', label: '작성일', width: 'w-28' },
]

// 벌크 선택
const selectedIds = ref([])
const handleSelectAll = (selectAll) => {
  selectedIds.value = selectAll ? reviews.value.map((r) => r.id) : []
}
const handleSelect = (id) => {
  const idx = selectedIds.value.indexOf(id)
  idx > -1 ? selectedIds.value.splice(idx, 1) : selectedIds.value.push(id)
}

// 벌크 비활성화/활성화 토글
const bulkToggleVisibility = async () => {
  if (!selectedIds.value.length) return
  if (!confirm(`선택한 ${selectedIds.value.length}개의 리뷰를 비활성화/활성화 하시겠습니까?`)) return

  try {
    await toggleVisibility(selectedIds.value)
    uiStore.showToast({ type: 'success', message: '상태가 변경되었습니다.' })
    fetchReviews()
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '상태 변경에 실패했습니다.',
    })
  }
}

// 별점 렌더링
const renderStars = (rating) => {
  const filled = Math.floor(rating || 0)
  return '★'.repeat(filled) + '☆'.repeat(5 - filled)
}

// 페이지 이동
const goToDetail = (review) => router.push(`/admin/contents/reviews/${review.id}`)

// 검색
const handleSearch = () => {
  currentPage.value = 1
  fetchReviews()
}
const handleReset = () => {
  filterRating.value = ''
  searchKeyword.value = ''
  currentPage.value = 1
  fetchReviews()
}

// 페이지 변경
const handlePageChange = (page) => {
  currentPage.value = page
  fetchReviews()
}

// 초기 로드
onMounted(() => {
  fetchReviews()
})
</script>

<template>
  <LayoutListPage title="리뷰 관리" description="상품 리뷰를 관리합니다.">
    <template #filters>
      <DomainFilterCard @search="handleSearch" @reset="handleReset">
        <template #selects>
          <select
            v-model="filterRating"
            class="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">평점 전체</option>
            <option value="5">5점</option>
            <option value="4">4점</option>
            <option value="3">3점</option>
            <option value="2">2점</option>
            <option value="1">1점</option>
          </select>
        </template>
        <template #search>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="제목, 상품명, 작성자로 검색"
            class="flex-1 min-w-0 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            @keyup.enter="handleSearch"
          >
        </template>
      </DomainFilterCard>
    </template>

    <template #bulk>
      <DomainBulkActionBar :count="selectedIds.length" :show="selectedIds.length > 0">
        <UiButton variant="outline" size="sm" @click="bulkToggleVisibility">비활성화/활성화</UiButton>
      </DomainBulkActionBar>
    </template>

    <!-- 로딩 -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center bg-white rounded-lg border border-neutral-200">
      <UiSpinner size="lg" />
    </div>

    <DomainDataTable
      v-else
      :columns="tableColumns"
      :items="reviews"
      :selected-ids="selectedIds"
      selectable
      empty-title="등록된 리뷰가 없습니다"
      empty-description="아직 작성된 리뷰가 없습니다."
      @select="handleSelect"
      @select-all="handleSelectAll"
      @row-click="goToDetail"
    >
      <template #cell-title="{ item }">
        <div>
          <p class="text-sm font-medium text-neutral-900 line-clamp-1">{{ item.title || '-' }}</p>
          <p class="text-xs text-neutral-500 truncate">{{ item.productName || '-' }}</p>
        </div>
      </template>

      <template #cell-author="{ item }">
        <p class="text-sm text-neutral-600">{{ item.authorName || '-' }}</p>
      </template>

      <template #cell-rating="{ item }">
        <span class="text-sm text-warning-500">{{ renderStars(item.rating) }}</span>
      </template>

      <template #cell-isVisible="{ item }">
        <UiBadge :variant="item.isVisible ? 'success' : 'neutral'" size="sm">
          {{ item.isVisible ? '노출' : '숨김' }}
        </UiBadge>
      </template>

      <template #cell-createdAt="{ item }">
        <span class="text-sm text-neutral-500">{{ item.createdAt ? formatDate(item.createdAt) : '-' }}</span>
      </template>

      <template #mobile-card="{ item }">
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-neutral-900 truncate">{{ item.title || '-' }}</p>
              <p class="text-xs text-neutral-500 truncate">{{ item.productName || '-' }}</p>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-neutral-500">{{ item.authorName || '-' }}</span>
                <span class="text-xs text-warning-500">{{ renderStars(item.rating) }}</span>
              </div>
            </div>
            <UiBadge :variant="item.isVisible ? 'success' : 'neutral'" size="sm">
              {{ item.isVisible ? '노출' : '숨김' }}
            </UiBadge>
          </div>
          <p class="text-xs text-neutral-400">{{ item.createdAt ? formatDate(item.createdAt) : '-' }}</p>
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
