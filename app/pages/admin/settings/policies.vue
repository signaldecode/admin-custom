<script setup>
/**
 * 정책 설정 페이지
 * - GET /admin/policy - 전체 정책 조회
 * - PUT /admin/policy - 전체 정책 수정
 */

import { useUiStore } from '~/stores/ui'

const { $api } = useNuxtApp()
const uiStore = useUiStore()

// 로딩/저장 상태
const isLoading = ref(true)
const isSaving = ref(false)

// 활성 탭
const activeTab = ref('order')
const tabs = [
  { id: 'order', label: '주문 정책' },
  { id: 'delivery', label: '배송 정책' },
  { id: 'product', label: '상품 정책' },
  { id: 'returnPolicy', label: '반품 정책' },
]

// 정책 데이터 (API 구조에 맞춤)
const order = ref({
  minOrderAmount: 0,
  maxOrderAmount: 10000000,
  maxOrderQuantity: 99,
  cancelHours: 24,
  autoConfirmDays: 7,
  // 적립금 정책
  pointEnabled: true,
  pointRate: 1,
  pointMinOrder: 10000,
  pointMinUse: 1000,
  pointMaxUseRate: 100,
  pointExpirationType: 'UNLIMITED',
})

// 적립금 유효기간 옵션
const pointExpirationOptions = [
  { value: '1_YEAR', label: '1년' },
  { value: '2_YEARS', label: '2년' },
  { value: '3_YEARS', label: '3년' },
  { value: 'UNLIMITED', label: '무기한' },
]

const delivery = ref({
  freeShippingAmount: 50000,
  baseShippingFee: 3000,
  islandExtraFee: 3000,
  islandRegions: '',
  estimatedDays: '2-3일',
  guideText: '',
})

const product = ref({
  defaultTaxRate: 10,
  lowStockThreshold: 10,
  maxOptions: 100,
  maxImages: 10,
  showSoldout: true,
  showStock: false,
  guideText: '',
})

const returnPolicy = ref({
  returnDays: 7,
  exchangeDays: 7,
  returnFee: 3000,
  exchangeFee: 6000,
  returnAddress: '',
  nonReturnable: '',
  guideText: '',
})

// 정책 데이터 로드
const fetchPolicies = async () => {
  isLoading.value = true

  try {
    const response = await $api.get('/admin/policy')
    const data = response.data || response

    if (data.order) {
      order.value = { ...order.value, ...data.order }
    }
    if (data.delivery) {
      delivery.value = { ...delivery.value, ...data.delivery }
    }
    if (data.product) {
      product.value = { ...product.value, ...data.product }
    }
    if (data.returnPolicy) {
      returnPolicy.value = { ...returnPolicy.value, ...data.returnPolicy }
    }
  } catch (error) {
    console.error('정책 로드 실패:', error)
    uiStore.showToast({ type: 'error', message: '정책을 불러오지 못했습니다.' })
  } finally {
    isLoading.value = false
  }
}

// 저장
const handleSave = async () => {
  isSaving.value = true

  try {
    // 반품/교환 기간을 자동 구매확정 기간과 동기화
    const syncedReturnPolicy = {
      ...returnPolicy.value,
      returnDays: order.value.autoConfirmDays,
      exchangeDays: order.value.autoConfirmDays,
    }

    const requestData = {
      order: order.value,
      delivery: delivery.value,
      product: product.value,
      returnPolicy: syncedReturnPolicy,
    }

    await $api.put('/admin/policy', requestData)

    uiStore.showToast({
      type: 'success',
      message: '정책 설정이 저장되었습니다.',
    })
  } catch (error) {
    console.error('정책 저장 실패:', error)
    uiStore.showToast({
      type: 'error',
      message: error.data?.message || '저장에 실패했습니다.',
    })
  } finally {
    isSaving.value = false
  }
}

// 초기 로드
onMounted(() => {
  fetchPolicies()
})
</script>

<template>
  <LayoutFormPage
    title="정책 설정"
    description="쇼핑몰 운영에 필요한 각종 정책을 설정합니다."
    :is-saving="isSaving"
    @save="handleSave"
  >
    <template #header>
      <!-- Tabs -->
      <div class="border-b border-neutral-200 mt-4 -mx-6 px-6">
        <nav class="flex gap-4 -mb-px overflow-x-auto scrollbar-hidden">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            :class="[
              'py-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300',
            ]"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>
    </template>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <UiSpinner size="lg" />
    </div>

    <!-- Content -->
    <template v-else>

      <!-- Tab Content: 주문 정책 -->
      <div v-if="activeTab === 'order'" class="space-y-6">
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">주문 제한</h3>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                최소 주문금액
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="order.minOrderAmount"
                  type="number"
                  class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                <span class="text-sm text-neutral-500">원</span>
              </div>
              <p class="text-xs text-neutral-400 mt-1">0으로 설정 시 제한 없음</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                최대 주문금액
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="order.maxOrderAmount"
                  type="number"
                  class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                <span class="text-sm text-neutral-500">원</span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                최대 주문수량 (1회)
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="order.maxOrderQuantity"
                  type="number"
                  class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                <span class="text-sm text-neutral-500">개</span>
              </div>
            </div>
          </div>
        </UiCard>

        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">자동 구매확정</h3>
          </template>
          <div class="max-w-md">
            <label class="block text-sm font-medium text-neutral-700 mb-1">
              배송완료 후 자동 구매확정
            </label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="order.autoConfirmDays"
                type="number"
                class="w-24 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
              <span class="text-sm text-neutral-500">일 후</span>
            </div>
          </div>
        </UiCard>

        <UiCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <h3 class="font-semibold text-neutral-900">적립금 정책</h3>
                <UiTooltip content="구매 확정 후 적립금이 지급됩니다." position="top" />
              </div>
              <label class="flex items-center gap-2 cursor-pointer">
                <span class="text-sm text-neutral-600">적립금 기능 사용</span>
                <button
                  type="button"
                  role="switch"
                  :aria-checked="order.pointEnabled"
                  :class="[
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                    order.pointEnabled ? 'bg-primary-600' : 'bg-neutral-200',
                  ]"
                  @click="order.pointEnabled = !order.pointEnabled"
                >
                  <span
                    :class="[
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      order.pointEnabled ? 'translate-x-5' : 'translate-x-0',
                    ]"
                  />
                </button>
              </label>
            </div>
          </template>

          <div :class="{ 'opacity-50 pointer-events-none': !order.pointEnabled }">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label class="block text-sm font-medium text-neutral-700 mb-1">
                  기본 적립율
                </label>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="order.pointRate"
                    type="number"
                    step="0.1"
                    class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                  <span class="text-sm text-neutral-500">%</span>
                </div>
                <p class="text-xs text-neutral-400 mt-1">실제 결제 금액에서 적립금이 계산됩니다.</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-neutral-700 mb-1">
                  적립금 사용 최소 주문금액
                </label>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="order.pointMinOrder"
                    type="number"
                    class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                  <span class="text-sm text-neutral-500">원 이상</span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-neutral-700 mb-1">
                  최소 사용 적립금
                </label>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="order.pointMinUse"
                    type="number"
                    class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                  <span class="text-sm text-neutral-500">원 이상</span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-neutral-700 mb-1">
                  최대 사용 적립금
                </label>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-neutral-500">주문 금액의</span>
                  <input
                    v-model.number="order.pointMaxUseRate"
                    type="number"
                    min="1"
                    max="100"
                    class="w-20 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                  <span class="text-sm text-neutral-500">%</span>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-2">
                적립금 유효기간
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="option in pointExpirationOptions"
                  :key="option.value"
                  type="button"
                  :class="[
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    order.pointExpirationType === option.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
                  ]"
                  @click="order.pointExpirationType = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
          </div>
        </UiCard>
      </div>

      <!-- Tab Content: 배송 정책 -->
      <div v-if="activeTab === 'delivery'" class="space-y-6">
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">배송비 설정</h3>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                무료배송 기준금액
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="delivery.freeShippingAmount"
                  type="number"
                  class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                <span class="text-sm text-neutral-500">원 이상</span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                기본 배송비
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="delivery.baseShippingFee"
                  type="number"
                  class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                <span class="text-sm text-neutral-500">원</span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                도서산간 추가 배송비
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="delivery.islandExtraFee"
                  type="number"
                  class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                <span class="text-sm text-neutral-500">원</span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                추가 배송비 지역
              </label>
              <input
                v-model="delivery.islandRegions"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="제주,울릉도"
              >
            </div>
          </div>
        </UiCard>

        <UiCard>
          <template #header>
            <div class="flex items-center gap-1.5">
              <h3 class="font-semibold text-neutral-900">배송 안내</h3>
              <UiTooltip content="상품 상세페이지에 표시됩니다." position="top" />
            </div>
          </template>
          <div class="space-y-4">
            <div class="max-w-md">
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                예상 배송기간
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model="delivery.estimatedDays"
                  type="text"
                  class="w-32 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="2-3일"
                >
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                배송 안내문
              </label>
              <textarea
                v-model="delivery.guideText"
                rows="4"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                placeholder="배송 관련 안내 사항을 입력하세요"
              />
            </div>
          </div>
        </UiCard>
      </div>

      <!-- Tab Content: 상품 정책 -->
      <div v-if="activeTab === 'product'" class="space-y-6">
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">상품 설정</h3>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                기본 세율
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="product.defaultTaxRate"
                  type="number"
                  class="w-24 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                <span class="text-sm text-neutral-500">%</span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                재고 부족 알림 기준
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="product.lowStockThreshold"
                  type="number"
                  class="w-24 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                <span class="text-sm text-neutral-500">개 이하</span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                최대 옵션 수
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="product.maxOptions"
                  type="number"
                  class="w-24 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                <span class="text-sm text-neutral-500">개</span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                최대 이미지 수
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="product.maxImages"
                  type="number"
                  class="w-24 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                <span class="text-sm text-neutral-500">개</span>
              </div>
            </div>
          </div>
        </UiCard>

        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">상품 표시 설정</h3>
          </template>
          <div class="space-y-4">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="product.showSoldout"
                type="checkbox"
                class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              >
              <span class="text-sm text-neutral-700">품절 상품 표시</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="product.showStock"
                type="checkbox"
                class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              >
              <span class="text-sm text-neutral-700">재고 수량 표시</span>
            </label>
          </div>
        </UiCard>

        <UiCard>
          <template #header>
            <div class="flex items-center gap-1.5">
              <h3 class="font-semibold text-neutral-900">상품 안내문</h3>
              <UiTooltip content="상품 상세페이지에 표시됩니다." position="top" />
            </div>
          </template>
          <textarea
            v-model="product.guideText"
            rows="4"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            placeholder="상품 공통 안내 사항을 입력하세요"
          />
        </UiCard>
      </div>

      <!-- Tab Content: 반품 정책 -->
      <div v-if="activeTab === 'returnPolicy'" class="space-y-6">
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">반품/교환 기간</h3>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                반품 가능 기간
              </label>
              <div class="flex items-center gap-2">
                <span class="text-sm text-neutral-500">수령 후</span>
                <input
                  :value="order.autoConfirmDays"
                  type="number"
                  disabled
                  class="w-20 px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-100 text-neutral-500 cursor-not-allowed"
                >
                <span class="text-sm text-neutral-500">일 이내</span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                교환 가능 기간
              </label>
              <div class="flex items-center gap-2">
                <span class="text-sm text-neutral-500">수령 후</span>
                <input
                  :value="order.autoConfirmDays"
                  type="number"
                  disabled
                  class="w-20 px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-neutral-100 text-neutral-500 cursor-not-allowed"
                >
                <span class="text-sm text-neutral-500">일 이내</span>
              </div>
            </div>
          </div>
          <p class="text-xs text-neutral-400 mt-3">
            반품/교환 기간은 자동 구매확정 기간({{ order.autoConfirmDays }}일)과 동일하게 적용됩니다.
            변경하려면 주문 정책 탭에서 자동 구매확정 기간을 수정하세요.
          </p>
        </UiCard>

        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">반품/교환 배송비</h3>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                반품 배송비 (편도)
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="returnPolicy.returnFee"
                  type="number"
                  class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                <span class="text-sm text-neutral-500">원</span>
              </div>
              <p class="text-xs text-neutral-400 mt-1">단순 변심 시 고객 부담</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                교환 배송비 (왕복)
              </label>
              <div class="flex items-center gap-2">
                <input
                  v-model.number="returnPolicy.exchangeFee"
                  type="number"
                  class="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                <span class="text-sm text-neutral-500">원</span>
              </div>
              <p class="text-xs text-neutral-400 mt-1">단순 변심 시 고객 부담</p>
            </div>
          </div>
        </UiCard>

        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">반품 주소</h3>
          </template>
          <input
            v-model="returnPolicy.returnAddress"
            type="text"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="반품 수거지 주소를 입력하세요"
          >
        </UiCard>

        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">반품 불가 품목</h3>
          </template>
          <textarea
            v-model="returnPolicy.nonReturnable"
            rows="3"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            placeholder="반품이 불가능한 상품 유형을 입력하세요 (쉼표로 구분)"
          />
        </UiCard>

        <UiCard>
          <template #header>
            <div class="flex items-center gap-1.5">
              <h3 class="font-semibold text-neutral-900">반품/교환 안내문</h3>
              <UiTooltip content="상품 상세페이지에 표시됩니다." position="top" />
            </div>
          </template>
          <textarea
            v-model="returnPolicy.guideText"
            rows="4"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            placeholder="반품/교환 관련 안내 사항을 입력하세요"
          />
        </UiCard>
      </div>

    </template>
  </LayoutFormPage>
</template>
