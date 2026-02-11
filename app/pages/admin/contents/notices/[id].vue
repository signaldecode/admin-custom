<script setup>
/**
 * 공지사항 등록/수정 페이지
 * - /admin/contents/notices/new → 등록 모드
 * - /admin/contents/notices/:id → 수정 모드
 *
 * API:
 * - POST /admin/notices (등록)
 * - GET /admin/notices/{id} (상세)
 * - PATCH /admin/notices/{id} (수정)
 * - DELETE /admin/notices/{id} (삭제)
 *
 * Request body (application/json):
 * {
 *   "type": "NOTICE",
 *   "title": "서비스 점검 안내",
 *   "content": "<p>점검 안내 내용입니다</p>",
 *   "isPinned": false,
 *   "status": "VISIBLE"
 * }
 */

import { useUiStore } from '~/stores/ui'
import { useApi } from '~/composables/useApi'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const { get, post, patch, del } = useApi()

// 모드 판별
const isEditMode = computed(() => route.params.id !== 'new')
const noticeId = computed(() => route.params.id)

// 분류(타입) 옵션
const typeOptions = [
  { value: 'NOTICE', label: '공지' },
  { value: 'EVENT', label: '이벤트' },
  { value: 'INFO', label: '안내' },
  { value: 'MAINTENANCE', label: '점검' },
]

// 상태 옵션
const statusOptions = [
  { value: 'ACTIVE', label: '노출' },
  { value: 'INACTIVE', label: '숨김' },
]

// 폼 데이터
const form = ref({
  type: 'NOTICE',
  title: '',
  content: '',
  isPinned: false,
  status: 'ACTIVE',
  viewCount: 0,
})

const isLoading = ref(false)
const isSaving = ref(false)

// 공지사항 상세 조회
const fetchNotice = async () => {
  isLoading.value = true

  try {
    const response = await get(`/admin/notices/${noticeId.value}`)
    const data = response.data

    form.value = {
      type: data.type || 'NOTICE',
      title: data.title || '',
      content: data.content || '',
      isPinned: data.isPinned ?? false,
      status: data.status || 'ACTIVE',
      viewCount: data.viewCount || 0,
    }
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '공지사항을 불러오는데 실패했습니다.',
    })
    router.push('/admin/contents/notices')
  } finally {
    isLoading.value = false
  }
}

// 저장
const handleSave = async () => {
  // 유효성 검사
  if (!form.value.title) {
    uiStore.showToast({ type: 'error', message: '제목을 입력해주세요.' })
    return
  }

  isSaving.value = true

  try {
    const payload = {
      type: form.value.type,
      title: form.value.title,
      content: form.value.content,
      isPinned: form.value.isPinned,
      status: form.value.status,
    }

    if (isEditMode.value) {
      await patch(`/admin/notices/${noticeId.value}`, payload)
      uiStore.showToast({ type: 'success', message: '공지사항이 수정되었습니다.' })
    } else {
      await post('/admin/notices', payload)
      uiStore.showToast({ type: 'success', message: '공지사항이 등록되었습니다.' })
      router.push('/admin/contents/notices')
    }
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
  if (!confirm('이 공지사항을 삭제하시겠습니까?')) return

  try {
    await del(`/admin/notices/${noticeId.value}`)
    uiStore.showToast({ type: 'success', message: '삭제되었습니다.' })
    router.push('/admin/contents/notices')
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '삭제에 실패했습니다.',
    })
  }
}

const handleCancel = () => router.back()

onMounted(() => {
  if (isEditMode.value) {
    fetchNotice()
  }
})
</script>

<template>
  <LayoutFormPage
    :title="isEditMode ? '공지사항 수정' : '공지사항 등록'"
    :description="isEditMode ? '공지사항을 수정합니다.' : '새 공지사항을 등록합니다.'"
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
      <!-- 옵션 -->
      <UiCard title="옵션">
        <div class="space-y-4">
          <!-- 노출 상태 -->
          <div class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
            <div>
              <p class="font-medium text-neutral-900 text-sm">노출 상태</p>
              <p class="text-xs text-neutral-500 mt-0.5">활성화하면 공지사항이 노출됩니다.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                :checked="form.status === 'ACTIVE'"
                class="sr-only peer"
                @change="form.status = $event.target.checked ? 'ACTIVE' : 'INACTIVE'"
              >
              <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
            </label>
          </div>

          <!-- 상단 고정 -->
          <div class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
            <div>
              <p class="font-medium text-neutral-900 text-sm">상단 고정</p>
              <p class="text-xs text-neutral-500 mt-0.5">목록에서 항상 상단에 표시됩니다.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="form.isPinned" type="checkbox" class="sr-only peer">
              <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
            </label>
          </div>
        </div>
      </UiCard>

      <!-- 기본 정보 -->
      <UiCard title="기본 정보">
        <div class="space-y-4">
          <!-- 분류 -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">분류</label>
            <select
              v-model="form.type"
              class="w-full md:w-1/2 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <!-- 제목 -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">
              제목 <span class="text-error-500">*</span>
            </label>
            <input
              v-model="form.title"
              type="text"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="공지 제목을 입력하세요"
            >
          </div>

          <!-- 내용 -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">내용</label>
            <UiRichEditor
              v-model="form.content"
              placeholder="공지 내용을 입력하세요..."
              min-height="300px"
            />
          </div>
        </div>
      </UiCard>

      <!-- 통계 (수정 모드에서만) -->
      <UiCard v-if="isEditMode" title="통계">
        <div class="bg-neutral-50 p-4 rounded-lg">
          <p class="text-xs text-neutral-500 mb-1">조회수</p>
          <p class="text-2xl font-bold text-neutral-900">{{ (form.viewCount || 0).toLocaleString() }}</p>
        </div>
      </UiCard>
    </div>
  </LayoutFormPage>
</template>
