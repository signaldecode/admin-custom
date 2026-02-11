<script setup>
/**
 * 회원 목록 페이지
 * - 검색: userID, 이름, 연락처
 * - 벌크 선택 + 등급 변경
 * - 페이지네이션 (30개)
 */

import { useUiStore } from '~/stores/ui'
import { useCatalogStore } from '~/stores/catalog'
import { useApi } from '~/composables/useApi'
import { formatCurrency } from '~/utils/formatters'

const router = useRouter()
const route = useRoute()
const uiStore = useUiStore()
const catalogStore = useCatalogStore()
const { get, patch } = useApi()

// 검색 필터
const filterGrade = ref('')
const filterStatus = ref('')
const searchType = ref('NAME')
const searchKeyword = ref('')

const searchOptions = [
  { value: 'USER_ID', label: '회원 ID' },
  { value: 'NAME', label: '이름' },
  { value: 'PHONE', label: '연락처' },
]

const statusOptions = [
  { value: 'ACTIVE', label: '활성' },
  { value: 'INACTIVE', label: '비활성' },
  { value: 'SUSPENDED', label: '정지' },
  { value: 'WITHDRAWN', label: '탈퇴' },
]

// 로딩 상태
const isLoading = ref(false)

// 페이지네이션
const currentPage = ref(1)
const perPage = 30
const totalItems = ref(0)
const totalPages = computed(() => Math.ceil(totalItems.value / perPage))

// 회원 목록
const users = ref([])

// 벌크 선택
const selectedIds = ref([])
const isAllSelected = computed(() => {
  return users.value.length > 0 && selectedIds.value.length === users.value.length
})
const isPartialSelected = computed(() => {
  return selectedIds.value.length > 0 && selectedIds.value.length < users.value.length
})

// 등급 변경 모달
const showGradeModal = ref(false)
const selectedGrade = ref('')

// 등급 옵션 (catalog store에서 조회)
const gradeOptions = computed(() =>
  catalogStore.grades.map((g) => ({
    value: g.grade_id,
    label: g.name,
  }))
)

// 회원 목록 조회 API
const fetchUsers = async () => {
  isLoading.value = true

  try {
    // API 파라미터 구성
    const params = {
      page: currentPage.value,
      size: perPage,
    }

    // 필터 적용 (빈 값이 아닐 때만)
    if (filterGrade.value) {
      params.grade = filterGrade.value
    }
    if (filterStatus.value) {
      params.status = filterStatus.value
    }
    if (searchKeyword.value) {
      params.searchType = searchType.value
      params.keyword = searchKeyword.value
    }

    const response = await get('/admin/users', params)

    // 응답 데이터 매핑
    users.value = response.data.content
    totalItems.value = response.data.total_elements

    // 페이지 변경 시 선택 초기화
    selectedIds.value = []
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '회원 목록을 불러오는데 실패했습니다.',
    })
    users.value = []
    totalItems.value = 0
  } finally {
    isLoading.value = false
  }
}

// 회원 등급 뱃지
const gradeVariant = {
  VVIP: 'error',
  VIP: 'warning',
  일반: 'neutral',
}

// 회원 상태 뱃지 (API 응답값 기준)
const statusMap = {
  ACTIVE: { label: '활성', variant: 'success' },
  INACTIVE: { label: '비활성', variant: 'warning' },
  SUSPENDED: { label: '정지', variant: 'error' },
  WITHDRAWN: { label: '탈퇴', variant: 'neutral' },
}

// 검색 실행
const handleSearch = () => {
  currentPage.value = 1
  fetchUsers()
}

// 검색 초기화
const handleReset = () => {
  filterGrade.value = ''
  filterStatus.value = ''
  searchType.value = 'NAME'
  searchKeyword.value = ''
  currentPage.value = 1
  fetchUsers()
}

// 페이지 변경
const handlePageChange = (page) => {
  currentPage.value = page
  fetchUsers()
}

// 테이블 컬럼 정의
const tableColumns = [
  { key: 'user_id', label: '회원ID' },
  { key: 'name', label: '이름' },
  { key: 'phone', label: '연락처' },
  { key: 'email', label: '이메일' },
  { key: 'grade', label: '등급', align: 'center' },
  { key: 'status', label: '상태', align: 'center' },
  { key: 'order_count', label: '주문수', align: 'right' },
  { key: 'total_order_amount', label: '총 주문금액', align: 'right' },
  { key: 'created_at', label: '가입일' },
]

// 전체 선택/해제
const handleSelectAll = (selectAll) => {
  if (selectAll) {
    selectedIds.value = users.value.map((u) => u.user_id)
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

// 등급 변경 모달 열기
const openGradeModal = () => {
  selectedGrade.value = ''
  showGradeModal.value = true
}

// 등급 변경 실행
const handleGradeChange = async () => {
  if (!selectedGrade.value) return

  const count = selectedIds.value.length

  try {
    await patch('/admin/users/grades', {
      userIds: selectedIds.value,
      gradeId: selectedGrade.value,
    })

    showGradeModal.value = false
    selectedIds.value = []

    uiStore.showToast({
      type: 'success',
      message: `${count}명의 회원 등급이 변경되었습니다.`,
    })

    // 목록 새로고침
    await fetchUsers()
  } catch (err) {
    console.error('Grade change error:', err)
    uiStore.showToast({
      type: 'error',
      message: err.data?.message || '등급 변경에 실패했습니다.',
    })
  }
}

// 회원 상세로 이동
const goToDetail = (userId) => {
  router.push(`/admin/users/${userId}`)
}

// 초기 로드
onMounted(() => {
  if (route.query.type) searchType.value = route.query.type
  if (route.query.keyword) searchKeyword.value = route.query.keyword
  if (route.query.page) currentPage.value = parseInt(route.query.page) || 1
  fetchUsers()
})
</script>

<template>
  <LayoutListPage title="회원 목록">
    <!-- Description -->
    <template #description>
      전체 회원 {{ totalItems.toLocaleString() }}명
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
            v-if="gradeOptions.length > 0"
            v-model="filterGrade"
            class="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">등급 전체</option>
            <option v-for="option in gradeOptions" :key="option.value" :value="option.label">
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
        <UiButton variant="primary" size="sm" @click="openGradeModal">
          등급 변경
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

    <!-- User List -->
    <DomainDataTable
      v-else
      :columns="tableColumns"
      :items="users"
      :selected-ids="selectedIds"
      selectable
      id-key="user_id"
      empty-title="검색 결과가 없습니다"
      empty-description="다른 검색어로 다시 시도해보세요."
      @select="handleSelect"
      @select-all="handleSelectAll"
      @row-click="(user) => goToDetail(user.user_id)"
    >
      <!-- 회원ID -->
      <template #cell-user_id="{ item }">
        <span class="text-sm font-medium text-primary-600">{{ item.user_id }}</span>
      </template>

      <!-- 이름 -->
      <template #cell-name="{ item }">
        <span class="text-sm font-medium text-neutral-900">{{ item.name }}</span>
      </template>

      <!-- 연락처 -->
      <template #cell-phone="{ item }">
        <span class="text-sm text-neutral-600">{{ item.phone }}</span>
      </template>

      <!-- 이메일 -->
      <template #cell-email="{ item }">
        <span class="text-sm text-neutral-600">{{ item.email }}</span>
      </template>

      <!-- 등급 -->
      <template #cell-grade="{ item }">
        <UiBadge :variant="gradeVariant[item.grade?.name] || 'neutral'" size="sm">
          {{ item.grade?.name || '-' }}
        </UiBadge>
      </template>

      <!-- 상태 -->
      <template #cell-status="{ item }">
        <UiBadge :variant="statusMap[item.status]?.variant || 'neutral'" size="sm" dot>
          {{ statusMap[item.status]?.label || item.status }}
        </UiBadge>
      </template>

      <!-- 주문수 -->
      <template #cell-order_count="{ item }">
        <span class="text-sm text-neutral-700">{{ item.order_count }}건</span>
      </template>

      <!-- 총 주문금액 -->
      <template #cell-total_order_amount="{ item }">
        <span class="text-sm font-medium text-neutral-900">{{ formatCurrency(item.total_order_amount) }}</span>
      </template>

      <!-- 가입일 -->
      <template #cell-created_at="{ item }">
        <span class="text-sm text-neutral-500">{{ item.created_at?.split('T')[0] }}</span>
      </template>

      <!-- 모바일 카드 -->
      <template #mobile-card="{ item }">
        <div class="flex items-start justify-between mb-2">
          <div>
            <span class="text-sm font-medium text-primary-600">{{ item.user_id }}</span>
            <h3 class="text-base font-semibold text-neutral-900">{{ item.name }}</h3>
          </div>
          <div class="flex gap-1">
            <UiBadge :variant="gradeVariant[item.grade?.name] || 'neutral'" size="sm">
              {{ item.grade?.name || '-' }}
            </UiBadge>
            <UiBadge :variant="statusMap[item.status]?.variant || 'neutral'" size="sm">
              {{ statusMap[item.status]?.label || item.status }}
            </UiBadge>
          </div>
        </div>
        <div class="text-sm text-neutral-600 space-y-1">
          <p>{{ item.phone }}</p>
          <p>{{ item.email }}</p>
        </div>
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-neutral-100">
          <span class="text-sm text-neutral-500">주문 {{ item.order_count }}건</span>
          <span class="text-sm font-medium text-neutral-900">{{ formatCurrency(item.total_order_amount) }}</span>
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

    <!-- Grade Change Modal -->
    <UiModal
      v-model="showGradeModal"
      title="회원 등급 변경"
      size="sm"
    >
      <p class="text-sm text-neutral-600 mb-4">
        선택한 <span class="font-medium text-neutral-900">{{ selectedIds.length }}명</span>의 회원 등급을 변경합니다.
      </p>

      <div class="space-y-2">
        <label
          v-for="option in gradeOptions"
          :key="option.value"
          :class="[
            'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
            selectedGrade === option.value
              ? 'border-primary-500 bg-primary-50'
              : 'border-neutral-200 hover:border-neutral-300',
          ]"
        >
          <input
            v-model="selectedGrade"
            type="radio"
            :value="option.value"
            class="w-4 h-4 text-primary-600 focus:ring-primary-500"
          >
          <span class="font-medium">{{ option.label }}</span>
          <UiBadge :variant="gradeVariant[option.value]" size="sm" class="ml-auto">
            {{ option.label }}
          </UiBadge>
        </label>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UiButton
            variant="outline"
            @click="showGradeModal = false"
          >
            취소
          </UiButton>
          <UiButton
            variant="primary"
            :disabled="!selectedGrade"
            @click="handleGradeChange"
          >
            변경
          </UiButton>
        </div>
      </template>
    </UiModal>
  </LayoutListPage>
</template>
