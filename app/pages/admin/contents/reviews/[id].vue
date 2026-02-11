<script setup>
/**
 * 리뷰 상세 페이지
 * - 조회 전용 (수정 불가)
 * - 비활성화만 가능
 */

import { useUiStore } from '~/stores/ui'
import { useReview } from '~/composables/useReview'
import { formatDate } from '~/utils/formatters'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const { getReview, toggleVisibility } = useReview()

const reviewId = computed(() => route.params.id)

// 상태
const isLoading = ref(true)

// 리뷰 데이터
const review = ref({
  id: null,
  productId: null,
  productName: '',
  productPrimaryImageUrl: '',
  userId: null,
  authorName: '',
  rating: 0,
  title: '',
  content: '',
  images: [],
  isVisible: true,
  createdAt: null,
  updatedAt: null,
})

// 별점 렌더링
const renderStars = (rating) => {
  const filled = Math.floor(rating || 0)
  return '★'.repeat(filled) + '☆'.repeat(5 - filled)
}

// 데이터 로드
const fetchReview = async () => {
  isLoading.value = true

  try {
    const data = await getReview(reviewId.value)
    review.value = {
      id: data.id,
      productId: data.productId,
      productName: data.productName || '',
      productPrimaryImageUrl: data.productPrimaryImageUrl || '',
      userId: data.userId,
      authorName: data.authorName || '',
      rating: data.rating || 0,
      title: data.title || '',
      content: data.content || '',
      images: data.images || [],
      isVisible: data.isVisible ?? true,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '리뷰를 불러오는데 실패했습니다.',
    })
    router.push('/admin/contents/reviews')
  } finally {
    isLoading.value = false
  }
}

// 비활성화 토글
const handleToggleVisibility = async () => {
  const action = review.value.isVisible ? '비활성화' : '활성화'
  if (!confirm(`이 리뷰를 ${action}하시겠습니까?`)) return

  try {
    await toggleVisibility([Number(reviewId.value)])
    uiStore.showToast({ type: 'success', message: `리뷰가 ${action}되었습니다.` })
    // 상태 토글 반영
    review.value.isVisible = !review.value.isVisible
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || `${action}에 실패했습니다.`,
    })
  }
}

// 이미지 새 탭 열기
const openImage = (url) => {
  window.open(url, '_blank')
}

// 뒤로가기
const handleCancel = () => router.back()

onMounted(() => {
  fetchReview()
})
</script>

<template>
  <LayoutFormPage
    title="리뷰 상세"
    description="리뷰 내용을 확인합니다."
  >
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <UiSpinner size="lg" />
    </div>

    <div v-else class="space-y-6">
      <!-- 상품 정보 -->
      <UiCard title="상품 정보">
        <div class="flex items-center gap-4">
          <div class="w-20 h-20 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0">
            <img
              v-if="review.productPrimaryImageUrl"
              :src="review.productPrimaryImageUrl"
              :alt="review.productName"
              class="w-full h-full object-cover"
            >
            <div v-else class="w-full h-full flex items-center justify-center text-neutral-400">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div>
            <p class="text-base font-medium text-neutral-900">{{ review.productName || '-' }}</p>
            <p class="text-sm text-neutral-500 mt-1">상품 ID: {{ review.productId || '-' }}</p>
          </div>
        </div>
      </UiCard>

      <!-- 작성자 정보 -->
      <UiCard title="작성자 정보">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p class="text-xs text-neutral-500 mb-1">작성자</p>
            <p class="text-sm text-neutral-900">{{ review.authorName || '-' }}</p>
          </div>
          <div>
            <p class="text-xs text-neutral-500 mb-1">회원 ID</p>
            <p class="text-sm text-neutral-900">{{ review.userId || '-' }}</p>
          </div>
          <div>
            <p class="text-xs text-neutral-500 mb-1">작성일</p>
            <p class="text-sm text-neutral-900">{{ review.createdAt ? formatDate(review.createdAt) : '-' }}</p>
          </div>
          <div>
            <p class="text-xs text-neutral-500 mb-1">수정일</p>
            <p class="text-sm text-neutral-900">{{ review.updatedAt ? formatDate(review.updatedAt) : '-' }}</p>
          </div>
        </div>
      </UiCard>

      <!-- 리뷰 내용 -->
      <UiCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <h3 class="font-semibold text-neutral-900">리뷰 내용</h3>
              <UiBadge :variant="review.isVisible ? 'success' : 'neutral'" size="sm">
                {{ review.isVisible ? '노출' : '숨김' }}
              </UiBadge>
            </div>
            <span class="text-lg text-warning-500">{{ renderStars(review.rating) }}</span>
          </div>
        </template>

        <div class="space-y-4">
          <!-- 평점 -->
          <div>
            <p class="text-xs text-neutral-500 mb-1">평점</p>
            <p class="text-sm text-neutral-900">{{ review.rating || 0 }}점</p>
          </div>

          <!-- 제목 -->
          <div>
            <p class="text-xs text-neutral-500 mb-1">제목</p>
            <p class="text-sm font-medium text-neutral-900">{{ review.title || '-' }}</p>
          </div>

          <!-- 리뷰 텍스트 -->
          <div>
            <p class="text-xs text-neutral-500 mb-1">내용</p>
            <div class="p-4 bg-neutral-50 rounded-lg">
              <p class="text-sm text-neutral-700 whitespace-pre-wrap">{{ review.content || '작성된 내용이 없습니다.' }}</p>
            </div>
          </div>

          <!-- 리뷰 이미지 -->
          <div v-if="review.images && review.images.length > 0">
            <p class="text-xs text-neutral-500 mb-2">첨부 이미지</p>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(image, index) in review.images"
                :key="index"
                class="w-24 h-24 bg-neutral-100 rounded-lg overflow-hidden"
              >
                <img
                  :src="image"
                  :alt="`리뷰 이미지 ${index + 1}`"
                  class="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  @click="openImage(image)"
                >
              </div>
            </div>
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Footer: 비활성화/활성화, 취소 버튼 -->
    <template #footer>
      <UiButton
        :variant="review.isVisible ? 'danger' : 'primary'"
        size="lg"
        @click="handleToggleVisibility"
      >
        {{ review.isVisible ? '비활성화' : '활성화' }}
      </UiButton>
      <UiButton variant="outline" size="lg" @click="handleCancel">취소</UiButton>
    </template>
  </LayoutFormPage>
</template>
