<script setup>
/**
 * Q&A 상세/답변 페이지
 *
 * API:
 * - GET /admin/qnas/{id} (상세)
 * - PATCH /admin/qnas/{id}/answer (답변 등록)
 * - DELETE /admin/qnas/{id} (삭제)
 *
 * 응답 데이터:
 * {
 *   id, userId, qnaType, productId, orderId, category, title, question,
 *   isSecret, isAnswered, answer, answeredBy, answeredAt, status, isVisible,
 *   createdAt, updatedAt
 * }
 */

import { useUiStore } from '~/stores/ui'
import { useApi } from '~/composables/useApi'
import { formatDate } from '~/utils/formatters'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const { get, patch, del } = useApi()

const qnaId = computed(() => route.params.id)

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

// Q&A 데이터
const qna = ref({
  id: null,
  userId: null,
  qnaType: '',
  productId: null,
  orderId: null,
  category: '',
  title: '',
  question: '',
  isSecret: false,
  isAnswered: false,
  answer: '',
  answeredBy: null,
  answeredAt: null,
  status: 'PENDING',
  isVisible: true,
  createdAt: '',
  updatedAt: '',
})

const isLoading = ref(false)
const isSaving = ref(false)

// 답변 폼
const answerForm = ref('')

// Q&A 상세 조회
const fetchQna = async () => {
  isLoading.value = true

  try {
    const response = await get(`/admin/qnas/${qnaId.value}`)
    const data = response.data

    qna.value = {
      id: data.id,
      userId: data.userId,
      qnaType: data.qnaType || '',
      productId: data.productId,
      orderId: data.orderId,
      category: data.category || '',
      title: data.title || '',
      question: data.question || '',
      isSecret: data.isSecret ?? false,
      isAnswered: data.isAnswered ?? false,
      answer: data.answer || '',
      answeredBy: data.answeredBy,
      answeredAt: data.answeredAt,
      status: data.status || 'PENDING',
      isVisible: data.isVisible ?? true,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }

    // 기존 답변이 있으면 폼에 세팅
    answerForm.value = data.answer || ''
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || 'Q&A를 불러오는데 실패했습니다.',
    })
    router.push('/admin/contents/qna')
  } finally {
    isLoading.value = false
  }
}

// 헬퍼
const getQnaTypeLabel = (qnaType) => {
  return qnaTypeOptions.find((t) => t.value === qnaType)?.label || qnaType || '-'
}

const getStatusBadge = (status) => {
  return statusOptions.find((s) => s.value === status) || { label: status || '-', color: 'neutral' }
}

// 답변 저장
const handleSave = async () => {
  if (!answerForm.value.trim()) {
    uiStore.showToast({ type: 'error', message: '답변을 입력해주세요.' })
    return
  }

  isSaving.value = true

  try {
    await patch(`/admin/qnas/${qnaId.value}/answer`, {
      answer: answerForm.value,
    })

    uiStore.showToast({ type: 'success', message: '답변이 등록되었습니다.' })
    router.push('/admin/contents/qna')
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '답변 저장에 실패했습니다.',
    })
  } finally {
    isSaving.value = false
  }
}

// 삭제
const handleDelete = async () => {
  if (!confirm('이 문의를 삭제하시겠습니까?')) return

  try {
    await del(`/admin/qnas/${qnaId.value}`)
    uiStore.showToast({ type: 'success', message: '삭제되었습니다.' })
    router.push('/admin/contents/qna')
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '삭제에 실패했습니다.',
    })
  }
}

const handleCancel = () => router.back()

onMounted(() => {
  fetchQna()
})
</script>

<template>
  <LayoutFormPage
    title="문의 상세"
    description="고객 문의에 답변합니다."
    save-text="답변 저장"
    :is-saving="isSaving"
    show-cancel
    show-delete
    @save="handleSave"
    @cancel="handleCancel"
    @delete="handleDelete"
  >
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <UiSpinner size="lg" />
    </div>

    <template v-else>
      <!-- 문의 정보 -->
      <UiCard title="문의 정보">
        <div class="space-y-4">
          <div class="flex items-center gap-3 flex-wrap">
            <UiBadge :variant="getStatusBadge(qna.status).color" size="sm">
              {{ getStatusBadge(qna.status).label }}
            </UiBadge>
            <span class="text-sm text-neutral-500">{{ getQnaTypeLabel(qna.qnaType) }}</span>
            <span v-if="qna.isSecret" class="flex items-center gap-1 text-sm text-neutral-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              비밀글
            </span>
          </div>

          <div>
            <h3 class="text-lg font-medium text-neutral-900">{{ qna.title || '-' }}</h3>
            <div class="flex items-center gap-3 mt-1 text-sm text-neutral-500">
              <span>회원 ID: {{ qna.userId || '-' }}</span>
              <span>{{ qna.createdAt ? formatDate(qna.createdAt) : '-' }}</span>
            </div>
          </div>

          <!-- 관련 정보 -->
          <div v-if="qna.productId || qna.orderId" class="flex items-center gap-4 text-sm">
            <span v-if="qna.productId" class="text-neutral-500">
              상품 ID: <span class="text-neutral-700">{{ qna.productId }}</span>
            </span>
            <span v-if="qna.orderId" class="text-neutral-500">
              주문 ID: <span class="text-neutral-700">{{ qna.orderId }}</span>
            </span>
          </div>

          <div class="p-4 bg-neutral-50 rounded-lg">
            <p class="text-sm text-neutral-700 whitespace-pre-wrap">{{ qna.question || '-' }}</p>
          </div>
        </div>
      </UiCard>

      <!-- 답변 -->
      <UiCard title="답변">
        <div class="space-y-3">
          <div v-if="qna.answeredAt" class="flex items-center gap-4 text-sm text-neutral-500">
            <span>답변일: {{ formatDate(qna.answeredAt) }}</span>
            <span v-if="qna.answeredBy">답변자 ID: {{ qna.answeredBy }}</span>
          </div>
          <textarea
            v-model="answerForm"
            rows="8"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="답변을 입력하세요"
          />
        </div>
      </UiCard>
    </template>
  </LayoutFormPage>
</template>
