<script setup>
/**
 * 기본 설정 페이지
 * - GET /admin/tenant : 전체 설정 조회
 * - PUT /admin/tenant : 전체 설정 수정 (multipart/form-data)
 */

import { useUiStore } from '~/stores/ui'

const { $api } = useNuxtApp()
const uiStore = useUiStore()

// 탭 정의
const tabs = [
  { id: 'info', label: '쇼핑몰 정보' },
  { id: 'settlement', label: '정산 정보' },
  { id: 'maintenance', label: '운영 상태' },
  { id: 'seo', label: 'SEO 설정' },
  { id: 'social', label: '소셜 미디어' },
  { id: 'notification', label: '알림 설정' },
  { id: 'security', label: '보안 설정' },
]

const activeTab = ref('info')

// 로딩/저장 상태
const isLoading = ref(true)
const isSaving = ref(false)

// 쇼핑몰 정보
const info = ref({
  id: null,
  code: '',
  name: '',
  nameEn: '',
  logoUrl: '',
  faviconUrl: '',
  theme: 'BLUE',
  businessName: '',
  businessNumber: '',
  businessType: 'INDIVIDUAL',
  businessCategory: '',
  ecommerceLicense: '',
  ceoName: '',
  phone: '',
  email: '',
  zipCode: '',
  address: '',
  addressDetail: '',
  csPhone: '',
  csFax: '',
  csEmail: '',
  csHours: '',
  privacyOfficer: '',
  privacyEmail: '',
  copyrightText: '',
  isActive: true,
})

// 테마 컬러 옵션
const themeColorOptions = [
  { value: 'BLUE', color: '#3F51B5', label: '블루' },
  { value: 'GREEN', color: '#0c6f23', label: '그린' },
  { value: 'BROWN', color: '#795548', label: '브라운' },
  { value: 'BLACK', color: '#212121', label: '블랙' },
]

// 정산 정보
const settlement = ref({
  bankName: '',
  bankAccount: '',
  bankHolder: '',
  paymentDeadlineDays: 3,
})

// 운영 상태 (점검 모드)
const maintenance = ref({
  enabled: false,
  message: '',
  startAt: '',
  endAt: '',
})

// SEO 설정
const seo = ref({
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  // ogImage: '',
  robotsTxt: '',
})

// 소셜 미디어
const social = ref({
  instagram: '',
  facebook: '',
  youtube: '',
  blog: '',
  kakao: '',
})

// 알림 설정
const notification = ref({
  orderEmail: '',
  claimEmail: '',
  inquiryEmail: '',
  orderEnabled: true,
  claimEnabled: true,
  inquiryEnabled: true,
})

// 보안 설정
const security = ref({
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  accountLockDuration: 30,
  passwordChangeRequired: false,
  passwordChangeCycle: 90,
})

// 이미지 파일 (업로드용)
const logoFile = ref(null)
const faviconFile = ref(null)
const ogImageFile = ref(null)

// 파일 input refs
const logoInputRef = ref(null)
const faviconInputRef = ref(null)
const ogImageInputRef = ref(null)

// 이미지 미리보기
const logoPreview = computed(() => logoFile.value ? URL.createObjectURL(logoFile.value) : info.value.logoUrl)
const faviconPreview = computed(() => faviconFile.value ? URL.createObjectURL(faviconFile.value) : info.value.faviconUrl)
// const ogImagePreview = computed(() => ogImageFile.value ? URL.createObjectURL(ogImageFile.value) : seo.value.ogImage)

// 이미지 업로드 핸들러
const handleLogoUpload = (event) => {
  const file = event.target.files?.[0]
  if (file) logoFile.value = file
}

const handleFaviconUpload = (event) => {
  const file = event.target.files?.[0]
  if (file) faviconFile.value = file
}

// const handleOgImageUpload = (event) => {
//   const file = event.target.files?.[0]
//   if (file) ogImageFile.value = file
// }

// 설정 데이터 로드
const fetchSettings = async () => {
  isLoading.value = true

  try {
    const response = await $api.get('/admin/tenant')
    const data = response.data || response

    // 각 섹션 데이터 매핑
    if (data.info) {
      info.value = { ...info.value, ...data.info }
    }
    if (data.settlement) {
      settlement.value = { ...settlement.value, ...data.settlement }
    }
    if (data.maintenance) {
      maintenance.value = { ...maintenance.value, ...data.maintenance }
    }
    if (data.seo) {
      seo.value = { ...seo.value, ...data.seo }
    }
    if (data.social) {
      social.value = { ...social.value, ...data.social }
    }
    if (data.notification) {
      notification.value = { ...notification.value, ...data.notification }
    }
    if (data.security) {
      security.value = { ...security.value, ...data.security }
    }
  } catch (error) {
    console.error('설정 로드 실패:', error)
    uiStore.showToast({ type: 'error', message: '설정을 불러오지 못했습니다.' })
  } finally {
    isLoading.value = false
  }
}

// 필수 필드 검증
const validateRequired = () => {
  const errors = []

  if (!info.value.name?.trim()) {
    errors.push('쇼핑몰 이름(한글)')
  }
  if (!info.value.businessName?.trim()) {
    errors.push('상호명')
  }
  if (!info.value.businessNumber?.trim()) {
    errors.push('사업자등록번호')
  }
  if (!info.value.ceoName?.trim()) {
    errors.push('대표자명')
  }
  if (!info.value.csPhone?.trim()) {
    errors.push('고객센터 전화번호')
  }

  return errors
}

// 저장
const handleSave = async () => {
  // 필수 필드 검증
  const errors = validateRequired()
  if (errors.length > 0) {
    uiStore.showToast({
      type: 'error',
      message: `필수 항목을 입력해주세요: ${errors.join(', ')}`,
    })
    return
  }

  isSaving.value = true

  try {
    const formData = new FormData()

    // JSON 데이터
    const jsonData = {
      info: {
        name: info.value.name,
        nameEn: info.value.nameEn,
        theme: info.value.theme,
        businessName: info.value.businessName,
        businessNumber: info.value.businessNumber,
        businessType: info.value.businessType,
        businessCategory: info.value.businessCategory,
        ecommerceLicense: info.value.ecommerceLicense,
        ceoName: info.value.ceoName,
        phone: info.value.phone,
        email: info.value.email,
        zipCode: info.value.zipCode,
        address: info.value.address,
        addressDetail: info.value.addressDetail,
        csPhone: info.value.csPhone,
        csFax: info.value.csFax,
        csEmail: info.value.csEmail,
        csHours: info.value.csHours,
        privacyOfficer: info.value.privacyOfficer,
        privacyEmail: info.value.privacyEmail,
        copyrightText: info.value.copyrightText,
        isActive: info.value.isActive,
      },
      seo: seo.value,
      settlement: settlement.value,
      maintenance: maintenance.value,
      social: social.value,
      notification: notification.value,
      security: security.value,
    }

    formData.append('data', JSON.stringify(jsonData))

    // 이미지 파일 추가
    if (logoFile.value) {
      formData.append('logo', logoFile.value)
    }
    if (faviconFile.value) {
      formData.append('favicon', faviconFile.value)
    }
    // if (ogImageFile.value) {
    //   formData.append('ogImage', ogImageFile.value)
    // }

    await $api.putFormData('/admin/tenant', formData)

    // 파일 상태 초기화
    logoFile.value = null
    faviconFile.value = null
    // ogImageFile.value = null

    uiStore.showToast({ type: 'success', message: '설정이 저장되었습니다.' })
  } catch (error) {
    console.error('설정 저장 실패:', error)
    uiStore.showToast({
      type: 'error',
      message: error.data?.message || '저장에 실패했습니다.',
    })
  } finally {
    isSaving.value = false
  }
}

// 세션 타임아웃 옵션
const sessionTimeoutOptions = [
  { value: 15, label: '15분' },
  { value: 30, label: '30분' },
  { value: 60, label: '1시간' },
  { value: 120, label: '2시간' },
  { value: 480, label: '8시간' },
]

// 비밀번호 변경 주기 옵션
const passwordChangeCycleOptions = [
  { value: 30, label: '30일' },
  { value: 60, label: '60일' },
  { value: 90, label: '90일' },
  { value: 180, label: '180일' },
]

// 은행 옵션
const bankOptions = [
  '신한은행',
  '국민은행',
  '우리은행',
  '하나은행',
  '기업은행',
  '농협은행',
  '카카오뱅크',
  '토스뱅크',
]

// 사업자 구분 옵션
const businessTypeOptions = [
  { value: 'INDIVIDUAL', label: '개인' },
  { value: 'CORPORATE', label: '법인' },
]

// 주소 검색 (Daum 우편번호 서비스)
const openAddressSearch = () => {
  if (!window.daum?.Postcode) {
    uiStore.showToast({ type: 'error', message: '주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.' })
    return
  }

  new window.daum.Postcode({
    oncomplete: (data) => {
      info.value.zipCode = data.zonecode
      info.value.address = data.roadAddress || data.jibunAddress
    },
  }).open()
}

// 초기 로드
onMounted(() => {
  fetchSettings()
})
</script>

<template>
  <LayoutFormPage
    title="기본 설정"
    description="쇼핑몰의 기본 설정을 관리합니다."
    :is-saving="isSaving"
    @save="handleSave"
  >
    <!-- Tabs -->
    <template #header>
      <div class="border-b border-neutral-200 mt-4 -mx-6 px-6">
        <nav class="flex gap-1 -mb-px overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="[
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
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
    <div v-else class="space-y-6">
      <!-- 쇼핑몰 정보 탭 -->
      <template v-if="activeTab === 'info'">
        <!-- 기본 정보 -->
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">쇼핑몰 기본 정보</h3>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                쇼핑몰 이름 (한글) <span class="text-error-500">*</span>
              </label>
              <input
                v-model="info.name"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="쇼핑몰 이름"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                쇼핑몰 이름 (영문)
              </label>
              <input
                v-model="info.nameEn"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Shop Name"
              >
            </div>
          </div>
        </UiCard>

        <!-- 로고 및 파비콘 -->
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">로고 및 파비콘</h3>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-2">
                로고 이미지
              </label>
              <div class="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center">
                <div v-if="logoPreview" class="mb-3">
                  <img :src="logoPreview" alt="로고" class="h-12 mx-auto">
                </div>
                <UiButton variant="outline" size="sm" @click="logoInputRef?.click()">이미지 업로드</UiButton>
                <input ref="logoInputRef" type="file" accept="image/*" class="hidden" @change="handleLogoUpload">
                <p class="text-xs text-neutral-500 mt-2">권장: 200x60px, PNG/SVG</p>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-2">
                파비콘
              </label>
              <div class="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center">
                <div v-if="faviconPreview" class="mb-3">
                  <img :src="faviconPreview" alt="파비콘" class="h-8 w-8 mx-auto">
                </div>
                <UiButton variant="outline" size="sm" @click="faviconInputRef?.click()">이미지 업로드</UiButton>
                <input ref="faviconInputRef" type="file" accept="image/*" class="hidden" @change="handleFaviconUpload">
                <p class="text-xs text-neutral-500 mt-2">권장: 32x32px, ICO/PNG</p>
              </div>
            </div>
          </div>
        </UiCard>

        <!-- 테마 설정 -->
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">테마 설정</h3>
            <p class="text-sm text-neutral-500 mt-1">쇼핑몰의 메인 컬러를 선택합니다.</p>
          </template>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-3">
              테마 컬러
            </label>
            <div class="flex items-center gap-4">
              <button
                v-for="opt in themeColorOptions"
                :key="opt.value"
                type="button"
                class="group flex flex-col items-center gap-2"
                @click="info.theme = opt.value"
              >
                <div
                  :class="[
                    'w-12 h-12 rounded-full transition-all',
                    info.theme === opt.value
                      ? 'ring-4 ring-offset-2 ring-primary-500 scale-110'
                      : 'hover:scale-105',
                  ]"
                  :style="{ backgroundColor: opt.color }"
                />
                <span
                  :class="[
                    'text-xs',
                    info.theme === opt.value
                      ? 'text-primary-600 font-medium'
                      : 'text-neutral-500',
                  ]"
                >
                  {{ opt.label }}
                </span>
              </button>
            </div>
            <p class="text-xs text-neutral-400 mt-3">
              선택된 컬러: {{ themeColorOptions.find(o => o.value === info.theme)?.color }}
            </p>
          </div>
        </UiCard>

        <!-- 사업자 정보 -->
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">사업자 정보</h3>
            <p class="text-sm text-neutral-500 mt-1">푸터에 표시되는 사업자 정보입니다.</p>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                상호명 <span class="text-error-500">*</span>
              </label>
              <input
                v-model="info.businessName"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="상호명을 입력하세요"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                사업자등록번호 <span class="text-error-500">*</span>
              </label>
              <input
                v-model="info.businessNumber"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="000-00-00000"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                사업자 구분
              </label>
              <select
                v-model="info.businessType"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option v-for="opt in businessTypeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                업태/업종
              </label>
              <input
                v-model="info.businessCategory"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="업태 / 업종"
              >
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                통신판매업신고번호
              </label>
              <input
                v-model="info.ecommerceLicense"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="제0000-지역-00000호"
              >
            </div>
          </div>
        </UiCard>

        <!-- 대표자 정보 -->
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">대표자 정보</h3>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                대표자명 <span class="text-error-500">*</span>
              </label>
              <input
                v-model="info.ceoName"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="대표자명"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                대표 연락처
              </label>
              <input
                v-model="info.phone"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="010-0000-0000"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                대표 이메일
              </label>
              <input
                v-model="info.email"
                type="email"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="email@example.com"
              >
            </div>
          </div>
        </UiCard>

        <!-- 사업장 주소 -->
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">사업장 주소</h3>
          </template>
          <div class="space-y-4">
            <div class="flex gap-2">
              <input
                v-model="info.zipCode"
                type="text"
                class="w-32 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="우편번호"
                readonly
              >
              <UiButton variant="outline" size="sm" @click="openAddressSearch">주소 검색</UiButton>
            </div>
            <div>
              <input
                v-model="info.address"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="기본 주소"
                readonly
              >
            </div>
            <div>
              <input
                v-model="info.addressDetail"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="상세 주소를 입력하세요"
              >
            </div>
          </div>
        </UiCard>

        <!-- 고객센터 정보 -->
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">고객센터 정보</h3>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                고객센터 전화번호 <span class="text-error-500">*</span>
              </label>
              <input
                v-model="info.csPhone"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="1588-0000"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                고객센터 이메일
              </label>
              <input
                v-model="info.csEmail"
                type="email"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="cs@example.com"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                운영시간
              </label>
              <input
                v-model="info.csHours"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="평일 09:00 ~ 18:00"
              >
            </div>
          </div>
        </UiCard>

        <!-- 개인정보 관리 -->
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">개인정보 관리</h3>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                개인정보관리책임자
              </label>
              <input
                v-model="info.privacyOfficer"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="담당자명"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                개인정보 관련 이메일
              </label>
              <input
                v-model="info.privacyEmail"
                type="email"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="privacy@example.com"
              >
            </div>
          </div>
        </UiCard>

        <!-- 저작권 -->
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">저작권 문구</h3>
          </template>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">
              푸터 저작권 문구
            </label>
            <input
              v-model="info.copyrightText"
              type="text"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="© 2025 회사명. All rights reserved."
            >
            <p class="text-xs text-neutral-500 mt-1">푸터 하단에 표시되는 저작권 문구입니다.</p>
          </div>
        </UiCard>
      </template>

      <!-- 정산 정보 탭 -->
      <template v-if="activeTab === 'settlement'">
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">정산 계좌 정보</h3>
            <p class="text-sm text-neutral-500 mt-1">정산금이 입금되는 계좌 정보입니다.</p>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                은행명
              </label>
              <select
                v-model="settlement.bankName"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">선택하세요</option>
                <option v-for="bank in bankOptions" :key="bank" :value="bank">
                  {{ bank }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                계좌번호
              </label>
              <input
                v-model="settlement.bankAccount"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="계좌번호 입력"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                예금주
              </label>
              <input
                v-model="settlement.bankHolder"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="예금주명"
              >
            </div>
          </div>
        </UiCard>

        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">입금 기한 설정</h3>
            <p class="text-sm text-neutral-500 mt-1">주문 후 입금까지의 기한을 설정합니다.</p>
          </template>
          <div class="max-w-xs">
            <label class="block text-sm font-medium text-neutral-700 mb-1">
              입금 기한 (일)
            </label>
            <input
              v-model.number="settlement.paymentDeadlineDays"
              type="number"
              min="1"
              max="30"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="3"
            >
            <p class="text-xs text-neutral-500 mt-1">최소 1일 ~ 최대 30일 (기본값: 3일)</p>
          </div>
        </UiCard>
      </template>

      <!-- 운영 상태 탭 -->
      <template v-if="activeTab === 'maintenance'">
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">쇼핑몰 운영 상태</h3>
          </template>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p class="font-medium text-neutral-900">쇼핑몰 운영</p>
                <p class="text-sm text-neutral-500">쇼핑몰 오픈/클로즈 상태를 설정합니다.</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="info.isActive" type="checkbox" class="sr-only peer">
                <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
              </label>
            </div>
          </div>
        </UiCard>

        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">점검 모드</h3>
          </template>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p class="font-medium text-neutral-900">점검 모드 활성화</p>
                <p class="text-sm text-neutral-500">활성화 시 고객에게 점검 안내 페이지가 표시됩니다.</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="maintenance.enabled" type="checkbox" class="sr-only peer">
                <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-warning-500" />
              </label>
            </div>

            <div v-if="maintenance.enabled" class="space-y-4 pt-2">
              <div>
                <label class="block text-sm font-medium text-neutral-700 mb-1">
                  점검 안내 메시지
                </label>
                <textarea
                  v-model="maintenance.message"
                  rows="3"
                  class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="고객에게 표시될 점검 안내 메시지"
                />
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-neutral-700 mb-1">
                    점검 시작 일시
                  </label>
                  <input
                    v-model="maintenance.startAt"
                    type="datetime-local"
                    class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-neutral-700 mb-1">
                    점검 종료 일시
                  </label>
                  <input
                    v-model="maintenance.endAt"
                    type="datetime-local"
                    class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                </div>
              </div>
            </div>
          </div>
        </UiCard>
      </template>

      <!-- SEO 설정 탭 -->
      <template v-if="activeTab === 'seo'">
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">기본 메타 정보</h3>
          </template>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                메타 타이틀
              </label>
              <input
                v-model="seo.metaTitle"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="검색 결과에 표시될 사이트 제목"
              >
              <p class="text-xs text-neutral-500 mt-1">{{ seo.metaTitle?.length || 0 }}/60자 권장</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                메타 설명
              </label>
              <textarea
                v-model="seo.metaDescription"
                rows="2"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="검색 결과에 표시될 사이트 설명"
              />
              <p class="text-xs text-neutral-500 mt-1">{{ seo.metaDescription?.length || 0 }}/160자 권장</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                메타 키워드
              </label>
              <input
                v-model="seo.metaKeywords"
                type="text"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="쉼표로 구분하여 입력"
              >
            </div>
          </div>
        </UiCard>

        <!-- <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">OG(Open Graph) 이미지</h3>
          </template>
          <div>
            <p class="text-sm text-neutral-500 mb-3">SNS 공유 시 표시되는 대표 이미지입니다.</p>
            <div class="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center">
              <div v-if="ogImagePreview" class="mb-3">
                <img :src="ogImagePreview" alt="OG 이미지" class="max-h-32 mx-auto rounded">
              </div>
              <UiButton variant="outline" size="sm" @click="ogImageInputRef?.click()">이미지 업로드</UiButton>
              <input ref="ogImageInputRef" type="file" accept="image/*" class="hidden" @change="handleOgImageUpload">
              <p class="text-xs text-neutral-500 mt-2">권장: 1200x630px, JPG/PNG</p>
            </div>
          </div>
        </UiCard> -->

        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">robots.txt</h3>
          </template>
          <div>
            <textarea
              v-model="seo.robotsTxt"
              rows="5"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="robots.txt 내용"
            />
          </div>
        </UiCard>
      </template>

      <!-- 소셜 미디어 탭 -->
      <template v-if="activeTab === 'social'">
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">소셜 미디어 링크</h3>
            <p class="text-sm text-neutral-500 mt-1">푸터 및 사이트 곳곳에 표시되는 SNS 링크입니다.</p>
          </template>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                Instagram
              </label>
              <input
                v-model="social.instagram"
                type="url"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="https://instagram.com/yourshop"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                Facebook
              </label>
              <input
                v-model="social.facebook"
                type="url"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="https://facebook.com/yourshop"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                YouTube
              </label>
              <input
                v-model="social.youtube"
                type="url"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="https://youtube.com/@yourshop"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                블로그
              </label>
              <input
                v-model="social.blog"
                type="url"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="https://blog.naver.com/yourshop"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                카카오 채널
              </label>
              <input
                v-model="social.kakao"
                type="url"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="https://pf.kakao.com/_xxxxx"
              >
            </div>
          </div>
        </UiCard>
      </template>

      <!-- 알림 설정 탭 -->
      <template v-if="activeTab === 'notification'">
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">알림 수신 이메일</h3>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                주문 알림 수신
              </label>
              <input
                v-model="notification.orderEmail"
                type="email"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="order@example.com"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                클레임 알림 수신
              </label>
              <input
                v-model="notification.claimEmail"
                type="email"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="claim@example.com"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                문의 알림 수신
              </label>
              <input
                v-model="notification.inquiryEmail"
                type="email"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="cs@example.com"
              >
            </div>
          </div>
        </UiCard>

        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">알림 활성화</h3>
          </template>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p class="font-medium text-neutral-900">주문 알림</p>
                <p class="text-sm text-neutral-500">신규 주문 발생 시 이메일 알림을 받습니다.</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="notification.orderEnabled" type="checkbox" class="sr-only peer">
                <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
              </label>
            </div>
            <div class="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p class="font-medium text-neutral-900">클레임 알림</p>
                <p class="text-sm text-neutral-500">취소/교환/반품 요청 시 이메일 알림을 받습니다.</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="notification.claimEnabled" type="checkbox" class="sr-only peer">
                <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
              </label>
            </div>
            <div class="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p class="font-medium text-neutral-900">문의 알림</p>
                <p class="text-sm text-neutral-500">고객 문의 등록 시 이메일 알림을 받습니다.</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="notification.inquiryEnabled" type="checkbox" class="sr-only peer">
                <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
              </label>
            </div>
          </div>
        </UiCard>
      </template>

      <!-- 보안 설정 탭 -->
      <template v-if="activeTab === 'security'">
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">세션 설정</h3>
          </template>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                세션 타임아웃
              </label>
              <select
                v-model="security.sessionTimeout"
                class="w-full md:w-64 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option v-for="opt in sessionTimeoutOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <p class="text-xs text-neutral-500 mt-1">활동이 없을 경우 자동 로그아웃되는 시간</p>
            </div>
          </div>
        </UiCard>

        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">로그인 보안</h3>
          </template>
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-neutral-700 mb-1">
                  최대 로그인 시도 횟수
                </label>
                <input
                  v-model.number="security.maxLoginAttempts"
                  type="number"
                  min="1"
                  max="10"
                  class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-neutral-700 mb-1">
                  계정 잠금 시간 (분)
                </label>
                <input
                  v-model.number="security.accountLockDuration"
                  type="number"
                  min="1"
                  max="60"
                  class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
              </div>
            </div>
          </div>
        </UiCard>

        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">비밀번호 정책</h3>
          </template>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
              <div>
                <p class="font-medium text-neutral-900">주기적 비밀번호 변경 요구</p>
                <p class="text-sm text-neutral-500">설정된 주기마다 비밀번호 변경을 요구합니다.</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="security.passwordChangeRequired" type="checkbox" class="sr-only peer">
                <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
              </label>
            </div>

            <div v-if="security.passwordChangeRequired">
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                비밀번호 변경 주기
              </label>
              <select
                v-model="security.passwordChangeCycle"
                class="w-full md:w-64 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option v-for="opt in passwordChangeCycleOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>
        </UiCard>
      </template>
    </div>
  </LayoutFormPage>
</template>
