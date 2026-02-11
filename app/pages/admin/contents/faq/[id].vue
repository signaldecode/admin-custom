<script setup>
/**
 * FAQ 등록/수정 페이지
 * - /admin/contents/faq/new → 등록 모드
 * - /admin/contents/faq/:id → 수정 모드
 *
 * API:
 * POST /admin/faqs { categoryId, question, answer }
 * GET /admin/faqs/:id
 * PATCH /admin/faqs/:id { categoryId, question, answer }
 * DELETE /admin/faqs/:id
 */

import { useUiStore } from '~/stores/ui'
import { useApi } from '~/composables/useApi'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const { get, post, patch, del } = useApi()

// 모드 판별
const isEditMode = computed(() => route.params.id !== 'new')
const faqId = computed(() => route.params.id)

// 카테고리 목록
const categories = ref([])

const form = ref({
  categoryId: '',
  question: '',
  answer: '',
})

const isLoading = ref(false)
const isSaving = ref(false)

// 카테고리 목록 조회
const fetchCategories = async () => {
  try {
    const response = await get('/admin/faqs/categories')
    categories.value = response.data || []
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '카테고리 목록을 불러오는데 실패했습니다.',
    })
  }
}

// FAQ 상세 조회
const fetchFaq = async () => {
  isLoading.value = true
  try {
    const response = await get(`/admin/faqs/${faqId.value}`)
    const data = response.data

    form.value = {
      categoryId: data.categoryId || '',
      question: data.question || '',
      answer: data.answer || '',
    }
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || 'FAQ를 불러오는데 실패했습니다.',
    })
    router.push('/admin/contents/faq')
  } finally {
    isLoading.value = false
  }
}

// 저장
const handleSave = async () => {
  if (!form.value.question) {
    uiStore.showToast({ type: 'error', message: '질문을 입력해주세요.' })
    return
  }
  if (!form.value.categoryId) {
    uiStore.showToast({ type: 'error', message: '카테고리를 선택해주세요.' })
    return
  }

  isSaving.value = true
  try {
    const requestData = {
      categoryId: Number(form.value.categoryId),
      question: form.value.question,
      answer: form.value.answer,
    }

    if (isEditMode.value) {
      await patch(`/admin/faqs/${faqId.value}`, requestData)
      uiStore.showToast({ type: 'success', message: 'FAQ가 수정되었습니다.' })
    } else {
      await post('/admin/faqs', requestData)
      uiStore.showToast({ type: 'success', message: 'FAQ가 등록되었습니다.' })
    }
    router.push('/admin/contents/faq')
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '저장에 실패했습니다.',
    })
  } finally {
    isSaving.value = false
  }
}

// 삭제
const handleDelete = async () => {
  if (!confirm('이 FAQ를 삭제하시겠습니까?')) return
  try {
    await del(`/admin/faqs/${faqId.value}`)
    uiStore.showToast({ type: 'success', message: '삭제되었습니다.' })
    router.push('/admin/contents/faq')
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
    fetchFaq()
  }
})
</script>

<template>
  <LayoutFormPage
    :title="isEditMode ? 'FAQ 수정' : 'FAQ 등록'"
    :description="isEditMode ? 'FAQ를 수정합니다.' : '새 FAQ를 등록합니다.'"
    :is-saving="isSaving"
    show-cancel
    :show-delete="isEditMode"
    @save="handleSave"
    @cancel="handleCancel"
    @delete="handleDelete"
  >

    <div v-if="isLoading" class="flex items-center justify-center py-20"><UiSpinner size="lg" /></div>

    <div v-else class="space-y-6">
      <UiCard title="FAQ 정보">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">
              카테고리 <span class="text-error-500">*</span>
            </label>
            <select
              v-model="form.categoryId"
              class="w-full md:w-1/2 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="" disabled>카테고리를 선택하세요</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">질문 <span class="text-error-500">*</span></label>
            <input v-model="form.question" type="text" class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="자주 묻는 질문">
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">답변</label>
            <textarea v-model="form.answer" rows="8" class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="답변을 입력하세요" />
          </div>
        </div>
      </UiCard>
    </div>
  </LayoutFormPage>
</template>
