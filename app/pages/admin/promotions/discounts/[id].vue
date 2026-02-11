<script setup>
/**
 * 할인 등록/수정 페이지
 * - /admin/promotions/discounts/new → 등록 모드
 * - /admin/promotions/discounts/:id → 수정 모드
 */

import { useUiStore } from '~/stores/ui'
import { usePromotion } from '~/composables/usePromotion'
import { validateDiscountValue, clampDiscountValue } from '~/utils/discountValidation'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const {
  getPromotion,
  createPromotion,
  updatePromotion,
  deletePromotion,
  getCategories,
  formatDateForInput,
  formatDateForApi,
} = usePromotion()

// 모드 판별
const isEditMode = computed(() => route.params.id !== 'new')
const promotionId = computed(() => route.params.id)

// 할인 종류 옵션
const discountTypeOptions = [
  { value: 'RATE', label: '정률 (%)' },
  { value: 'AMOUNT', label: '정액 (원)' },
]

// 카테고리 목록
const categories = ref([])

// 폼 데이터
const form = ref({
  isActive: false,
  name: '',
  discountType: 'RATE',
  discountValue: 0,
  applicableCategories: [],
  startedAt: '',
  endedAt: '',
})

// 전체 선택 여부
const isAllCategories = computed(() => form.value.applicableCategories.length === 0)

// 전체 토글
const toggleAllCategories = () => {
  form.value.applicableCategories = []
}

// 카테고리 토글
const toggleCategory = (id) => {
  const idx = form.value.applicableCategories.indexOf(id)
  if (idx > -1) {
    form.value.applicableCategories.splice(idx, 1)
  } else {
    form.value.applicableCategories.push(id)
  }
}

const isLoading = ref(false)
const isSaving = ref(false)

// 카테고리 목록 조회
const fetchCategories = async () => {
  categories.value = await getCategories()
}

// 데이터 로드 (수정 모드에서만)
const fetchDiscount = async () => {
  isLoading.value = true

  try {
    const data = await getPromotion(promotionId.value)

    form.value = {
      isActive: data.isActive ?? false,
      name: data.name || '',
      discountType: data.discountType || 'RATE',
      discountValue: data.discountValue || 0,
      applicableCategories: data.applicableCategories || [],
      startedAt: formatDateForInput(data.startedAt),
      endedAt: formatDateForInput(data.endedAt),
    }
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '할인 정보를 불러오는데 실패했습니다.',
    })
    router.push('/admin/promotions/discounts')
  } finally {
    isLoading.value = false
  }
}

// 할인값 실시간 제한
const handleDiscountValueInput = () => {
  form.value.discountValue = clampDiscountValue(form.value.discountType, form.value.discountValue)
}

// 날짜 유효성 상태
const dateValidation = ref({ valid: true, message: '' })

const handleDateValidationChange = (validation) => {
  dateValidation.value = validation
}

// 저장
const handleSave = async () => {
  if (!form.value.name) {
    uiStore.showToast({ type: 'error', message: '할인명을 입력해주세요.' })
    return
  }

  const discountValidation = validateDiscountValue(form.value.discountType, form.value.discountValue)
  if (!discountValidation.valid) {
    uiStore.showToast({ type: 'error', message: discountValidation.message })
    return
  }

  if (!form.value.startedAt) {
    uiStore.showToast({ type: 'error', message: '시작일을 입력해주세요.' })
    return
  }

  // 날짜 유효성 검증 (컴포넌트에서 전달받은 상태 사용)
  if (!dateValidation.value.valid) {
    uiStore.showToast({ type: 'error', message: dateValidation.value.message })
    return
  }

  isSaving.value = true

  try {
    const payload = {
      isActive: form.value.isActive,
      name: form.value.name,
      discountType: form.value.discountType,
      discountValue: Number(form.value.discountValue),
      applicableCategories: form.value.applicableCategories.length > 0 ? form.value.applicableCategories : [],
      startedAt: formatDateForApi(form.value.startedAt),
      endedAt: form.value.endedAt ? formatDateForApi(form.value.endedAt) : null,
    }

    if (isEditMode.value) {
      await updatePromotion(promotionId.value, payload)
      uiStore.showToast({ type: 'success', message: '할인이 수정되었습니다.' })
    } else {
      await createPromotion(payload)
      uiStore.showToast({ type: 'success', message: '할인이 등록되었습니다.' })
    }

    router.push('/admin/promotions/discounts')
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '저장에 실패했습니다.',
    })
  } finally {
    isSaving.value = false
  }
}

// 삭제 (수정 모드에서만)
const handleDelete = async () => {
  if (!confirm('이 할인을 삭제하시겠습니까?')) return

  try {
    await deletePromotion(promotionId.value)
    uiStore.showToast({ type: 'success', message: '삭제되었습니다.' })
    router.push('/admin/promotions/discounts')
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '삭제에 실패했습니다.',
    })
  }
}

const handleCancel = () => router.back()

onMounted(async () => {
  await fetchCategories()
  if (isEditMode.value) {
    await fetchDiscount()
  }
})
</script>

<template>
  <LayoutFormPage
    :title="isEditMode ? '할인 수정' : '할인 등록'"
    :description="isEditMode ? '할인 정보를 수정합니다.' : '새 할인을 등록합니다.'"
    :is-saving="isSaving"
    show-cancel
    :show-delete="isEditMode"
    @save="handleSave"
    @cancel="handleCancel"
    @delete="handleDelete"
  >
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <UiSpinner size="lg" />
    </div>

    <div v-else class="space-y-6">
      <!-- 상태 -->
      <UiCard title="할인 상태">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-neutral-900">할인 활성화</p>
            <p class="text-xs text-neutral-500 mt-0.5">활성화하면 설정한 기간 동안 할인이 적용됩니다.</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="form.isActive"
            :class="[
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              form.isActive ? 'bg-primary-600' : 'bg-neutral-200',
            ]"
            @click="form.isActive = !form.isActive"
          >
            <span
              :class="[
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                form.isActive ? 'translate-x-5' : 'translate-x-0',
              ]"
            />
          </button>
        </div>
      </UiCard>

      <!-- 기본 정보 -->
      <UiCard title="기본 정보">
        <div class="space-y-4">
          <!-- 할인명 -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">
              할인명 <span class="text-error-500">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="예: 신년 세일"
            >
          </div>

          <!-- 할인 종류 & 금액 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-2">
                할인 종류 <span class="text-error-500">*</span>
              </label>
              <div class="flex gap-2">
                <label
                  v-for="opt in discountTypeOptions"
                  :key="opt.value"
                  :class="[
                    'flex-1 px-4 py-2 border rounded-lg cursor-pointer transition-colors text-center text-sm',
                    form.discountType === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                      : 'border-neutral-200 hover:border-neutral-300 text-neutral-600',
                  ]"
                >
                  <input v-model="form.discountType" type="radio" :value="opt.value" class="sr-only">
                  {{ opt.label }}
                </label>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                할인 {{ form.discountType === 'RATE' ? '비율' : '금액' }} <span class="text-error-500">*</span>
              </label>
              <div class="relative">
                <input
                  v-model.number="form.discountValue"
                  type="number"
                  min="0"
                  :max="form.discountType === 'RATE' ? 99 : 999999"
                  class="w-full px-3 py-2 pr-12 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                  @input="handleDiscountValueInput"
                >
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                  {{ form.discountType === 'RATE' ? '%' : '원' }}
                </span>
              </div>
              <p class="text-xs text-neutral-400 mt-1">
                {{ form.discountType === 'RATE' ? '최대 99%' : '최대 999,999원' }}
              </p>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- 적용 카테고리 -->
      <UiCard title="적용 카테고리">
        <div class="flex flex-wrap gap-2">
          <label
            :class="[
              'px-4 py-2 border rounded-lg cursor-pointer transition-colors text-sm',
              isAllCategories
                ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                : 'border-neutral-200 hover:border-neutral-300 text-neutral-600',
            ]"
          >
            <input type="checkbox" :checked="isAllCategories" class="sr-only" @change="toggleAllCategories">
            전체
          </label>
          <label
            v-for="cat in categories"
            :key="cat.id"
            :class="[
              'px-4 py-2 border rounded-lg cursor-pointer transition-colors text-sm',
              form.applicableCategories.includes(cat.id)
                ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                : 'border-neutral-200 hover:border-neutral-300 text-neutral-600',
            ]"
          >
            <input
              type="checkbox"
              :checked="form.applicableCategories.includes(cat.id)"
              class="sr-only"
              @change="toggleCategory(cat.id)"
            >
            {{ cat.name }}
          </label>
        </div>
        <p class="text-xs text-neutral-400 mt-2">선택하지 않으면 전체 상품에 적용됩니다.</p>
      </UiCard>

      <!-- 할인 기간 -->
      <UiCard title="할인 기간">
        <UiDateRangePicker
          v-model:start="form.startedAt"
          v-model:end="form.endedAt"
          start-required
          show-no-end-date
          no-end-date-label="종료일 없음 (상시 할인)"
          @validation-change="handleDateValidationChange"
        />
      </UiCard>

      <!-- 안내 -->
      <div class="p-4 bg-neutral-100 rounded-lg">
        <div class="flex gap-3">
          <svg class="w-5 h-5 text-neutral-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm text-neutral-600">
            상품 별 할인은 <strong>상품 수정</strong>에서, 카테고리/전체 할인은 여기서 등록하세요.
          </p>
        </div>
      </div>
    </div>
  </LayoutFormPage>
</template>
