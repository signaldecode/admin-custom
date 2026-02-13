<script setup>
/**
 * 상품 등록/수정 페이지
 * - /admin/products/new → 등록 모드
 * - /admin/products/:id → 수정 모드
 */

import { useUiStore } from '~/stores/ui'
import { useCatalogStore } from '~/stores/catalog'
import { formatCurrency } from '~/utils/formatters'

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const uiStore = useUiStore()
const catalogStore = useCatalogStore()

// 모드 판별
const isEditMode = computed(() => route.params.id !== 'new')

// 상품 ID
const productId = computed(() => route.params.id)

// 로딩 상태
const isLoading = ref(false)

// 저장 상태
const isSaving = ref(false)

// 원본 데이터 (변경 감지용)
const originalData = ref(null)
const originalTagIds = ref([])
const originalOptionGroups = ref([])
const originalVariants = ref([])
const originalMainImage = ref(null)

// 상품 데이터
const product = ref({
  name: '',
  costPrice: 0,
  description: '',
  detailContent: '', // 상세 페이지 HTML 콘텐츠
  categoryId: '', // 카테고리 ID
  price: 0,
  hasDiscount: false,
  discountType: 'RATE', // 'RATE' = 퍼센트, 'AMOUNT' = 금액
  discountValue: 0,
  maxPurchase: 10,
  status: 'ON_SALE',
})

// 선택된 태그 ID 목록
const selectedTagIds = ref([])

// 카테고리 목록 (Pinia 스토어에서 가져옴)
const categories = computed(() => catalogStore.categories)

// 카테고리 옵션 (플랫하게 변환)
const categoryOptions = computed(() => catalogStore.getCategoryOptions())

// 태그 목록 (Pinia 스토어에서 가져옴)
const tags = computed(() => catalogStore.tags)

// 태그 선택/해제 토글
const toggleTag = (tagId) => {
  const index = selectedTagIds.value.indexOf(tagId)
  if (index > -1) {
    selectedTagIds.value.splice(index, 1)
  } else {
    selectedTagIds.value.push(tagId)
  }
}

// 태그 선택 여부 확인
const isTagSelected = (tagId) => selectedTagIds.value.includes(tagId)

// 대표 이미지
const mainImage = ref(null)

// 옵션 정의 (대분류/소분류)
const optionGroups = ref([])

// 옵션 조합 (variants)
const variants = ref([])
const isVariantsGenerated = ref(false)

// 벌크 선택
const selectedVariantIds = ref([])
const showBulkStockModal = ref(false)
const showBulkPriceModal = ref(false)
const bulkStockValue = ref(0)
const bulkPriceValue = ref(0)

// 옵션명 유효성 검사 (콤마 금지)
const validateOptionName = (name) => {
  return !name.includes(',')
}

// 옵션값 파싱 (콤마로 구분)
const parseOptionValues = (input) => {
  if (!input) return []
  return input
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

// 할인가 계산
const discountPrice = computed(() => {
  if (!product.value.hasDiscount || product.value.discountValue <= 0) {
    return product.value.price
  }
  // 'RATE' = 퍼센트 할인, 'AMOUNT' = 금액 할인
  if (product.value.discountType === 'RATE') {
    return Math.floor(product.value.price * (1 - product.value.discountValue / 100))
  }
  return Math.max(0, product.value.price - product.value.discountValue)
})

// 할인율 계산
const discountRate = computed(() => {
  if (!product.value.hasDiscount || product.value.price <= 0) return 0
  return Math.round((1 - discountPrice.value / product.value.price) * 100)
})

// 대표 이미지 업로드
const handleMainImageUpload = (event) => {
  const file = event.target.files?.[0]
  if (file) {
    mainImage.value = {
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }
  }
}

// 옵션 그룹 추가
const addOptionGroup = () => {
  optionGroups.value.push({
    id: Date.now(),
    name: '',
    valuesInput: '', // 콤마로 구분된 입력값
    nameError: false,
  })
  isVariantsGenerated.value = false
  variants.value = []
}

// 옵션 그룹 삭제
const removeOptionGroup = (index) => {
  optionGroups.value.splice(index, 1)
  isVariantsGenerated.value = false
  variants.value = []
}

// 옵션명 입력 핸들러 (콤마 제거)
const handleOptionNameInput = (group, event) => {
  const value = event.target.value
  if (value.includes(',')) {
    group.nameError = true
    group.name = value.replace(/,/g, '')
  } else {
    group.nameError = false
    group.name = value
  }
  isVariantsGenerated.value = false
  variants.value = []
}

// 옵션값 입력 변경 핸들러
const handleValuesInputChange = () => {
  isVariantsGenerated.value = false
  variants.value = []
}

// 벌크 선택: 전체 선택/해제
const handleSelectAllVariants = (selectAll) => {
  selectedVariantIds.value = selectAll ? variants.value.map((v) => v.id) : []
}

// 벌크 선택: 개별 선택
const handleSelectVariant = (id) => {
  const index = selectedVariantIds.value.indexOf(id)
  if (index > -1) {
    selectedVariantIds.value.splice(index, 1)
  } else {
    selectedVariantIds.value.push(id)
  }
}

// 벌크 선택: 선택 여부 확인
const isVariantSelected = (id) => selectedVariantIds.value.includes(id)

// 벌크 선택: 전체 선택 여부
const isAllVariantsSelected = computed(() => {
  return variants.value.length > 0 && selectedVariantIds.value.length === variants.value.length
})

// 벌크 액션: SKU 비우기
const handleBulkClearSku = () => {
  variants.value.forEach((v) => {
    if (selectedVariantIds.value.includes(v.id)) {
      v.sku = ''
    }
  })
  selectedVariantIds.value = []
  uiStore.showToast({ type: 'success', message: 'SKU가 초기화되었습니다.' })
}

// 벌크 액션: 재고 일괄 수정
const openBulkStockModal = () => {
  bulkStockValue.value = 0
  showBulkStockModal.value = true
}

const handleBulkStockUpdate = () => {
  variants.value.forEach((v) => {
    if (selectedVariantIds.value.includes(v.id)) {
      v.stock = bulkStockValue.value
    }
  })
  showBulkStockModal.value = false
  selectedVariantIds.value = []
  uiStore.showToast({ type: 'success', message: '재고가 일괄 수정되었습니다.' })
}

// 벌크 액션: 추가금액 일괄 수정
const openBulkPriceModal = () => {
  bulkPriceValue.value = 0
  showBulkPriceModal.value = true
}

const handleBulkPriceUpdate = () => {
  variants.value.forEach((v) => {
    if (selectedVariantIds.value.includes(v.id)) {
      v.additionalPrice = bulkPriceValue.value
    }
  })
  showBulkPriceModal.value = false
  selectedVariantIds.value = []
  uiStore.showToast({ type: 'success', message: '추가금액이 일괄 수정되었습니다.' })
}

// 옵션 조합 생성
const generateVariants = () => {
  // 각 그룹의 옵션값 파싱
  const parsedGroups = optionGroups.value
    .map((g) => ({
      name: g.name.trim(),
      values: parseOptionValues(g.valuesInput),
    }))
    .filter((g) => g.name && g.values.length > 0)

  if (parsedGroups.length === 0) {
    uiStore.showToast({ type: 'error', message: '옵션을 먼저 설정해주세요.' })
    return
  }

  // 카테시안 곱으로 모든 조합 생성
  const combinations = parsedGroups.reduce((acc, group) => {
    if (acc.length === 0) {
      return group.values.map((value) => [{ name: group.name, value }])
    }
    const newAcc = []
    acc.forEach((combo) => {
      group.values.forEach((value) => {
        newAcc.push([...combo, { name: group.name, value }])
      })
    })
    return newAcc
  }, [])

  // 조합별 variant 생성
  variants.value = combinations.map((combo, index) => ({
    id: Date.now() + index,
    options: combo,
    optionLabel: combo.map((o) => o.value).join(' / '),
    sku: '',
    stock: 0,
    additionalPrice: 0,
    images: [],
  }))

  isVariantsGenerated.value = true
  selectedVariantIds.value = []

  uiStore.showToast({
    type: 'success',
    message: `${variants.value.length}개의 옵션 조합이 생성되었습니다.`,
  })
}

// 단일 상품 생성 (옵션 없는 상품용)
const createSingleVariant = () => {
  // 기존 옵션 그룹 초기화
  optionGroups.value = [{ id: Date.now(), name: '', valuesInput: '' }]

  // 상품 코드 또는 타임스탬프 기반 SKU 생성
  const productCode = product.value.code?.toUpperCase() || ''
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase()
  const prefix = productCode || (() => {
    const namePrefix = product.value.name
      ? product.value.name.replace(/\s/g, '').substring(0, 4).toUpperCase()
      : 'PRD'
    return `${namePrefix}${timestamp}`
  })()

  // 기본 variant 1개 생성
  variants.value = [{
    id: Date.now(),
    options: [{ name: '기본', value: '기본' }],
    optionLabel: '기본',
    sku: `${prefix}-DEFAULT-001`,
    stock: 0,
    additionalPrice: 0,
    images: [],
  }]

  isVariantsGenerated.value = true
  selectedVariantIds.value = []

  uiStore.showToast({
    type: 'success',
    message: '단일 상품이 생성되었습니다. 재고를 입력해주세요.',
  })
}

// variant 이미지 업로드
const handleVariantImageUpload = (event, variant) => {
  const files = Array.from(event.target.files || [])
  files.forEach((file) => {
    if (variant.images.length < 5) {
      variant.images.push({
        id: Date.now() + Math.random(),
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
      })
    }
  })
}

// variant 이미지 삭제
const removeVariantImage = (variant, imageIndex) => {
  URL.revokeObjectURL(variant.images[imageIndex].preview)
  variant.images.splice(imageIndex, 1)
}

// 전체 재고 합계
const totalStock = computed(() => {
  return variants.value.reduce((sum, v) => sum + (v.stock || 0), 0)
})

// 재고 0 경고 표시 여부 (옵션 조합이 있고, 총 재고가 0이고, 현재 품절 상태가 아닐 때)
const showStockWarning = computed(() => {
  return isVariantsGenerated.value &&
         variants.value.length > 0 &&
         totalStock.value === 0 &&
         product.value.status !== 'SOLD_OUT'
})

// 예상 조합 수
const expectedVariantCount = computed(() => {
  const parsedGroups = optionGroups.value
    .map((g) => ({
      name: g.name.trim(),
      values: parseOptionValues(g.valuesInput),
    }))
    .filter((g) => g.name && g.values.length > 0)

  if (parsedGroups.length === 0) return 0
  return parsedGroups.reduce((acc, g) => acc * g.values.length, 1)
})

// SKU 일괄 생성
const generateSkuBatch = () => {
  // 상품 코드 또는 타임스탬프 기반 prefix
  const productCode = product.value.code?.toUpperCase() || ''
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase() // 짧은 유니크 코드

  // 상품 코드가 있으면 사용, 없으면 상품명 앞글자 + 타임스탬프
  const prefix = productCode || (() => {
    const namePrefix = product.value.name
      ? product.value.name.replace(/\s/g, '').substring(0, 4).toUpperCase()
      : 'PRD'
    return `${namePrefix}${timestamp}`
  })()

  variants.value.forEach((variant, index) => {
    // 옵션값에서 영문/숫자만 추출하거나 앞 2글자 사용
    const optionCode = variant.options
      .map((o) => {
        const val = o.value.replace(/\s/g, '')
        // 영문/숫자가 있으면 추출, 없으면 앞 2글자
        const alphanumeric = val.replace(/[^a-zA-Z0-9]/g, '')
        return alphanumeric ? alphanumeric.substring(0, 3).toUpperCase() : val.substring(0, 2)
      })
      .join('')

    // 순번 3자리
    const seq = String(index + 1).padStart(3, '0')

    variant.sku = `${prefix}-${optionCode}-${seq}`
  })

  uiStore.showToast({ type: 'success', message: 'SKU가 일괄 생성되었습니다.' })
}

// 유효성 검사
const validateForm = () => {
  if (!product.value.name.trim()) {
    uiStore.showToast({ type: 'error', message: '상품명을 입력해주세요.' })
    return false
  }

  if (product.value.price <= 0) {
    uiStore.showToast({ type: 'error', message: '판매가를 입력해주세요.' })
    return false
  }

  // 옵션 조합 필수 (재고 관리를 위해)


  return true
}

// API 요청 데이터 빌드 (전체 - 신규 등록용)
const buildRequestData = () => {
  // 옵션 그룹 필터링 (유효한 것만)
  const validOptionGroups = optionGroups.value
    .filter((g) => g.name.trim() && parseOptionValues(g.valuesInput).length > 0)

  // 옵션 배열 생성
  const options = validOptionGroups.map((g) => ({
    id: g.id && typeof g.id === 'number' && g.id < 1000000000 ? g.id : undefined,
    name: g.name.trim(),
    optionValues: parseOptionValues(g.valuesInput), // 문자열 배열: ["블랙", "화이트"]
  }))

  // variant의 optionValueIds 계산 함수
  const getOptionValueIds = (variant) => {
    // variant.options: [{ name: "색상", value: "빨강" }, { name: "사이즈", value: "M" }]
    // options 배열 순서대로 각 옵션값의 인덱스를 반환
    return variant.options.map((opt) => {
      // 해당 옵션 그룹 찾기
      const groupIndex = validOptionGroups.findIndex(
        (g) => g.name.trim() === opt.name
      )
      if (groupIndex === -1) return 0

      // 해당 그룹에서 옵션값의 인덱스 찾기
      const values = parseOptionValues(validOptionGroups[groupIndex].valuesInput)
      const valueIndex = values.indexOf(opt.value)
      return valueIndex >= 0 ? valueIndex : 0
    })
  }

  const data = {
    name: product.value.name,
    summary: product.value.description,
    description: product.value.detailContent,
    status: product.value.status,
    costPrice: product.value.costPrice,
    regularPrice: product.value.price,
    salePrice: discountPrice.value,
    maxPurchaseQuantity: product.value.maxPurchaseQuantity,
    discountType: product.value.hasDiscount ? product.value.discountType : null,
    discountValue: product.value.hasDiscount ? product.value.discountValue : 0,
    categoryId: product.value.categoryId || null,
    tagIds: selectedTagIds.value,
    options,
    variants: variants.value.map((v) => {
      const variantData = {
        id: v.id && typeof v.id === 'number' && v.id < 1000000000 ? v.id : undefined,
        name: v.optionLabel, // "블랙 / S" 같은 옵션 조합명
        sku: v.sku,
        additionalPrice: v.additionalPrice,
        stockQuantity: v.stock,
      }
      // 옵션이 있을 때만 optionValueIds 추가 (단일 상품은 제외)
      if (options.length > 0) {
        variantData.optionValueIds = getOptionValueIds(v)
      }
      return variantData
    }),
  }

  return data
}

// 변경된 필드만 추출 (수정용 PATCH)
const buildPatchData = () => {
  if (!originalData.value) return buildRequestData()

  const changes = {}
  const orig = originalData.value

  // 기본 필드 비교
  if (product.value.name !== orig.name) changes.name = product.value.name
  if (product.value.description !== orig.summary) changes.summary = product.value.description
  if (product.value.detailContent !== orig.description) changes.description = product.value.detailContent
  if (product.value.status !== orig.status) changes.status = product.value.status
  if (product.value.costPrice !== orig.costPrice) changes.costPrice = product.value.costPrice
  if (product.value.price !== orig.regularPrice) changes.regularPrice = product.value.price
  if (discountPrice.value !== orig.salePrice) changes.salePrice = discountPrice.value
  if (product.value.maxPurchaseQuantity !== orig.maxPurchaseQuantity) changes.maxPurchaseQuantity = product.value.maxPurchase

  // 할인 관련
  const currentDiscountType = product.value.hasDiscount ? product.value.discountType : null
  const currentDiscountValue = product.value.hasDiscount ? product.value.discountValue : 0
  if (currentDiscountType !== orig.discountType) changes.discountType = currentDiscountType
  if (currentDiscountValue !== orig.discountValue) changes.discountValue = currentDiscountValue

  // 카테고리
  const currentCategoryId = product.value.categoryId || null
  if (currentCategoryId !== orig.category?.id) changes.categoryId = currentCategoryId

  // 태그 비교 (배열)
  const tagsSorted = [...selectedTagIds.value].sort()
  const origTagsSorted = [...originalTagIds.value].sort()
  if (JSON.stringify(tagsSorted) !== JSON.stringify(origTagsSorted)) {
    changes.tagIds = selectedTagIds.value
  }

  // 옵션/variants는 변경 시 전체 전송 (복잡한 구조)
  const currentVariantsJson = JSON.stringify(variants.value.map((v) => ({
    id: v.id,
    sku: v.sku,
    stock: v.stock,
    additionalPrice: v.additionalPrice,
    optionLabel: v.optionLabel,
  })))
  const origVariantsJson = JSON.stringify(originalVariants.value.map((v) => ({
    id: v.id,
    sku: v.sku,
    stock: v.stock,
    additionalPrice: v.additionalPrice,
    optionLabel: v.optionLabel,
  })))

  if (currentVariantsJson !== origVariantsJson) {
    // 옵션/variants 변경됨 - 전체 빌드
    const fullData = buildRequestData()
    changes.options = fullData.options
    changes.variants = fullData.variants
  }

  return changes
}

// 저장
const handleSave = async () => {
  if (!validateForm()) return

  isSaving.value = true

  // 재고 기반 상태 자동 변경
  if (isVariantsGenerated.value && variants.value.length > 0) {
    if (totalStock.value === 0 && product.value.status !== 'SOLD_OUT') {
      // 재고 0 → 품절 처리
      product.value.status = 'SOLD_OUT'
      uiStore.showToast({ type: 'info', message: '재고가 0이므로 품절로 변경되었습니다.' })
    } else if (totalStock.value > 0 && product.value.status === 'SOLD_OUT') {
      // 재고 있음 + 품절 상태 → 판매중으로 변경
      product.value.status = 'ON_SALE'
      uiStore.showToast({ type: 'info', message: '재고가 추가되어 판매중으로 변경되었습니다.' })
    }
  }

  try {
    if (isEditMode.value) {
      // 수정: PATCH - 변경된 필드만 전송
      const patchData = buildPatchData()

      // 변경사항이 없고 이미지도 없으면 스킵
      if (Object.keys(patchData).length === 0 && !mainImage.value?.file) {
        uiStore.showToast({ type: 'info', message: '변경된 내용이 없습니다.' })
        isSaving.value = false
        return
      }

      const formData = new FormData()
      formData.append('data', JSON.stringify(patchData))

      // 새 이미지 파일이 있으면 추가
      if (mainImage.value?.file) {
        formData.append('primaryImage', mainImage.value.file)
      }

      await $api.patchFormData(`/admin/products/${productId.value}`, formData)
      uiStore.showToast({ type: 'success', message: '상품이 수정되었습니다.' })
      router.push('/admin/products')
    } else {
      // 등록: POST - 전체 데이터 전송
      const requestData = buildRequestData()
      const formData = new FormData()
      formData.append('data', JSON.stringify(requestData))

      if (mainImage.value?.file) {
        formData.append('primaryImage', mainImage.value.file)
      }

      await $api.postFormData('/admin/products', formData)
      uiStore.showToast({ type: 'success', message: '상품이 등록되었습니다.' })

      // 등록 후 목록으로 이동
      router.push('/admin/products')
    }
  } catch (err) {
    uiStore.showToast({
      type: 'error',
      message: err.data?.error?.message || err.data?.message || err.message || '저장에 실패했습니다.',
    })
  } finally {
    isSaving.value = false
  }
}

// 삭제 (수정 모드에서만)
const handleDelete = async () => {
  if (!confirm('이 상품을 삭제하시겠습니까?')) return

  try {
    await $api.delete(`/admin/products/${productId.value}`)
    uiStore.showToast({ type: 'success', message: '상품이 삭제되었습니다.' })
    router.push('/admin/products')
  } catch (err) {
    uiStore.showToast({
      type: 'error',
      message: err.data?.error?.message || err.data?.message || err.message || '삭제에 실패했습니다.',
    })
  }
}

// 취소
const handleCancel = () => {
  router.push('/admin/products')
}

// 상태 옵션
const statusOptions = [
  { value: 'ON_SALE', label: '판매중' },
  { value: 'DISCONTINUED', label: '판매중지' },
  { value: 'SOLD_OUT', label: '품절'}
]

// 상품 데이터 불러오기
const fetchProduct = async () => {
  isLoading.value = true

  try {
    const response = await $api.get(`/admin/products/${productId.value}`)
    const data = response.data || response

    // 백엔드 응답 데이터를 현재 product 구조에 매핑
    product.value = {
      name: data.name || '',
      costPrice: data.costPrice ?? 0,
      description: data.summary || '',
      detailContent: data.description || '', // HTML 콘텐츠
      categoryId: data.category?.id || '',
      price: data.regularPrice ?? 0, // 정가
      hasDiscount: (data.discountValue ?? 0) > 0,
      discountType: data.discountType || 'percent',
      discountValue: data.discountValue ?? 0,
      maxPurchase: data.maxPurchaseQuantity ?? 10,
      status: data.status || 'ON_SALE',

      
    }

    // 태그 ID 목록 설정 (API 응답의 tags 배열에서 id 추출)
    if (data.tags && data.tags.length > 0) {
      selectedTagIds.value = data.tags.map((tag) => tag.id)
    }

    // 대표 이미지 설정
    if (data.primaryImage) {
      mainImage.value = {
        preview: data.primaryImage.url,
        name: data.primaryImage.altText || '상품 대표 이미지',
      }
    }

    // 옵션 그룹 설정 (options 배열에서 추출)
    // API 응답: options[].optionValues = [{ id, value }, ...]
    if (data.options && data.options.length > 0) {
      optionGroups.value = data.options.map((option, index) => {
        // optionValues가 객체 배열이면 value만 추출
        const values = option.optionValues
          ? option.optionValues.map((ov) => ov.value || ov)
          : []
        return {
          id: option.id || Date.now() + index,
          name: option.name || '',
          valuesInput: values.join(', '),
          nameError: false,
          // 원본 optionValues 저장 (variant 매핑용)
          _optionValues: option.optionValues || [],
        }
      })
    }

    // Variants 설정
    // API 응답: variants[].optionValueIds = [19, 20, ...] (실제 옵션값 ID)
    if (data.variants && data.variants.length > 0) {
      // optionValueId → { optionName, optionIndex, value } 매핑 생성
      const optionValueMap = {}
      data.options?.forEach((opt, optIndex) => {
        opt.optionValues?.forEach((ov) => {
          optionValueMap[ov.id] = {
            name: opt.name,
            value: ov.value,
            optionIndex: optIndex, // 옵션 그룹 순서 저장
          }
        })
      })

      variants.value = data.variants.map((variant) => {
        // optionValueIds를 options 배열로 변환 (옵션 그룹 순서대로 정렬)
        const mappedOptions = (variant.optionValueIds || [])
          .map((ovId) => optionValueMap[ovId])
          .filter(Boolean)
          .sort((a, b) => a.optionIndex - b.optionIndex) // 옵션 그룹 순서대로 정렬

        const options = mappedOptions.map((o) => ({ name: o.name, value: o.value }))
        // 백엔드에서 name이 있으면 사용, 없으면 옵션값으로 조합
        const optionLabel = variant.name || options.map((o) => o.value).join(' / ')

        return {
          id: variant.id || Date.now(),
          options,
          optionLabel,
          sku: variant.sku || '',
          stock: variant.stockQuantity ?? 0,
          additionalPrice: variant.additionalPrice ?? 0,
          images: variant.images || [],
        }
      })
      isVariantsGenerated.value = true
    }

    // 원본 데이터 저장 (변경 감지용)
    originalData.value = JSON.parse(JSON.stringify(data))
    originalTagIds.value = data.tags ? data.tags.map((tag) => tag.id) : []
    originalVariants.value = JSON.parse(JSON.stringify(variants.value))
    originalMainImage.value = mainImage.value ? { ...mainImage.value } : null

    isLoading.value = false
  } catch (error) {
    console.error('상품 로드 실패:', error)
    uiStore.showToast({ type: 'error', message: '상품을 불러오지 못했습니다.' })
    isLoading.value = false
  }
}

// 초기 로드
onMounted(() => {
  if (isEditMode.value) {
    fetchProduct()
  }
})
</script>

<template>
  <LayoutFormPage
    :title="isEditMode ? (product.name ? `${product.name} 수정` : '상품 수정') : '상품 등록'"
    :description="isEditMode ? '상품 정보를 수정합니다.' : '새 상품을 등록합니다.'"
    :save-text="isEditMode ? '수정' : '등록'"
    :is-saving="isSaving"
    :save-disabled="isLoading"
    show-cancel
    :show-delete="isEditMode"
    @save="handleSave"
    @cancel="handleCancel"
    @delete="handleDelete"
  >
    <!-- 로딩 상태 -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <UiSpinner size="lg" />
    </div>

    <div v-else class="space-y-6">
      <!-- 기본 정보 -->
      <UiCard>
        <template #header>
          <h3 class="font-semibold text-neutral-900">기본 정보</h3>
        </template>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">
              상품명 <span class="text-error-500">*</span>
            </label>
            <input
              v-model="product.name"
              type="text"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="상품명을 입력하세요"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">
              상품 설명
            </label>
            <textarea
              v-model="product.description"
              rows="4"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="상품에 대한 상세 설명을 입력하세요"
            />
          </div>
        </div>
      </UiCard>

      <!-- 대표 이미지 & 카테고리 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 대표 이미지 (좌) -->
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">대표 이미지</h3>
            <p class="text-sm text-neutral-500 mt-1">상품 목록에 표시되는 메인 이미지입니다.</p>
          </template>

          <div class="border-2 border-dashed border-neutral-300 rounded-lg p-6">
            <div v-if="mainImage" class="flex items-center gap-4">
              <div class="w-24 h-24 bg-neutral-100 rounded-lg overflow-hidden">
                <img :src="mainImage.preview" :alt="mainImage.name" class="w-full h-full object-cover">
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-neutral-900">{{ mainImage.name }}</p>
                <button
                  type="button"
                  class="text-sm text-error-600 hover:text-error-700 mt-2"
                  @click="mainImage = null"
                >
                  삭제
                </button>
              </div>
            </div>
            <div v-else class="text-center">
              <svg class="w-10 h-10 mx-auto text-neutral-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <label class="cursor-pointer">
                <span class="text-sm text-primary-600 hover:text-primary-700 font-medium">이미지 업로드</span>
                <input type="file" accept="image/*" class="hidden" @change="handleMainImageUpload">
              </label>
              <p class="text-xs text-neutral-500 mt-1">권장: 800x800px, JPG/PNG</p>
            </div>
          </div>
        </UiCard>

        <!-- 카테고리 (우) -->
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">카테고리</h3>
            <p class="text-sm text-neutral-500 mt-1">
              상품이 속할 카테고리를 선택하세요.<br/>
              대분류 카테고리로 노출 됩니다. 
            </p>
          </template>

          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">
              카테고리 선택 <span class="text-error-500">*</span>
            </label>
            <select
              v-model="product.categoryId"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">카테고리를 선택하세요</option>
              <template v-for="option in categoryOptions" :key="option.id">
                <option
                  v-if="option.isParent"
                  :value="option.id"
                  disabled
                  class="font-semibold text-neutral-900 bg-neutral-100"
                >
                  {{ option.name }}
                </option>
                <option v-else :value="option.id">
                  {{ option.name }}
                </option>
              </template>
            </select>
            <p class="text-xs text-neutral-500 mt-2">
              선택된 카테고리에 따라 상품이 분류됩니다.
            </p>
          </div>
        </UiCard>
      </div>

      <!-- 가격/할인 -->
      <UiCard>
        <template #header>
          <h3 class="font-semibold text-neutral-900">가격 설정</h3>
        </template>
        <div class="space-y-4 ">
          <div class="flex items-center gap-20">
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">
              판매가 <span class="text-error-500">*</span>
            </label>
            <div class="relative w-full md:w-48">
              <input
                v-model.number="product.price"
                type="number"
                min="0"
                class="w-full px-3 py-2 pr-10 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
              >
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">원</span>
            </div>
            <p class="text-xs text-neutral-500 mt-1">옵션별 추가금액은 옵션 조합에서 설정합니다.</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">
              원가 <span class="text-error-500"></span>
            </label>
            <div class="relative w-full md:w-48">
              <input
                v-model.number="product.costPrice"
                type="number"
                min="0"
                class="w-full px-3 py-2 pr-10 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
              >
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">원</span>
            </div>
            <p class="text-xs text-neutral-500 mt-1">옵션별 추가금액은 옵션 조합에서 설정합니다.</p>
          </div>
          </div>
          <!-- 할인 -->
          <div class="border-t border-neutral-200 pt-4">
            <div class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
              <div>
                <p class="font-medium text-neutral-900 text-sm">할인 적용</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input v-model="product.hasDiscount" type="checkbox" class="sr-only peer">
                <div class="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
              </label>
            </div>

            <div v-if="product.hasDiscount" class="mt-4 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-neutral-700 mb-1">할인 종류</label>
                  <select
                    v-model="product.discountType"
                    class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="RATE">퍼센트 (%)</option>
                    <option value="AMOUNT">금액 (원)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-neutral-700 mb-1">
                    {{ product.discountType === 'RATE' ? '할인율' : '할인금액' }}
                  </label>
                  <div class="relative">
                    <input
                      v-model.number="product.discountValue"
                      type="number"
                      min="0"
                      :max="product.discountType === 'RATE' ? 100 : product.price"
                      class="w-full px-3 py-2 pr-10 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="0"
                    >
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                      {{ product.discountType === 'RATE' ? '%' : '원' }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="p-3 bg-primary-50 rounded-lg flex items-center justify-between">
                <div>
                  <p class="text-xs text-neutral-600">할인가</p>
                  <p class="text-lg font-bold text-primary-600">{{ formatCurrency(discountPrice) }}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-neutral-500 line-through">{{ formatCurrency(product.price) }}</p>
                  <p class="text-sm font-medium text-error-600">-{{ discountRate }}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- 옵션 설정 -->
      <UiCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-neutral-900">옵션 설정</h3>
              <p class="text-sm text-neutral-500 mt-1">컬러, 사이즈 등 옵션을 설정합니다.</p>
            </div>
            <UiButton variant="outline" size="sm" @click="addOptionGroup">
              옵션 추가
            </UiButton>
          </div>
        </template>

        <div v-if="optionGroups.length === 0 && !isVariantsGenerated" class="text-center py-8 space-y-4">
          <p class="text-neutral-500 text-sm">등록된 옵션이 없습니다.</p>

          <!-- 단일 상품 생성 버튼 -->
          <div class="p-4 bg-primary-50 border border-primary-200 rounded-lg max-w-md mx-auto">
            <p class="text-sm font-medium text-primary-900 mb-2">옵션이 없는 단일 상품인가요?</p>
            <p class="text-xs text-primary-600 mb-3">옵션 없이 기본 재고만 관리합니다</p>
            <UiButton variant="primary" size="sm" @click="createSingleVariant">
              단일 상품 생성
            </UiButton>
          </div>
        </div>

        <div v-else-if="optionGroups.length > 0" class="space-y-4">
          <div
            v-for="(group, index) in optionGroups"
            :key="group.id"
            class="p-4 border border-neutral-200 rounded-lg"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-neutral-700">옵션 {{ index + 1 }}</span>
              <button
                type="button"
                class="text-sm text-error-600 hover:text-error-700"
                @click="removeOptionGroup(index)"
              >
                삭제
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div class="flex items-center gap-1 mb-1">
                  <label class="block text-xs font-medium text-neutral-600">
                    옵션명 (대분류)
                  </label>
                  <div class="relative group">
                    <svg class="w-3.5 h-3.5 text-neutral-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-10">
                      옵션명에는 콤마(,)를 사용할 수 없습니다
                      <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-800" />
                    </div>
                  </div>
                </div>
                <input
                  :value="group.name"
                  type="text"
                  :class="[
                    'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2',
                    group.nameError
                      ? 'border-error-500 focus:ring-error-500 focus:border-error-500'
                      : 'border-neutral-300 focus:ring-primary-500 focus:border-primary-500'
                  ]"
                  placeholder="예: 컬러"
                  @input="handleOptionNameInput(group, $event)"
                >
                <p v-if="group.nameError" class="text-xs text-error-500 mt-1">
                  옵션명에는 콤마(,)를 사용할 수 없습니다
                </p>
              </div>

              <div>
                <div class="flex items-center gap-1 mb-1">
                  <label class="block text-xs font-medium text-neutral-600">
                    옵션값 (소분류)
                  </label>
                  <div class="relative group">
                    <svg class="w-3.5 h-3.5 text-neutral-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-10">
                      콤마(,)로 구분하여 여러 값을 입력하세요
                      <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-800" />
                    </div>
                  </div>
                </div>
                <input
                  v-model="group.valuesInput"
                  type="text"
                  class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="예: 블랙, 화이트, 그레이"
                  @input="handleValuesInputChange"
                >
                <p class="text-xs text-neutral-500 mt-1">
                  콤마(,)로 구분하여 입력
                </p>
              </div>
            </div>

            <!-- 입력된 옵션값 미리보기 -->
            <div v-if="parseOptionValues(group.valuesInput).length > 0" class="flex flex-wrap gap-2 mt-3">
              <span
                v-for="(value, valueIndex) in parseOptionValues(group.valuesInput)"
                :key="valueIndex"
                class="inline-flex items-center px-2 py-1 bg-primary-50 text-primary-700 rounded text-sm"
              >
                {{ value }}
              </span>
            </div>
          </div>

          <!-- 조합 생성 버튼 -->
          <div v-if="expectedVariantCount > 0" class="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
            <p class="text-sm text-neutral-600">
              <span class="font-semibold text-neutral-900">{{ expectedVariantCount }}개</span>의 조합이 생성됩니다.
            </p>
            <UiButton variant="primary" size="sm" @click="generateVariants">
              옵션 조합 생성
            </UiButton>
          </div>

          <!-- 단일 상품 버튼 (옵션이 없을 때) -->
          <div v-if="expectedVariantCount === 0 && !isVariantsGenerated" class="flex items-center justify-between p-4 bg-primary-50 rounded-lg border border-primary-200">
            <div>
              <p class="text-sm font-medium text-primary-900">옵션이 없는 단일 상품인가요?</p>
              <p class="text-xs text-primary-600 mt-0.5">옵션 없이 기본 재고만 관리합니다</p>
            </div>
            <UiButton variant="outline" size="sm" @click="createSingleVariant">
              단일 상품 생성
            </UiButton>
          </div>
        </div>
      </UiCard>

      <!-- 옵션 조합 테이블 -->
      <UiCard v-if="isVariantsGenerated && variants.length > 0">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-neutral-900">옵션 조합</h3>
              <p class="text-sm text-neutral-500 mt-1">
                총 {{ variants.length }}개 조합 / 총 재고 {{ totalStock }}개
              </p>
            </div>
            <UiButton variant="outline" size="sm" @click="generateSkuBatch">
              SKU 일괄 생성
            </UiButton>
          </div>
        </template>

        <!-- 재고 0 경고 배너 -->
        <div
          v-if="showStockWarning"
          class="flex items-center gap-3 p-3 mb-4 bg-warning-50 border border-warning-200 rounded-lg"
        >
          <svg class="w-5 h-5 text-warning-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div class="flex-1">
            <p class="text-sm font-medium text-warning-800">총 재고가 0개입니다</p>
            <p class="text-xs text-warning-600 mt-0.5">저장 시 상품이 자동으로 품절 처리됩니다.</p>
          </div>
        </div>

        <!-- 벌크 액션 바 -->
        <div
          v-if="selectedVariantIds.length > 0"
          class="flex items-center gap-3 p-3 mb-4 bg-primary-50 border border-primary-200 rounded-lg"
        >
          <span class="text-sm font-medium text-primary-700">
            {{ selectedVariantIds.length }}개 선택됨
          </span>
          <div class="flex-1" />
          <UiButton variant="ghost" size="sm" @click="handleBulkClearSku">
            SKU 비우기
          </UiButton>
          <UiButton variant="ghost" size="sm" @click="openBulkStockModal">
            재고 일괄수정
          </UiButton>
          <UiButton variant="ghost" size="sm" @click="openBulkPriceModal">
            추가금액 일괄수정
          </UiButton>
          <UiButton variant="ghost" size="sm" @click="selectedVariantIds = []">
            선택 해제
          </UiButton>
        </div>

        <!-- 데스크톱 테이블 -->
        <div class="hidden md:block overflow-x-auto w-full">
          <table class="w-full">
            <thead>
              <tr class="border-b border-neutral-200 bg-neutral-50">
                <th class="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    :checked="isAllVariantsSelected"
                    class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                    @change="handleSelectAllVariants($event.target.checked)"
                  >
                </th>
                <th class="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase">옵션</th>
                <th class="text-left py-3 px-4 text-xs font-medium text-neutral-500 uppercase w-36">SKU *</th>
                <th class="text-center py-3 px-4 text-xs font-medium text-neutral-500 uppercase w-24">재고</th>
                <th class="text-center py-3 px-4 text-xs font-medium text-neutral-500 uppercase w-28">추가금액</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="variant in variants"
                :key="variant.id"
                :class="[
                  'border-b border-neutral-100',
                  isVariantSelected(variant.id) ? 'bg-primary-50' : 'hover:bg-neutral-50'
                ]"
              >
                <td class="py-3 px-4">
                  <input
                    type="checkbox"
                    :checked="isVariantSelected(variant.id)"
                    class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                    @change="handleSelectVariant(variant.id)"
                  >
                </td>
                <td class="py-3 px-4">
                  <span class="text-sm font-medium text-neutral-900">{{ variant.optionLabel }}</span>
                </td>
                <td class="py-3 px-4">
                  <input
                    v-model="variant.sku"
                    type="text"
                    class="w-full px-2 py-1.5 border border-neutral-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="SKU"
                  >
                </td>
                <td class="py-3 px-4">
                  <input
                    v-model.number="variant.stock"
                    type="number"
                    min="0"
                    class="w-full px-2 py-1.5 border border-neutral-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0"
                  >
                </td>
                <td class="py-3 px-4">
                  <div class="relative">
                    <input
                      v-model.number="variant.additionalPrice"
                      type="number"
                      class="w-full px-2 py-1.5 pr-6 border border-neutral-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0"
                    >
                    <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400">원</span>
                  </div>
                </td>
                
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 모바일 카드 -->
        <div class="md:hidden space-y-3">
          <!-- 모바일 전체 선택 -->
          <div class="flex items-center gap-2 p-2 bg-neutral-50 rounded-lg">
            <input
              type="checkbox"
              :checked="isAllVariantsSelected"
              class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              @change="handleSelectAllVariants($event.target.checked)"
            >
            <span class="text-sm text-neutral-600">전체 선택</span>
          </div>

          <div
            v-for="variant in variants"
            :key="variant.id"
            :class="[
              'p-3 border rounded-lg',
              isVariantSelected(variant.id) ? 'border-primary-300 bg-primary-50' : 'border-neutral-200'
            ]"
          >
            <div class="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                :checked="isVariantSelected(variant.id)"
                class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                @change="handleSelectVariant(variant.id)"
              >
              <p class="font-medium text-neutral-900 text-sm">{{ variant.optionLabel }}</p>
            </div>

            <div class="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label class="block text-xs text-neutral-500 mb-1">SKU</label>
                <input
                  v-model="variant.sku"
                  type="text"
                  class="w-full px-2 py-1 border border-neutral-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="SKU"
                >
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">재고</label>
                <input
                  v-model.number="variant.stock"
                  type="number"
                  min="0"
                  class="w-full px-2 py-1 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="0"
                >
              </div>
              <div>
                <label class="block text-xs text-neutral-500 mb-1">추가금액</label>
                <input
                  v-model.number="variant.additionalPrice"
                  type="number"
                  class="w-full px-2 py-1 border border-neutral-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="0"
                >
              </div>
            </div>

            <div>
              <label class="block text-xs text-neutral-500 mb-1">이미지 ({{ variant.images.length }}/5)</label>
              <div class="flex items-center gap-1.5 flex-wrap">
                <div
                  v-for="(img, imgIndex) in variant.images"
                  :key="img.id"
                  class="relative w-10 h-10 bg-neutral-100 rounded overflow-hidden"
                >
                  <img :src="img.preview" class="w-full h-full object-cover">
                  <button
                    type="button"
                    class="absolute top-0 right-0 p-0.5 bg-error-500 text-white rounded-bl"
                    @click="removeVariantImage(variant, imgIndex)"
                  >
                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <label v-if="variant.images.length < 5" class="w-10 h-10 border border-dashed border-neutral-300 rounded flex items-center justify-center cursor-pointer">
                  <svg class="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    class="hidden"
                    @change="(e) => handleVariantImageUpload(e, variant)"
                  >
                </label>
              </div>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- 상세 페이지 -->
      <UiCard>
        <template #header>
          <div>
            <h3 class="font-semibold text-neutral-900">상세 페이지</h3>
            <p class="text-sm text-neutral-500 mt-1">상품 상세 페이지에 표시될 내용을 작성합니다. (권장 이미지 너비: 860px)</p>
          </div>
        </template>
        <UiRichEditor
          v-model="product.detailContent"
          placeholder="상품 상세 내용을 입력하세요..."
          min-height="500px"
        />
      </UiCard>

      <!-- 판매 설정 -->
      <UiCard>
        <template #header>
          <h3 class="font-semibold text-neutral-900">판매 설정</h3>
        </template>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">판매 상태</label>
              <select
                v-model="product.status"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">
                1인당 최대 구매 수량
              </label>
              <div class="relative">
                <input
                  v-model.number="product.maxPurchase"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 pr-10 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="10"
                >
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">개</span>
              </div>
              <p class="text-xs text-neutral-500 mt-1">0 입력 시 제한 없음</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-2">상품 태그</label>
            <div class="flex flex-wrap gap-4">
              <label
                v-for="tag in tags"
                :key="tag.id"
                class="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :checked="isTagSelected(tag.id)"
                  class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                  @change="toggleTag(tag.id)"
                >
                <span class="text-sm text-neutral-700">{{ tag.name }}</span>
              </label>
              <p v-if="tags.length === 0" class="text-sm text-neutral-500">
                등록된 태그가 없습니다.
              </p>
            </div>
          </div>

          <!-- 재고 관리 안내 -->
          <div class="p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <div class="flex gap-3">
              <svg class="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-sm text-primary-800">
                원활한 구매 경험을 위해 주문 생성 시 재고가 즉시 차감됩니다. 관리자가 설정한 입금기한 내 미입금 시 자동 취소 및 재고 복원됩니다.
              </p>
            </div>
          </div>
        </div>
      </UiCard>
    </div>

    <!-- 재고 일괄 수정 모달 -->
    <UiModal
      v-model="showBulkStockModal"
      title="재고 일괄 수정"
      size="sm"
    >
      <p class="text-sm text-neutral-600 mb-4">
        선택한 <span class="font-medium text-neutral-900">{{ selectedVariantIds.length }}개</span> 옵션의 재고를 일괄 수정합니다.
      </p>
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-1">재고 수량</label>
        <div class="relative">
          <input
            v-model.number="bulkStockValue"
            type="number"
            min="0"
            class="w-full px-3 py-2 pr-10 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="0"
          >
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">개</span>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UiButton variant="outline" @click="showBulkStockModal = false">
            취소
          </UiButton>
          <UiButton variant="primary" @click="handleBulkStockUpdate">
            적용
          </UiButton>
        </div>
      </template>
    </UiModal>

    <!-- 추가금액 일괄 수정 모달 -->
    <UiModal
      v-model="showBulkPriceModal"
      title="추가금액 일괄 수정"
      size="sm"
    >
      <p class="text-sm text-neutral-600 mb-4">
        선택한 <span class="font-medium text-neutral-900">{{ selectedVariantIds.length }}개</span> 옵션의 추가금액을 일괄 수정합니다.
      </p>
      <div>
        <label class="block text-sm font-medium text-neutral-700 mb-1">추가금액</label>
        <div class="relative">
          <input
            v-model.number="bulkPriceValue"
            type="number"
            class="w-full px-3 py-2 pr-10 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="0"
          >
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">원</span>
        </div>
        <p class="text-xs text-neutral-500 mt-1">기본 판매가에 추가되는 금액입니다.</p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UiButton variant="outline" @click="showBulkPriceModal = false">
            취소
          </UiButton>
          <UiButton variant="primary" @click="handleBulkPriceUpdate">
            적용
          </UiButton>
        </div>
      </template>
    </UiModal>
  </LayoutFormPage>
</template>
