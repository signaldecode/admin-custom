<script setup>
/**
 * 팝업 등록/수정 페이지
 * - /admin/contents/popups/new → 등록 모드
 * - /admin/contents/popups/:id → 수정 모드
 *
 * API Request JSON (application/json):
 * {
 *   "name": "팝업명",
 *   "status": "ACTIVE",  // ACTIVE | INACTIVE
 *   "image": "https://example.com/popup.jpg",
 *   "linkUrl": "https://example.com/event",
 *   "linkTarget": "_self",
 *   "closeOption": "TODAY",
 *   "popupType": "CENTER",
 *   "startedAt": "2024-01-01T00:00:00",
 *   "endedAt": "2024-12-31T23:59:59"
 * }
 */

import { useUiStore } from '~/stores/ui'
import { useApi } from '~/composables/useApi'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const { get, post, patch, del } = useApi()
const { $api } = useNuxtApp()

// 모드 판별
const isEditMode = computed(() => route.params.id !== 'new')
const popupId = computed(() => route.params.id)

// 링크 타겟 옵션 (API 스펙에 맞춤)
const linkTargetOptions = [
  { value: '_blank', label: '새창에서 열기' },
  { value: '_self', label: '현재창에서 이동' },
]

// 닫기 옵션 (API 스펙에 맞춤)
const closeOptions = [
  { value: 'CLOSE', label: '닫기' },
  { value: 'TODAY', label: '오늘 하루 보지 않기' },
  { value: 'WEEK', label: '일주일 보지 않기' },
]

// 팝업 형태 옵션 (API 스펙에 맞춤)
const popupTypeOptions = [
  { value: 'CENTER', label: '중앙 팝업', description: '화면 중앙에 표시' },
  { value: 'FLOATING', label: '플로팅 팝업', description: '화면 모서리에 표시' },
]

// 오늘 날짜+시간 기본값 (YYYY-MM-DDTHH:mm 형식)
const getDefaultDateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// 폼 데이터 (API 스펙에 맞춤)
const form = ref({
  name: '',
  status: 'INACTIVE', // ACTIVE | INACTIVE
  image: '', // 이미지 URL
  linkUrl: '',
  linkTarget: '_blank',
  closeOption: 'TODAY',
  popupType: 'CENTER',
  sortOrder: 0,
  startedAt: getDefaultDateTime(),
  endedAt: '',
})

// 활성화 상태 (스위치용 computed)
const isActive = computed({
  get: () => form.value.status === 'ACTIVE',
  set: (val) => { form.value.status = val ? 'ACTIVE' : 'INACTIVE' }
})

const isLoading = ref(false)
const isSaving = ref(false)
const isUploading = ref(false)
const fileInputRef = ref(null)

// 날짜 포맷 변환 (ISO -> datetime-local 형식)
const formatDateForInput = (isoString) => {
  if (!isoString) return ''
  // "2026-01-28T03:17:02.008Z" → "2026-01-28T03:17"
  return isoString.slice(0, 16)
}

// 날짜 포맷 변환 (datetime-local -> ISO)
const formatDateForApi = (dateString) => {
  if (!dateString) return null
  // "2026-01-28T03:17" → "2026-01-28T03:17:00"
  return `${dateString}:00`
}

// 팝업 상세 조회
const fetchPopup = async () => {
  isLoading.value = true

  try {
    const response = await get(`/admin/popups/${popupId.value}`)
    const data = response.data

    form.value = {
      name: data.name || '',
      status: data.status || 'INACTIVE',
      image: data.image || '',
      linkUrl: data.linkUrl || '',
      linkTarget: data.linkTarget || '_blank',
      closeOption: data.closeOption || 'TODAY',
      popupType: data.popupType || 'CENTER',
      sortOrder: data.sortOrder ?? 0,
      startedAt: formatDateForInput(data.startedAt) || getDefaultDateTime(),
      endedAt: formatDateForInput(data.endedAt),
    }
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '팝업을 불러오는데 실패했습니다.',
    })
    router.push('/admin/contents/popups')
  } finally {
    isLoading.value = false
  }
}

// 이미지 파일 선택 및 업로드
const handleFileSelect = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  // 파일 유효성 검사
  if (!file.type.startsWith('image/')) {
    uiStore.showToast({ type: 'error', message: '이미지 파일만 업로드 가능합니다.' })
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    uiStore.showToast({ type: 'error', message: '파일 크기는 5MB 이하만 가능합니다.' })
    return
  }

  isUploading.value = true

  try {
    // 이미지 업로드 API 호출
    const formData = new FormData()
    formData.append('file', file)

    const response = await $api.postFormData('/admin/images', formData)

    // 업로드된 이미지 URL 설정
    form.value.image = response.data?.imageUrl || response.data?.url || response.imageUrl || response.url

    uiStore.showToast({ type: 'success', message: '이미지가 업로드되었습니다.' })
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '이미지 업로드에 실패했습니다.',
    })
  } finally {
    isUploading.value = false
    // input 초기화 (같은 파일 재선택 가능하도록)
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}

const triggerFileInput = () => fileInputRef.value?.click()

const removeImage = () => {
  form.value.image = ''
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// 저장
const handleSave = async () => {
  // 유효성 검사
  if (!form.value.name) {
    uiStore.showToast({ type: 'error', message: '팝업명을 입력해주세요.' })
    return
  }

  if (!form.value.image) {
    uiStore.showToast({ type: 'error', message: '이미지를 등록해주세요.' })
    return
  }

  isSaving.value = true

  try {
    // JSON 데이터
    const requestData = {
      name: form.value.name,
      status: form.value.status,
      image: form.value.image,
      linkUrl: form.value.linkUrl || null,
      linkTarget: form.value.linkTarget,
      closeOption: form.value.closeOption,
      popupType: form.value.popupType,
      sortOrder: Number(form.value.sortOrder) || 0,
      startedAt: formatDateForApi(form.value.startedAt),
      endedAt: formatDateForApi(form.value.endedAt),
    }

    if (isEditMode.value) {
      await patch(`/admin/popups/${popupId.value}`, requestData)
      uiStore.showToast({ type: 'success', message: '팝업이 수정되었습니다.' })
    } else {
      await post('/admin/popups', requestData)
      uiStore.showToast({ type: 'success', message: '팝업이 등록되었습니다.' })
    }
    router.push('/admin/contents/popups')
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
  if (!confirm('이 팝업을 삭제하시겠습니까?')) return

  try {
    await del(`/admin/popups/${popupId.value}`)
    uiStore.showToast({ type: 'success', message: '팝업이 삭제되었습니다.' })
    router.push('/admin/contents/popups')
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
    fetchPopup()
  }
})
</script>

<template>
  <LayoutFormPage
    :title="isEditMode ? '팝업 수정' : '팝업 등록'"
    :description="isEditMode ? '팝업 정보를 수정합니다.' : '새 팝업을 등록합니다.'"
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
      <!-- 기본 정보 -->
      <UiCard title="기본 정보">
        <div class="space-y-4">
          <!-- 팝업명 -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">
              팝업명 <span class="text-error-500">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="팝업명을 입력하세요"
            >
          </div>

          <!-- 정렬 순서 -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">정렬 순서</label>
            <input
              v-model.number="form.sortOrder"
              type="number"
              min="0"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0"
            >
            <p class="text-xs text-neutral-500 mt-1">숫자가 낮을수록 먼저 표시됩니다.</p>
          </div>

          <!-- 활성화 상태 -->
          <div class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
            <div>
              <p class="font-medium text-neutral-900 text-sm">활성화 상태</p>
              <p class="text-xs text-neutral-500 mt-0.5">활성화하면 설정된 기간 동안 팝업이 노출됩니다.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="isActive" type="checkbox" class="sr-only peer">
              <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
            </label>
          </div>
        </div>
      </UiCard>

      <!-- 이미지 -->
      <UiCard title="이미지">
        <div>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileSelect"
          >

          <!-- 이미지 있음 -->
          <div
            v-if="form.image"
            class="relative"
          >
            <div class="w-full max-w-md bg-neutral-50 rounded-lg overflow-hidden border border-neutral-200">
              <img
                :src="form.image"
                alt="팝업 이미지"
                class="w-full h-auto object-contain"
              >
            </div>
            <div class="flex gap-2 mt-3">
              <UiButton variant="outline" size="sm" :disabled="isUploading" @click="triggerFileInput">
                이미지 변경
              </UiButton>
              <UiButton variant="ghost" size="sm" :disabled="isUploading" @click="removeImage">
                삭제
              </UiButton>
            </div>
          </div>

          <!-- 업로딩 중 -->
          <div
            v-else-if="isUploading"
            class="w-full h-48 bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-300 flex items-center justify-center"
          >
            <div class="text-center">
              <UiSpinner size="lg" class="mx-auto mb-3" />
              <p class="text-sm font-medium text-neutral-600">이미지 업로드 중...</p>
            </div>
          </div>

          <!-- 이미지 없음 -->
          <div
            v-else
            class="w-full h-48 bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-300 hover:border-primary-400 cursor-pointer transition-colors flex items-center justify-center"
            @click="triggerFileInput"
          >
            <div class="text-center">
              <svg class="w-12 h-12 mx-auto mb-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p class="text-sm font-medium text-neutral-600">클릭하여 이미지 선택</p>
              <p class="text-xs text-neutral-400 mt-1">PNG, JPG, GIF (최대 5MB)</p>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- 링크 설정 -->
      <UiCard title="링크 설정">
        <div class="space-y-4">
          <!-- 링크 URL -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">링크 URL</label>
            <input
              v-model="form.linkUrl"
              type="text"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://example.com 또는 /event/sale"
            >
          </div>

          <!-- 링크 오픈 방식 -->
          <div>
            <p class="block text-sm font-medium text-neutral-700 mb-2">링크 오픈 방식</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="opt in linkTargetOptions"
                :key="opt.value"
                type="button"
                :class="[
                  'px-4 py-2 border rounded-lg cursor-pointer transition-colors',
                  form.linkTarget === opt.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                ]"
                @click="form.linkTarget = opt.value"
              >
                <span class="text-sm font-medium">{{ opt.label }}</span>
              </button>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- 팝업 설정 -->
      <UiCard title="팝업 설정">
        <div class="space-y-4">
          <!-- 닫기 옵션 -->
          <div>
            <p class="block text-sm font-medium text-neutral-700 mb-2">닫기 옵션</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="opt in closeOptions"
                :key="opt.value"
                type="button"
                :class="[
                  'px-4 py-2 border rounded-lg cursor-pointer transition-colors',
                  form.closeOption === opt.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                ]"
                @click="form.closeOption = opt.value"
              >
                <span class="text-sm font-medium">{{ opt.label }}</span>
              </button>
            </div>
          </div>

          <!-- 팝업 형태 -->
          <div>
            <p class="block text-sm font-medium text-neutral-700 mb-2">팝업 형태</p>
            <div class="flex flex-wrap gap-3">
              <button
                v-for="opt in popupTypeOptions"
                :key="opt.value"
                type="button"
                :class="[
                  'flex-1 min-w-[140px] px-4 py-3 border rounded-lg cursor-pointer transition-colors text-left',
                  form.popupType === opt.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                ]"
                @click="form.popupType = opt.value"
              >
                <p class="text-sm font-medium" :class="form.popupType === opt.value ? 'text-primary-700' : 'text-neutral-900'">
                  {{ opt.label }}
                </p>
                <p class="text-xs mt-0.5" :class="form.popupType === opt.value ? 'text-primary-600' : 'text-neutral-500'">
                  {{ opt.description }}
                </p>
              </button>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- 노출 기간 -->
      <UiCard title="노출 기간">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">시작일시</label>
            <input
              v-model="form.startedAt"
              type="datetime-local"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">종료일시</label>
            <input
              v-model="form.endedAt"
              type="datetime-local"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
            <p class="text-xs text-neutral-500 mt-1">비워두면 종료일 없이 계속 노출됩니다.</p>
          </div>
        </div>
      </UiCard>
    </div>
  </LayoutFormPage>
</template>
