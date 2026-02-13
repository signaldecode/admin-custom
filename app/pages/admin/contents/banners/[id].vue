<script setup>
/**
 * 배너 등록/수정 페이지
 * - /admin/contents/banners/new → 등록 모드
 * - /admin/contents/banners/:id → 수정 모드
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
const bannerId = computed(() => route.params.id)

// 배너 위치 옵션 (API 스펙에 맞춤)
const positionOptions = [
  { value: 'HERO', label: '히어로', description: '메인 최상단에 노출됩니다. 메인에서는 첫화면에서는 헤더의 폰트가 흰색이라 배경이 어두운 사진이 좋아요.' },
  { value: 'SLIDE', label: '슬라이드', description: '고정높이 240px의 가로 반응형 배너입니다. 중앙 텍스트 배치가 좋아요.' },
  { value: 'HALF', label: '하프', description: '*2개를 등록하여 사용하세요! 화면전체의 좌우배치 절반씩 차지하는 배너입니다. 모바일에서는 상하 배치로 변환됩니다. 제목이 텍스트로 노출됩니다.' },
  { value: 'FULL', label: '풀', description: '화면 전체를 차지하는 풀사이즈 배너에요.' },
]

const selectedPositionDescription = computed(() => {
  const selected = positionOptions.find(opt => opt.value === form.value.position)
  return selected?.description || ''
})

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
  title: '',
  imageUrl: '',
  imageInputType: 'file',
  position: 'HERO',
  startedAt: getDefaultDateTime(),
  endedAt: '',
  noEndDate: false,
  linkUrl: '',
  sortOrder: 1,
  isActive: false, // 노출 여부 (스위치용)
})

// 업로드할 이미지 파일
const imageFile = ref(null)

const isLoading = ref(false)
const isSaving = ref(false)

// 날짜 포맷 변환 (ISO → datetime-local 형식)
const formatDateForInput = (isoDate) => {
  if (!isoDate) return ''
  // "2026-01-28T03:17:02.008Z" → "2026-01-28T03:17"
  return isoDate.slice(0, 16)
}

// 날짜 포맷 변환 (datetime-local → ISO)
const formatDateForApi = (dateStr) => {
  if (!dateStr) return null
  // "2026-01-28T03:17" → "2026-01-28T03:17:00"
  return `${dateStr}:00`
}

// 데이터 로드 (수정 모드에서만)
const fetchBanner = async () => {
  isLoading.value = true

  try {
    const response = await get(`/admin/banners/${bannerId.value}`)
    const data = response.data

    form.value = {
      title: data.title || '',
      imageUrl: data.imageUrl || '',
      imageInputType: data.imageUrl ? 'url' : 'file',
      position: data.position || 'HERO',
      startedAt: formatDateForInput(data.startedAt) || getDefaultDateTime(),
      endedAt: formatDateForInput(data.endedAt),
      noEndDate: data.noEndDate || false,
      linkUrl: data.linkUrl || '',
      sortOrder: data.sortOrder || 1,
      isActive: data.status === 'ACTIVE',
    }
  } catch (error) {
    uiStore.showToast({
      type: 'error',
      message: error.message || '배너 정보를 불러오는데 실패했습니다.',
    })
    router.push('/admin/contents/banners')
  } finally {
    isLoading.value = false
  }
}

// 이미지 파일 선택 및 업로드
const fileInputRef = ref(null)
const isUploading = ref(false)

const handleFileSelect = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  // 파일 유효성 검사
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    uiStore.showToast({ type: 'error', message: 'JPG, PNG, GIF, WEBP 형식만 업로드 가능합니다.' })
    return
  }

  // 파일 크기 제한 (10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    uiStore.showToast({ type: 'error', message: '파일 크기는 10MB 이하여야 합니다.' })
    return
  }

  isUploading.value = true

  try {
    // 이미지 업로드 API 호출
    const formData = new FormData()
    formData.append('file', file)

    const response = await $api.postFormData('/admin/images', formData)

    // 업로드된 이미지 URL 설정
    form.value.imageUrl = response.data?.imageUrl || response.data?.url || response.imageUrl || response.url
    imageFile.value = file

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

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

// 유효성 검사
const validateForm = () => {
  if (!form.value.title.trim()) {
    uiStore.showToast({ type: 'error', message: '제목을 입력해주세요.' })
    return false
  }
  if (!form.value.imageUrl) {
    uiStore.showToast({ type: 'error', message: '이미지를 등록해주세요.' })
    return false
  }
  if (!form.value.startedAt) {
    uiStore.showToast({ type: 'error', message: '시작일시를 입력해주세요.' })
    return false
  }
  if (!form.value.noEndDate && !form.value.endedAt) {
    uiStore.showToast({ type: 'error', message: '종료일시를 입력하거나 "종료일 없음"을 선택해주세요.' })
    return false
  }
  // 종료일이 시작일보다 이전인지 검사
  if (!form.value.noEndDate && form.value.endedAt && form.value.startedAt > form.value.endedAt) {
    uiStore.showToast({ type: 'error', message: '종료일시는 시작일시 이후여야 합니다.' })
    return false
  }
  return true
}

// API 요청 데이터 구성
const buildRequestData = () => {
  return {
    title: form.value.title,
    position: form.value.position,
    imageUrl: form.value.imageUrl,
    linkUrl: form.value.linkUrl || null,
    sortOrder: form.value.sortOrder,
    status: form.value.isActive ? 'ACTIVE' : 'INACTIVE',
    startedAt: formatDateForApi(form.value.startedAt),
    endedAt: form.value.noEndDate ? null : formatDateForApi(form.value.endedAt),
    noEndDate: form.value.noEndDate,
  }
}

// 저장
const handleSave = async () => {
  if (!validateForm()) return

  isSaving.value = true

  try {
    const requestData = buildRequestData()

    // TODO: 이미지 파일 업로드가 필요한 경우 별도 처리 필요
    // 현재는 imageUrl을 직접 사용

    if (isEditMode.value) {
      // 수정
      await patch(`/admin/banners/${bannerId.value}`, requestData)
      uiStore.showToast({ type: 'success', message: '배너가 수정되었습니다.' })
    } else {
      // 등록
      await post('/admin/banners', requestData)
      uiStore.showToast({ type: 'success', message: '배너가 등록되었습니다.' })
    }

    router.push('/admin/contents/banners')
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
  if (!confirm('이 배너를 삭제하시겠습니까?')) return

  try {
    await del(`/admin/banners/${bannerId.value}`)
    uiStore.showToast({ type: 'success', message: '배너가 삭제되었습니다.' })
    router.push('/admin/contents/banners')
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
    fetchBanner()
  }
})
</script>

<template>
  <LayoutFormPage
    :title="isEditMode ? '배너 수정' : '배너 등록'"
    :description="isEditMode ? '배너 정보를 수정합니다.' : '새 배너를 등록합니다.'"
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
      <!-- 노출 여부 -->
      <UiCard title="노출 여부">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-neutral-900">배너 노출</p>
            <p class="text-xs text-neutral-500 mt-0.5">활성화하면 설정한 기간 동안 배너가 노출됩니다.</p>
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
          <!-- 제목 -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">제목 <span class="text-error-500">*</span></label>
            <input
              v-model="form.title"
              type="text"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="배너 제목을 입력하세요"
            >
          </div>

          <!-- 이미지 -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-2">이미지</label>
            <div class="flex gap-4 mb-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="form.imageInputType" type="radio" value="file" class="w-4 h-4 text-primary-600 border-neutral-300 focus:ring-primary-500">
                <span class="text-sm text-neutral-700">파일 업로드</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="form.imageInputType" type="radio" value="url" class="w-4 h-4 text-primary-600 border-neutral-300 focus:ring-primary-500">
                <span class="text-sm text-neutral-700">URL 입력</span>
              </label>
            </div>

            <!-- 파일 업로드 -->
            <div v-if="form.imageInputType === 'file'">
              <input ref="fileInputRef" type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden" @change="handleFileSelect">
              <div
                :class="[
                  'w-full h-40 bg-neutral-50 rounded-lg border-2 border-dashed transition-colors flex items-center justify-center',
                  isUploading ? 'border-primary-300 cursor-wait' : 'border-neutral-300 hover:border-primary-400 cursor-pointer',
                ]"
                @click="!isUploading && triggerFileInput()"
              >
                <!-- 업로드 중 -->
                <div v-if="isUploading" class="text-center">
                  <UiSpinner size="md" class="mx-auto mb-2" />
                  <p class="text-sm text-neutral-500">이미지 업로드 중...</p>
                </div>
                <!-- 이미지 미리보기 -->
                <div v-else-if="form.imageUrl" class="relative w-full h-full">
                  <img :src="form.imageUrl" alt="미리보기" class="w-full h-full object-contain rounded-lg">
                  <div class="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <span class="text-white text-sm">클릭하여 변경</span>
                  </div>
                </div>
                <!-- 빈 상태 -->
                <div v-else class="text-center">
                  <svg class="w-10 h-10 mx-auto mb-2 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p class="text-sm text-neutral-500">클릭하여 이미지 선택</p>
                  <p class="text-xs text-neutral-400 mt-1">권장 사이즈: 1920x600px (JPG, PNG, GIF, WEBP)</p>
                </div>
              </div>
            </div>

            <!-- URL 입력 -->
            <div v-else>
              <input v-model="form.imageUrl" type="text" class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="https://example.com/image.jpg">
              <div v-if="form.imageUrl" class="mt-2 w-full h-40 bg-neutral-50 rounded-lg overflow-hidden">
                <img :src="form.imageUrl" alt="미리보기" class="w-full h-full object-contain">
              </div>
            </div>
          </div>

          <!-- 연결 링크 -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">연결 링크</label>
            <input v-model="form.linkUrl" type="text" class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="/sale/event 또는 https://...">
          </div>
        </div>
      </UiCard>

      <!-- 배너 설정 -->
      <UiCard title="배너 설정">
        <div class="space-y-4">
          <!-- 배너 위치 -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-2">배너 위치</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="opt in positionOptions"
                :key="opt.value"
                type="button"
                :class="[
                  'px-3 py-2 border rounded-lg text-sm cursor-pointer transition-colors',
                  form.position === opt.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-neutral-200 hover:border-neutral-300 text-neutral-600',
                ]"
                @click="form.position = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
            <p v-if="selectedPositionDescription" class="mt-2 text-sm text-neutral-500">
              {{ selectedPositionDescription }}
            </p>
          </div>

          <!-- 노출 순서 -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">노출 순서</label>
            <input v-model.number="form.sortOrder" type="number" min="1" class="w-24 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          </div>

          <!-- 노출 기간 -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-2">노출 기간</label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div>
                <label class="block text-xs text-neutral-500 mb-1">시작일시 <span class="text-error-500">*</span></label>
                <input
                  v-model="form.startedAt"
                  type="datetime-local"
                  class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">종료일시</label>
                <input
                  v-model="form.endedAt"
                  type="datetime-local"
                  :disabled="form.noEndDate"
                  :class="[
                    'w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500',
                    form.noEndDate ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : '',
                  ]"
                >
              </div>
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="form.noEndDate" type="checkbox" class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500">
              <span class="text-sm text-neutral-700">종료일 없음 (상시 노출)</span>
            </label>
          </div>
        </div>
      </UiCard>
    </div>
  </LayoutFormPage>
</template>
