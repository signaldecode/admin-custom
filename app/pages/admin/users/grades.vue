<script setup>
/**
 * 회원 등급 관리 페이지
 * - 등급 목록 및 설정
 * - 등급별 조건/혜택(쿠폰) 관리
 */

import { useUiStore } from '~/stores/ui'
import { formatCurrency } from '~/utils/formatters'

const { $api } = useNuxtApp()
const uiStore = useUiStore()
const router = useRouter()

// 현재 날짜 기준 다음달 계산
const getNextMonth = () => {
  const now = new Date()
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()
  const month = now.getMonth() === 11 ? 1 : now.getMonth() + 2
  return `${year}년 ${month}월`
}

// 등급 레벨 → 색상 매핑 (높은 레벨 = 상위 등급)
const getGradeColor = (level, totalLevels) => {
  if (totalLevels <= 1) return 'neutral'
  if (level === totalLevels) return 'error'     // 최상위
  if (level >= totalLevels - 1) return 'warning' // 중상위
  return 'neutral'                               // 하위
}

// ── 데이터 ──
const isLoading = ref(false)
const grades = ref([])
const coupons = ref([]) // 전체 쿠폰 목록 (등급 수정 시 쿠폰 선택용)

// 쿠폰 ID → 이름 조회
const getCouponName = (couponId) => {
  return coupons.value.find((c) => c.id === couponId)?.name || `쿠폰 #${couponId}`
}

// 쿠폰 ID → 설명 조회
const getCouponDescription = (couponId) => {
  return coupons.value.find((c) => c.id === couponId)?.description || ''
}

// ── API 조회 ──
const fetchGrades = async () => {
  isLoading.value = true
  try {
    const response = await $api.get('/admin/users/grades')
    const data = response.data || response

    // 전체 쿠폰 목록
    coupons.value = data.coupons || []

    // 등급 목록 매핑 (level 내림차순 정렬: 상위 등급이 먼저)
    const gradeList = (data.grades || [])
      .sort((a, b) => b.level - a.level)

    const totalLevels = gradeList.length > 0
      ? Math.max(...gradeList.map((g) => g.level))
      : 1

    grades.value = gradeList.map((g) => ({
      id: g.grade_id,
      name: g.name,
      level: g.level,
      color: getGradeColor(g.level, totalLevels),
      minAmount: g.min_amount,
      isDefault: g.is_default,
      memberCount: g.member_count,
      couponIds: g.coupon_ids || [],
      hasPendingChanges: g.has_pending_changes,
      pendingSnapshot: g.pending_snapshot,
    }))
  } catch (err) {
    console.error('Grades fetch error:', err)
    uiStore.showToast({
      type: 'error',
      message: err.data?.message || '등급 정보를 불러오는데 실패했습니다.',
    })
  } finally {
    isLoading.value = false
  }
}

// ── 등급 편집 모달 ──
const showEditModal = ref(false)
const editingGrade = ref(null)
const isSaving = ref(false)
const editForm = ref({
  name: '',
  minAmount: 0,
  couponIds: [],
})

// 등급 편집 열기
const openEditModal = (grade) => {
  editingGrade.value = grade
  editForm.value = {
    name: grade.name,
    minAmount: grade.minAmount,
    couponIds: [...grade.couponIds],
  }
  showEditModal.value = true
}

// 쿠폰 토글
const toggleCoupon = (couponId) => {
  const index = editForm.value.couponIds.indexOf(couponId)
  if (index > -1) {
    editForm.value.couponIds.splice(index, 1)
  } else {
    editForm.value.couponIds.push(couponId)
  }
}

// 쿠폰 선택 여부
const isCouponSelected = (couponId) => {
  return editForm.value.couponIds.includes(couponId)
}

// 등급 저장
const saveGrade = async () => {
  if (!editingGrade.value) return

  isSaving.value = true
  try {
    await $api.patch(`/admin/users/grades/${editingGrade.value.id}`, {
      name: editForm.value.name,
      min_amount: Number(editForm.value.minAmount),
      coupon_ids: editForm.value.couponIds,
    })

    showEditModal.value = false
    editingGrade.value = null

    uiStore.showToast({
      type: 'success',
      message: `등급 설정이 저장되었습니다. ${getNextMonth()}부터 적용됩니다.`,
    })

    await fetchGrades()
  } catch (err) {
    console.error('Grade save error:', err)
    uiStore.showToast({
      type: 'error',
      message: err.data?.message || '등급 저장에 실패했습니다.',
    })
  } finally {
    isSaving.value = false
  }
}

// 등급별 회원 보기
const viewMembers = (gradeName) => {
  router.push(`/admin/users?grade=${gradeName}`)
}

onMounted(() => {
  fetchGrades()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-neutral-900">회원 등급</h1>
        <p class="mt-1 text-neutral-600">
          회원 등급별 조건과 혜택을 관리합니다.
        </p>
      </div>
    </div>

    <!-- 다음 달 적용 안내 -->
    <div class="mb-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-warning-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p class="text-sm text-warning-700">
          아래 설정은 <strong>{{ getNextMonth() }}</strong>부터 적용됩니다.
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <UiSpinner size="lg" />
    </div>

    <!-- Grade Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UiCard
        v-for="grade in grades"
        :key="grade.id"
        padding="none"
      >
        <!-- Header -->
        <div
          :class="[
            'p-4 border-b',
            grade.color === 'error' ? 'bg-error-50 border-error-100' : '',
            grade.color === 'warning' ? 'bg-warning-50 border-warning-100' : '',
            grade.color === 'neutral' ? 'bg-neutral-50 border-neutral-100' : '',
          ]"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UiBadge :variant="grade.color" size="sm">
                {{ grade.name }}
              </UiBadge>
              <span class="text-sm text-neutral-500">{{ grade.memberCount }}명</span>
              <UiBadge v-if="grade.isDefault" variant="neutral" size="sm">기본</UiBadge>
              <UiBadge v-if="grade.hasPendingChanges" variant="warning" size="sm">변경 대기</UiBadge>
            </div>
            <button
              type="button"
              class="p-1 rounded text-neutral-400 hover:text-neutral-600 hover:bg-white/50"
              @click="openEditModal(grade)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="p-4 space-y-4">
          <!-- 승급 조건 -->
          <div>
            <h4 class="text-xs font-medium text-neutral-500 uppercase mb-2">승급 조건</h4>
            <p class="text-sm text-neutral-900">
              <span v-if="grade.minAmount > 0">
                누적 구매금액 <span class="font-semibold">{{ formatCurrency(grade.minAmount) }}</span> 이상
              </span>
              <span v-else class="text-neutral-500">기본 등급</span>
            </p>
          </div>

          <!-- 적용 쿠폰 -->
          <div>
            <h4 class="text-xs font-medium text-neutral-500 uppercase mb-2">적용 쿠폰</h4>
            <div v-if="grade.couponIds.length > 0">
              <ul class="text-sm text-neutral-600 space-y-1">
                <li
                  v-for="couponId in grade.couponIds"
                  :key="couponId"
                  class="flex items-center gap-1"
                >
                  <svg class="w-3 h-3 text-success-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ getCouponName(couponId) }}
                </li>
              </ul>
            </div>
            <p v-else class="text-sm text-neutral-400">적용된 쿠폰 없음</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 py-3 border-t border-neutral-100 bg-neutral-50">
          <button
            type="button"
            class="text-sm text-primary-600 hover:text-primary-700 font-medium"
            @click="viewMembers(grade.name)"
          >
            회원 보기 →
          </button>
        </div>
      </UiCard>
    </div>

    <!-- Info -->
    <div class="mt-6 p-4 bg-info-50 border border-info-200 rounded-lg">
      <div class="flex gap-3">
        <svg class="w-5 h-5 text-info-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="text-sm font-medium text-info-700">등급 변경 안내</p>
          <p class="text-sm text-info-600 mt-1">
            회원 등급은 <strong>회원 목록</strong>에서 회원을 선택하여 일괄 변경할 수 있습니다.
            등급 자동 승급/강등은 매월 1일에 누적 구매금액을 기준으로 적용됩니다.
          </p>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <UiModal
      v-model="showEditModal"
      :title="`${editingGrade?.name || ''} 등급 설정`"
      size="md"
    >
      <!-- 다음 달 적용 안내 -->
      <div class="mb-4 p-3 bg-warning-50 border border-warning-200 rounded-lg">
        <p class="text-sm text-warning-700">
          변경사항은 <strong>{{ getNextMonth() }}</strong>부터 적용됩니다.
        </p>
      </div>

      <div class="space-y-4">
        <!-- 등급명 -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">
            등급명
          </label>
          <input
            v-model="editForm.name"
            type="text"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
        </div>

        <!-- 승급 조건 -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">
            승급 조건 (누적 구매금액)
          </label>
          <div class="flex items-center gap-2">
            <input
              v-model="editForm.minAmount"
              type="number"
              class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
            <span class="text-sm text-neutral-500">원 이상</span>
          </div>
        </div>

        <!-- 적용 쿠폰 -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-2">
            적용 쿠폰
          </label>
          <div v-if="coupons.length > 0" class="space-y-2 max-h-64 overflow-y-auto">
            <label
              v-for="coupon in coupons"
              :key="coupon.id"
              class="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors"
              :class="{ 'border-primary-300 bg-primary-50': isCouponSelected(coupon.id) }"
            >
              <input
                type="checkbox"
                :checked="isCouponSelected(coupon.id)"
                class="mt-0.5 w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                @change="toggleCoupon(coupon.id)"
              >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-neutral-900">{{ coupon.name }}</p>
                <p v-if="coupon.description" class="text-xs text-neutral-500 mt-0.5">{{ coupon.description }}</p>
              </div>
            </label>
          </div>
          <p v-else class="text-sm text-neutral-400">등록된 쿠폰이 없습니다.</p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UiButton
            variant="outline"
            :disabled="isSaving"
            @click="showEditModal = false"
          >
            취소
          </UiButton>
          <UiButton
            variant="primary"
            :loading="isSaving"
            @click="saveGrade"
          >
            저장
          </UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>
