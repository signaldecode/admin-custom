<script setup>
/**
 * 주문 상세 페이지
 * - 주문 회원 정보
 * - 결제 정보
 * - 배송지 정보
 * - 주문 상품 정보
 * - 주문 이력
 */
import { useUiStore } from '~/stores/ui'
import { useCatalogStore } from '~/stores/catalog'
import { formatCurrency, formatDate } from '~/utils/formatters'

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const uiStore = useUiStore()
const catalogStore = useCatalogStore()

const orderId = computed(() => route.params.id)

// 로딩 상태
const isLoading = ref(true)
const error = ref(null)
const isChangingStatus = ref(false)
const isRefreshingDelivery = ref(false)

// 주문 정보
const order = ref(null)

// 택배사 목록 (스토어에서 가져옴)
const carriers = computed(() => catalogStore.carriers)

// 주문 상태 매핑
const statusMap = {
  PENDING: { label: '입금대기', variant: 'neutral' },
  PAID: { label: '결제완료', variant: 'primary' },
  PREPARING: { label: '상품준비중', variant: 'warning' },
  SHIPPING: { label: '배송중', variant: 'info' },
  DELIVERED: { label: '배송완료', variant: 'success' },
  CONFIRMED: { label: '구매확정', variant: 'success' },
  CANCELLED: { label: '주문취소', variant: 'neutral' },
  REFUNDED: { label: '환불완료', variant: 'neutral' },
  // 반품
  RETURN_REQUESTED: { label: '반품요청', variant: 'warning' },
  RETURN_IN_PROGRESS: { label: '반품진행중', variant: 'warning' },
  RETURN_COMPLETED: { label: '반품완료', variant: 'neutral' },
  PARTIAL_RETURN_IN_PROGRESS: { label: '부분반품진행중', variant: 'warning' },
  PARTIAL_RETURN_COMPLETED: { label: '부분반품완료', variant: 'neutral' },
  // 교환
  EXCHANGE_REQUESTED: { label: '교환요청', variant: 'warning' },
  EXCHANGE_IN_PROGRESS: { label: '교환진행중', variant: 'warning' },
  EXCHANGE_COMPLETED: { label: '교환완료', variant: 'neutral' },
  PARTIAL_EXCHANGE_IN_PROGRESS: { label: '부분교환진행중', variant: 'warning' },
  PARTIAL_EXCHANGE_COMPLETED: { label: '부분교환완료', variant: 'neutral' },
}

// 결제 수단 매핑
const paymentMethodMap = {
  CARD: '신용카드',
  BANK_TRANSFER: '계좌이체',
  VIRTUAL_ACCOUNT: '가상계좌',
  PHONE: '휴대폰',
  KAKAO_PAY: '카카오페이',
  NAVER_PAY: '네이버페이',
  POINT: '포인트',
}

// 결제 상태 매핑
const paymentStatusMap = {
  PENDING: { label: '결제대기', variant: 'warning' },
  PAID: { label: '결제완료', variant: 'success' },
  FAILED: { label: '결제실패', variant: 'error' },
  CANCELLED: { label: '취소', variant: 'neutral' },
  REFUNDED: { label: '환불완료', variant: 'neutral' },
  PARTIAL_REFUNDED: { label: '부분환불완료', variant: 'warning' },
}

// 주문 상태 옵션 (직접 변경 가능한 상태만)
const allStatusOptions = [
  { value: 'PENDING', label: '입금대기' },
  { value: 'PAID', label: '결제완료' },
  { value: 'PREPARING', label: '상품준비중' },
  { value: 'SHIPPING', label: '배송중' },
  { value: 'DELIVERED', label: '배송완료' },
  { value: 'CANCELLED', label: '주문취소' },
]

// 상태별 허용 전이 규칙
// - 배송 전 (PENDING, PAID, PREPARING): 직접 상태 변경 + 취소 가능
// - 배송중 전환: "발송 등록" 모달을 통해서만 가능 (shipments API)
// - 배송 중 (SHIPPING): 배송완료로만 변경 가능
// - 배송 후 (DELIVERED, CONFIRMED): 직접 변경 불가 → 클레임 생성 필요
// - 주문 취소: PAID 상태에서만 가능 (PREPARING부터는 반품으로 처리)
const allowedTransitions = {
  PENDING: ['PAID', 'CANCELLED'],           // 입금대기 → 결제완료, 취소
  PAID: ['PREPARING', 'CANCELLED'],         // 결제완료 → 상품준비중, 취소
  PREPARING: [],                            // 상품준비중 → 배송중은 발송 등록으로, 취소는 반품으로
  SHIPPING: ['DELIVERED'],                  // 배송중 → 배송완료만 가능
  DELIVERED: [],                            // 배송완료 → 클레임으로만 처리
  CONFIRMED: [],                            // 구매확정 → 클레임으로만 처리
  CANCELLED: [],                            // 취소 → 변경 불가
  REFUNDED: [],                             // 환불 → 변경 불가
}

// 클레임 생성 가능한 주문 상태인지
const isClaimableOrderStatus = computed(() => {
  const status = order.value?.status
  return [
    'DELIVERED',
    'CONFIRMED',
    'REFUNDED',
    'PARTIAL_RETURN_IN_PROGRESS',
    'PARTIAL_RETURN_COMPLETED',
    'PARTIAL_EXCHANGE_IN_PROGRESS',
    'PARTIAL_EXCHANGE_COMPLETED',
  ].includes(status)
})

// 클레임 생성 불가능한 상품 상태
const claimedItemStatusList = [
  'RETURN_REQUESTED',
  'RETURN_IN_PROGRESS',
  'RETURN_COMPLETED',
  'EXCHANGE_REQUESTED',
  'EXCHANGE_IN_PROGRESS',
  'EXCHANGE_COMPLETED',
  'REFUNDED',
  'CANCELLED',
]

// 클레임 생성 가능한 상품이 있는지 (남은 수량 기반)
const hasClaimableItems = computed(() => {
  const items = order.value?.items || []
  // 클레임 정보가 로드되면 남은 수량으로 확인, 아니면 상태로 확인
  if (orderClaims.value.length > 0) {
    return items.some((item) => getRemainingQuantity(item) > 0)
  }
  return items.some((item) => !claimedItemStatusList.includes(item.orderItemStatus))
})

// 클레임 생성 버튼 표시 여부 (주문 상태 + 클레임 가능 상품 존재)
const isPostDelivery = computed(() => {
  return isClaimableOrderStatus.value && hasClaimableItems.value
})

// 현재 상태에서 변경 가능한 상태 옵션
const statusOptions = computed(() => {
  const currentStatus = order.value?.status
  if (!currentStatus) return []

  const allowed = allowedTransitions[currentStatus] || []
  return allStatusOptions.filter(opt => allowed.includes(opt.value))
})

// 데이터 로드
const fetchOrder = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await $api.get(`/admin/orders/${orderId.value}`)
    order.value = response.data
  } catch (err) {
    console.error('Order fetch error:', err)
    error.value = err.data?.error?.message || err.data?.message || err.message || '주문 정보를 불러오는데 실패했습니다.'
  } finally {
    isLoading.value = false
  }
}


// 주문 회원 정보 아이템
const userInfoItems = computed(() => {
  if (!order.value?.customer) return []
  const c = order.value.customer
  return [
    { key: 'userId', label: '유저ID', value: c.userId },
    { key: 'name', label: '이름', value: c.name },
    { key: 'phone', label: '연락처', value: c.phone || '-' },
    { key: 'email', label: '이메일', value: c.email || '-' },
  ]
})

// 결제 정보 아이템
const paymentInfoItems = computed(() => {
  if (!order.value?.payment) return []
  const p = order.value.payment
  const items = [
    { key: 'method', label: '결제수단', value: paymentMethodMap[p.method] || p.method },
  ]

  if (p.cardCompany) {
    items.push({ key: 'card', label: '카드정보', value: `${p.cardCompany} (${p.cardNumber || ''})` })
  }

  if (p.installment !== undefined && p.installment !== null) {
    items.push({ key: 'installment', label: '할부', value: p.installment === 0 ? '일시불' : `${p.installment}개월` })
  }

  items.push(
    { key: 'status', label: '결제상태', value: p.status },
    { key: 'paidAt', label: '결제일시', value: formatDate(p.paidAt) },
    { key: 'transactionId', label: '거래번호', value: p.transactionId || '-' }
  )

  return items
})

// 배송 상태 매핑 (shipment status)
const shipmentStatusMap = {
  PENDING: { label: '배송 대기', variant: 'neutral' },
  IN_TRANSIT: { label: '배송중', variant: 'info' },
  DELIVERED: { label: '배송완료', variant: 'success' },
  FAILED: { label: '배송실패', variant: 'error' },
}

// 배송 목록 (shipments 배열만 - 실제 발송된 건)
const shipments = computed(() => {
  // shipments 배열이 있고 내용이 있으면 그것만 사용
  if (order.value?.shipments?.length) {
    return order.value.shipments
  }
  return []
})

// 선택된 배송 탭 (여러 배송 시)
const selectedShipmentIndex = ref(0)
const selectedShipment = computed(() => shipments.value[selectedShipmentIndex.value] || null)

// 배송 정보 아이템 (선택된 배송 기준)
const shippingInfoItems = computed(() => {
  const s = selectedShipment.value
  if (!s) return []

  const items = []

  // 배송 번호 (shipmentNumber)
  if (s.shipmentNumber) {
    items.push({ key: 'shipmentNumber', label: '배송번호', value: s.shipmentNumber })
  }

  // 배송 상태
  if (s.status) {
    items.push({ key: 'shipmentStatus', label: '배송 상태', value: s.status })
  }

  // 택배사 (carrierName 또는 carrierCode)
  if (s.carrierName || s.carrierCode) {
    items.push({ key: 'carrier', label: '택배사', value: s.carrierName || s.carrierCode })
  }

  // 운송장
  if (s.trackingNumber) {
    items.push({
      key: 'tracking',
      label: '운송장',
      value: s.trackingNumber,
      url: s.trackingUrl || null,
    })
  }

  // 발송일
  if (s.shippedAt) {
    items.push({ key: 'shippedAt', label: '발송일', value: formatDate(s.shippedAt, 'long') })
  }

  // 배송완료일
  if (s.deliveredAt) {
    items.push({ key: 'deliveredAt', label: '배송완료일', value: formatDate(s.deliveredAt, 'long') })
  }

  return items
})

// 배송지 정보 (주문의 shipping 정보)
const shippingAddressItems = computed(() => {
  const s = order.value?.shipping
  if (!s) return []

  const items = [
    { key: 'recipientName', label: '수령인', value: s.recipientName },
    { key: 'recipientPhone', label: '연락처', value: s.recipientPhone },
    { key: 'postalCode', label: '우편번호', value: s.postalCode },
    { key: 'address', label: '주소', value: s.address },
  ]

  if (s.deliveryMessage) {
    items.push({ key: 'memo', label: '배송메모', value: s.deliveryMessage })
  }

  return items
})

// ── 분할배송 (발송 등록) ──
const showShipmentModal = ref(false)
const isCreatingShipment = ref(false)
const shipmentCarrierId = ref('')
const shipmentTrackingNumber = ref('')
const shipmentItems = ref([]) // [{orderItemId, productName, variantName, imageUrl, totalQty, shippedQty, shipQty, selected}]

// 상품별 이미 발송된 수량 계산
const getShippedQuantity = (orderItemId) => {
  let shipped = 0
  for (const shipment of shipments.value) {
    const item = shipment.items?.find((i) => i.orderItemId === orderItemId)
    if (item) {
      shipped += item.quantity
    }
  }
  return shipped
}

// 미발송 상품이 있는지 확인
const hasUnshippedItems = computed(() => {
  if (!order.value?.items?.length) return false
  return order.value.items.some((item) => {
    const shippedQty = getShippedQuantity(item.orderItemId)
    return shippedQty < item.quantity
  })
})

// 주문 상품 상태 매핑 (orderItemStatus - 백엔드 제공)
const orderItemStatusMap = {
  PENDING: { label: '대기', variant: 'neutral' },
  CONFIRMED: { label: '확정', variant: 'primary' },
  SHIPPING: { label: '배송중', variant: 'info' },
  DELIVERED: { label: '배송완료', variant: 'success' },
  CANCELLED: { label: '취소', variant: 'neutral' },
  REFUNDED: { label: '환불', variant: 'neutral' },
  // 반품
  RETURN_REQUESTED: { label: '반품신청', variant: 'warning' },
  RETURN_IN_PROGRESS: { label: '반품진행중', variant: 'warning' },
  RETURN_COMPLETED: { label: '반품완료', variant: 'neutral' },
  // 교환
  EXCHANGE_REQUESTED: { label: '교환신청', variant: 'warning' },
  EXCHANGE_IN_PROGRESS: { label: '교환진행중', variant: 'warning' },
  EXCHANGE_COMPLETED: { label: '교환완료', variant: 'neutral' },
}

// orderItemId로 주문 상품 정보 찾기 (배송 상품 목록용)
const getOrderItemById = (orderItemId) => {
  return order.value?.items?.find((item) => item.orderItemId === orderItemId)
}

// 발송 가능한 상태인지 확인 (상품준비중, 배송중일 때만 - 백엔드 스펙)
const canCreateShipment = computed(() => {
  const status = order.value?.status
  return ['PREPARING', 'SHIPPING'].includes(status) && hasUnshippedItems.value
})

// 발송 모달 열기
const openShipmentModal = () => {
  // 주문 상품을 기반으로 발송 아이템 초기화
  shipmentItems.value = (order.value?.items || []).map((item) => {
    const shippedQty = getShippedQuantity(item.orderItemId)
    const remainingQty = item.quantity - shippedQty
    return {
      orderItemId: item.orderItemId,
      productName: item.productName,
      variantName: item.variantName,
      imageUrl: item.imageUrl,
      totalQty: item.quantity,
      shippedQty,
      remainingQty,
      shipQty: remainingQty > 0 ? remainingQty : 0, // 기본값: 남은 수량 전체
      selected: remainingQty > 0, // 미발송 상품만 선택
    }
  })
  shipmentCarrierId.value = ''
  shipmentTrackingNumber.value = ''
  showShipmentModal.value = true
}

// 발송 상품 선택 토글
const toggleShipmentItem = (item) => {
  if (item.remainingQty <= 0) return // 이미 전량 발송된 상품은 선택 불가
  item.selected = !item.selected
  if (!item.selected) {
    item.shipQty = 0
  } else {
    item.shipQty = item.remainingQty
  }
}

// 발송 수량 변경
const updateShipmentQty = (item, qty) => {
  const newQty = Math.max(0, Math.min(qty, item.remainingQty))
  item.shipQty = newQty
  item.selected = newQty > 0
}

// 선택된 발송 상품
const selectedShipmentItems = computed(() => {
  return shipmentItems.value.filter((item) => item.selected && item.shipQty > 0)
})

// 발송 가능 여부
const canSubmitShipment = computed(() => {
  return (
    shipmentCarrierId.value &&
    shipmentTrackingNumber.value.trim() &&
    selectedShipmentItems.value.length > 0
  )
})

// 발송 등록 실행
const createShipment = async () => {
  if (!canSubmitShipment.value) return

  isCreatingShipment.value = true
  try {
    const payload = {
      carrierId: Number(shipmentCarrierId.value),
      trackingNumber: shipmentTrackingNumber.value.trim(),
      items: selectedShipmentItems.value.map((item) => ({
        orderItemId: item.orderItemId,
        quantity: item.shipQty,
      })),
    }

    await $api.post(`/admin/delivery/orders/${orderId.value}/shipments`, payload)

    uiStore.showToast({
      type: 'success',
      message: `${selectedShipmentItems.value.length}건의 상품이 발송 등록되었습니다.`,
    })

    showShipmentModal.value = false
    await fetchOrder() // 주문 정보 새로고침
  } catch (err) {
    console.error('Shipment creation error:', err)
    uiStore.showToast({
      type: 'error',
      message: err.data?.message || err.message || '발송 등록에 실패했습니다.',
    })
  } finally {
    isCreatingShipment.value = false
  }
}

// 진입 경로 판별
const fromClaims = computed(() => route.query.from === 'claims')

// 클레임 정보
const claimTypeMap = {
  CANCEL: { label: '취소', variant: 'neutral' },
  EXCHANGE: { label: '교환', variant: 'warning' },
  RETURN: { label: '반품', variant: 'error' },
}
const claimStatusMap = {
  REQUESTED: { label: '요청', variant: 'warning' },
  APPROVED: { label: '승인', variant: 'info' },
  IN_PROGRESS: { label: '진행중', variant: 'info' },
  ON_HOLD: { label: '보류', variant: 'warning' },
  COMPLETED: { label: '완료', variant: 'success' },
  REJECTED: { label: '거절', variant: 'error' },
}
const reasonTypeMap = {
  CHANGE_OF_MIND: '단순 변심',
  DEFECTIVE: '상품 불량/파손',
  WRONG_DELIVERY: '오배송',
  WRONG_OPTION: '옵션 오선택',
  DELAYED_DELIVERY: '배송 지연',
  INCOMPATIBILITY: '호환성 문제',
  OUT_OF_STOCK: '품절',
  PRICE_ERROR: '가격 오류',
  CUSTOMER_REQUEST: '고객 요청',
  OTHER: '기타',
}
// ── 클레임 관련 (통합) ──
// 주문에 연결된 모든 클레임
const orderClaims = ref([])
const isClaimLoading = ref(false)

// 선택된 클레임 ID (query param 또는 사용자 선택)
const selectedClaimId = ref(route.query.claimId || null)

// 선택된 클레임 (computed)
const selectedClaim = computed(() => {
  if (!orderClaims.value.length) return null
  if (selectedClaimId.value) {
    return orderClaims.value.find((c) => String(c.claimId) === String(selectedClaimId.value)) || orderClaims.value[0]
  }
  // 선택된 것이 없으면 첫 번째 클레임 (클레임이 있는 경우)
  return orderClaims.value[0]
})

// 클레임이 있는지 여부
const hasClaims = computed(() => orderClaims.value.length > 0)

// 클레임 목록 조회 (통합)
const fetchClaims = async () => {
  if (!orderId.value) return
  isClaimLoading.value = true
  try {
    const response = await $api.get(`/admin/claims/orders/${orderId.value}`)
    const data = response.data?.data || response.data
    orderClaims.value = Array.isArray(data) ? data : data ? [data] : []

    // query param에서 claimId가 있으면 선택
    if (route.query.claimId) {
      selectedClaimId.value = route.query.claimId
    }
  } catch (err) {
    console.error('Claims fetch error:', err)
    orderClaims.value = []
  } finally {
    isClaimLoading.value = false
  }
}

// 클레임 선택
const selectClaim = (claimId) => {
  selectedClaimId.value = claimId
}

// 하위호환: claimDetail -> selectedClaim alias
const claimDetail = selectedClaim

// 클레임 정보 표시용 computed
const claimInfoItems = computed(() => {
  const detail = claimDetail.value
  if (!detail) return []

  // 클레임 유형에 따른 상품 라벨
  const itemsLabel = {
    CANCEL: '취소 상품',
    EXCHANGE: '교환 상품',
    RETURN: '반품 상품',
  }[detail.claimType] || '대상 상품'

  const items = [
    { key: 'claimType', label: '유형', value: detail.claimType },
    { key: 'claimStatus', label: '상태', value: detail.status },
    { key: 'claimItems', label: itemsLabel, value: detail.items || [] },
    { key: 'reasonType', label: '사유 유형', value: reasonTypeMap[detail.reasonType] || detail.reasonType || '-' },
    { key: 'reason', label: '상세 사유', value: detail.reason || '-' },
    { key: 'requestedAt', label: '접수 일시', value: formatDate(detail.requestedAt, 'long') },
  ]

  // 회수 배송 정보
  if (detail.returnTrackingNumber) {
    items.push({
      key: 'returnShipping',
      label: '반송 정보',
      value: `${detail.returnTrackingNumber}`,
      url: detail.returnTrackingUrl || null,
    })
  }

  // 교환 재발송 정보 (REJECTED일 때는 "재배송", 그 외는 "교환 배송")
  if (detail.exchangeTrackingNumber) {
    items.push({
      key: 'exchangeShipping',
      label: detail.status === 'REJECTED' ? '재배송' : '교환 배송',
      value: `${detail.exchangeTrackingNumber}`,
      url: detail.exchangeTrackingUrl || null,
    })
  }

  if (detail.adminNote) {
    items.push({ key: 'adminNote', label: '관리자 메모', value: detail.adminNote })
  }

  if (detail.rejectReason) {
    items.push({ key: 'rejectReason', label: '거절 사유', value: detail.rejectReason })
  }

  // 환불 금액 (취소/반품)
  if (detail.refundAmount != null && detail.claimType !== 'EXCHANGE') {
    items.push({ key: 'refundAmount', label: '환불 예정 금액', value: formatCurrency(detail.refundAmount) })
  }

  // 실제 환불 금액 (환불 완료 시)
  if (detail.actualRefundAmount != null) {
    items.push({ key: 'actualRefundAmount', label: '환불 완료 금액', value: formatCurrency(detail.actualRefundAmount) })
  }

  return items
})

// 완료된 클레임 상태 (취소선 + 흐리게)
const completedClaimStatuses = ['REFUNDED', 'CANCELLED', 'RETURN_COMPLETED', 'EXCHANGE_COMPLETED']

// 진행 중 클레임 상태 (노란색 강조)
const inProgressClaimStatuses = ['RETURN_REQUESTED', 'RETURN_IN_PROGRESS', 'EXCHANGE_REQUESTED', 'EXCHANGE_IN_PROGRESS']

// 완료된 클레임 아이템인지 (취소선 + 흐리게 표시)
const isCompletedClaimItem = (item) => {
  return completedClaimStatuses.includes(item.orderItemStatus)
}

// 진행 중 클레임 아이템인지 (노란색 강조)
const isInProgressClaimItem = (item) => {
  return inProgressClaimStatuses.includes(item.orderItemStatus)
}

// 클레임 대상 상품인지 확인 (선택된 클레임 기준)
const isClaimedItem = (item) => {
  if (!selectedClaim.value?.items?.length) return false
  return claimDetail.value.items.some(
    (ci) => ci.productName === item.productName && (!ci.variantName || ci.variantName === item.variantName)
  )
}

// 취소선 표시 여부 (orderItemStatus 기반)
const isStrikethroughItem = (item) => {
  return isCompletedClaimItem(item)
}

// 아이템별 클레임된 수량 계산 (모든 클레임에서)
const getClaimedQuantity = (orderItemId) => {
  let claimed = 0
  for (const claim of orderClaims.value) {
    // 완료되지 않은 클레임도 포함 (REJECTED 제외)
    if (claim.status === 'REJECTED') continue
    for (const item of claim.items || []) {
      if (item.orderItemId === orderItemId) {
        claimed += item.quantity
      }
    }
  }
  return claimed
}

// 아이템별 남은 클레임 가능 수량
const getRemainingQuantity = (item) => {
  const claimed = getClaimedQuantity(item.orderItemId || item.id)
  return Math.max(0, item.quantity - claimed)
}

// 아이템별 클레임 정보 (표시용)
const getClaimInfo = (orderItemId) => {
  const claimInfoList = []
  for (const claim of orderClaims.value) {
    if (claim.status === 'REJECTED') continue
    for (const item of claim.items || []) {
      if (item.orderItemId === orderItemId) {
        const typeLabel = { CANCEL: '취소', RETURN: '반품', EXCHANGE: '교환' }[claim.claimType] || claim.claimType
        const statusLabel = {
          REQUESTED: '신청',
          APPROVED: '승인',
          IN_PROGRESS: '진행중',
          COMPLETED: '완료',
        }[claim.status] || claim.status
        claimInfoList.push({
          quantity: item.quantity,
          type: claim.claimType,
          status: claim.status,
          label: `${item.quantity}개 ${typeLabel}${statusLabel}`,
        })
      }
    }
  }
  return claimInfoList
}

// 클레임 유형에 따른 상품 목록 타이틀
const itemsTitle = computed(() => {
  if (!selectedClaim.value) return '주문 상품'
  const typeMap = { CANCEL: '취소 상품', EXCHANGE: '교환 상품', RETURN: '반품 상품' }
  return typeMap[selectedClaim.value.claimType] || '주문 상품'
})

// 총 환불 금액 (모든 완료된 클레임)
const totalRefundedAmount = computed(() => {
  let total = 0
  for (const claim of orderClaims.value) {
    if (claim.actualRefundAmount != null) {
      total += claim.actualRefundAmount
    }
  }
  return total
})

// 실제 결제 금액 (총 주문 금액 - 환불 금액)
const actualPaidAmount = computed(() => {
  const grandTotal = order.value?.summary?.grandTotal || 0
  return grandTotal - totalRefundedAmount.value
})

// 목록으로 돌아가기
const goBack = () => {
  router.push(fromClaims.value ? '/admin/orders/claims' : '/admin/orders')
}

// 회원 상세로 이동
const goToUser = (userId) => {
  router.push(`/admin/users/${userId}`)
}

// 상태 변경 모달
const showStatusModal = ref(false)
const selectedStatus = ref('')
const statusReason = ref('')
const showConfirmStep = ref(false) // 확인 단계 표시 여부

// 배송 전 취소 선택 여부
const isCancelSelected = computed(() => selectedStatus.value === 'CANCELLED')
const cancelReason = ref('')
const cancelReasonType = ref('')
const cancelRestoreStock = ref(true)

// 취소 사유 유형 옵션
const cancelReasonOptions = [
  { value: 'CHANGE_OF_MIND', label: '단순 변심' },
  { value: 'DEFECTIVE', label: '상품 불량' },
  { value: 'WRONG_DELIVERY', label: '오배송' },
  { value: 'DELAYED_DELIVERY', label: '배송 지연' },
  { value: 'OUT_OF_STOCK', label: '품절' },
  { value: 'OTHER', label: '기타' },
]

const canChangeStatus = computed(() => {
  if (!selectedStatus.value || selectedStatus.value === order.value?.status) return false
  if (isCancelSelected.value && (!cancelReason.value.trim() || !cancelReasonType.value)) return false
  return true
})

// 상태 변경 가능 여부
const canOpenStatusModal = computed(() => {
  return statusOptions.value.length > 0
})

// 상태 변경 불가 사유 메시지
const getStatusChangeBlockedMessage = () => {
  const currentStatus = order.value?.status
  if (currentStatus === 'DELIVERED' || currentStatus === 'CONFIRMED') {
    return '배송완료 후에는 직접 상태 변경이 불가합니다.\n반품/교환/환불은 클레임을 생성해주세요.'
  }
  if (currentStatus === 'CANCELLED') {
    return '취소된 주문은 상태를 변경할 수 없습니다.'
  }
  if (currentStatus === 'REFUNDED') {
    return '환불된 주문은 상태를 변경할 수 없습니다.'
  }
  return '현재 상태에서는 변경할 수 있는 상태가 없습니다.'
}

const openStatusModal = () => {
  // 변경 가능한 상태가 없으면 안내 모달 표시
  if (!canOpenStatusModal.value) {
    showStatusModal.value = true
    return
  }

  // 첫 번째 옵션을 기본 선택
  selectedStatus.value = statusOptions.value[0]?.value || ''
  statusReason.value = ''
  cancelReason.value = ''
  cancelReasonType.value = ''
  cancelRestoreStock.value = true
  showConfirmStep.value = false // 확인 단계 초기화

  showStatusModal.value = true
}

// 되돌릴 수 없는 상태 변경인지 확인
const isIrreversibleChange = computed(() => {
  // 상품준비중, 배송완료, 취소로 변경하는 경우 되돌릴 수 없음
  return ['PREPARING', 'DELIVERED', 'CANCELLED'].includes(selectedStatus.value)
})

// 변경 버튼 클릭 시
const handleChangeClick = () => {
  if (!canChangeStatus.value) return

  // 되돌릴 수 없는 변경인 경우 확인 단계 표시
  if (isIrreversibleChange.value) {
    showConfirmStep.value = true
    return
  }

  // 되돌릴 수 있는 변경은 바로 실행
  executeStatusChange()
}

// 확인 단계에서 뒤로 가기
const goBackFromConfirm = () => {
  showConfirmStep.value = false
}

// 실제 상태 변경 실행
const executeStatusChange = async () => {
  isChangingStatus.value = true

  try {
    // 주문 취소 + 즉시 환불 (단독 환불 API)
    if (isCancelSelected.value) {
      await $api.post('/admin/refunds', {
        orderId: Number(orderId.value),
        claimType: 'CANCEL',
        reasonType: cancelReasonType.value,
        reason: cancelReason.value,
        restoreStock: cancelRestoreStock.value,
        claimItems: (order.value?.items || []).map((item) => ({
          orderItemId: item.orderItemId,
          quantity: item.quantity,
        })),
      })

      showStatusModal.value = false
      uiStore.showToast({
        type: 'success',
        message: '주문이 취소되고 환불 처리되었습니다.',
      })

      // 주문 정보 새로고침
      await fetchOrder()
    } else {
      // 일반 상태 변경
      const payload = {
        orderIds: [Number(orderId.value)],
        status: selectedStatus.value,
        reason: statusReason.value || undefined,
      }

      await $api.patch('/admin/orders/statuses', payload)

      showStatusModal.value = false
      uiStore.showToast({
        type: 'success',
        message: '주문 상태가 변경되었습니다.',
      })

      // 주문 정보 새로고침
      await fetchOrder()
    }
  } catch (err) {
    console.error('Status change error:', err)
    uiStore.showToast({
      type: 'error',
      message: err.data?.error?.message || err.data?.message || err.message || '상태 변경에 실패했습니다.',
    })
  } finally {
    isChangingStatus.value = false
  }
}

// 배송 정보 갱신 (배송중인 shipment만 개별 호출)
const refreshDelivery = async () => {
  // 배송중인 shipment만 필터링
  const inTransitShipments = shipments.value.filter((s) => s.status === 'IN_TRANSIT')
  if (inTransitShipments.length === 0) {
    uiStore.showToast({
      type: 'info',
      message: '갱신할 배송중인 건이 없습니다.',
    })
    return
  }

  isRefreshingDelivery.value = true

  try {
    // 배송중인 shipment들을 병렬로 갱신
    await Promise.all(
      inTransitShipments.map((s) =>
        $api.post(`/admin/delivery/track/shipment/${s.shipmentId}/refresh`)
      )
    )

    // 주문 정보 새로고침
    await fetchOrder()

    // 하나라도 배송완료이고 주문 상태가 SHIPPING이면 자동으로 배송완료 처리
    const hasDelivered = shipments.value.some((s) => s.status === 'DELIVERED')
    if (hasDelivered && order.value?.status === 'SHIPPING') {
      await $api.patch('/admin/orders/statuses', {
        orderIds: [Number(orderId.value)],
        status: 'DELIVERED',
      })
      await fetchOrder()
      uiStore.showToast({
        type: 'success',
        message: '배송 완료 건이 확인되어 주문 상태가 배송완료로 변경되었습니다.',
      })
    } else {
      uiStore.showToast({
        type: 'success',
        message: `${inTransitShipments.length}건의 배송 정보가 갱신되었습니다.`,
      })
    }
  } catch (err) {
    console.error('Delivery refresh error:', err)
    uiStore.showToast({
      type: 'error',
      message: err.data?.error?.message || err.data?.message || err.message || '배송 정보 갱신에 실패했습니다.',
    })
  } finally {
    isRefreshingDelivery.value = false
  }
}

// 배송 정보 갱신 버튼 표시 여부 (배송중인 shipment가 있을 때만)
const canRefreshDelivery = computed(() => {
  return shipments.value.some((s) => s.status === 'IN_TRANSIT')
})

// 배송중인 shipment 개수
const inTransitShipmentCount = computed(() => {
  return shipments.value.filter((s) => s.status === 'IN_TRANSIT').length
})

// ── 클레임 상태 변경 ──
const showClaimModal = ref(false)
const claimAction = ref('') // 'approve' | 'reject' | 'return-shipping' | 'receive-inspect' | 'exchange-complete' | 'refund'
const claimAdminNote = ref('')
const claimRejectReason = ref('')
const claimShippingCompany = ref('')
const claimTrackingNumber = ref('')
const claimReshipCarrier = ref('')
const claimReshipTrackingNumber = ref('')
const claimReturnShippingCarrier = ref('')
const claimReturnTrackingNumber = ref('')
const claimRefundReason = ref('')
const deductReturnFee = ref(null) // null: 자동, true: 차감, false: 면제
const deductOriginalFee = ref(null) // null: 자동, true: 차감, false: 면제
const claimInspectResult = ref('ACCEPT') // 'ACCEPT' | 'REJECT'
const claimRestoreStock = ref(true) // true: 재고 복구, false: 복구 안 함
const claimInspectRejectReason = ref('')
const isClaimProcessing = ref(false)

// ── 교환 발송 상품 (읽기 전용 - 고객 요청 기반) ──
const exchangeItems = ref([])

// 교환 아이템 초기화 (고객 요청 상품 기반)
const initExchangeItems = () => {
  const items = claimDetail.value?.items || []
  exchangeItems.value = items.map((item) => {
    // 고객이 교환 요청한 상품이 있는 경우
    if (item.exchangeVariantId) {
      const isSame = item.productId === item.exchangeProductId ||
                     item.productName === item.exchangeProductName
      return {
        originalItem: item,
        productId: item.exchangeProductId || item.productId,
        productName: item.exchangeProductName || item.productName,
        variantId: item.exchangeVariantId,
        variantName: item.exchangeVariantName,
        imageUrl: item.exchangeImageUrl || item.imageUrl,
        quantity: item.quantity,
        isSameProduct: isSame,
      }
    }
    // 교환 요청 상품이 없으면 동일 상품으로 초기화
    return {
      originalItem: item,
      productId: item.productId,
      productName: item.productName,
      variantId: item.variantId,
      variantName: item.variantName,
      imageUrl: item.imageUrl,
      quantity: item.quantity,
      isSameProduct: true,
    }
  })
}

// 교환 아이템 유효성 검사
const exchangeItemsValid = computed(() => {
  return exchangeItems.value.length > 0 &&
    exchangeItems.value.every((item) => item.productId && item.quantity > 0)
})

// 클레임 모달에서 가능한 액션 (claimDetail 기반)
const claimAvailableActions = computed(() => {
  const detail = claimDetail.value
  if (!detail) return []
  // 대소문자 정규화
  const status = (detail.status || '').toUpperCase()
  const type = (detail.claimType || '').toUpperCase()

  // ── 취소 ──
  if (type === 'CANCEL') {
    if (status === 'REQUESTED') {
      return [
        { value: 'approve', label: '취소 승인', variant: 'success', description: '취소를 승인합니다. 재고가 복구됩니다.' },
        { value: 'reject', label: '취소 거절', variant: 'error', description: '취소 요청을 거절합니다.' },
      ]
    }
    if (status === 'APPROVED') {
      return [
        { value: 'refund', label: '환불 처리', variant: 'error', description: '환불을 진행합니다.' },
      ]
    }
    return []
  }

  // ── 교환/반품 ──
  const hasReturnShipping = detail?.returnShippingCarrier && detail?.returnTrackingNumber

  // REQUESTED: 반송장 미등록 시에만 반송장 등록 + 승인/거절
  if (status === 'REQUESTED' && type === 'EXCHANGE') {
    const actions = []
    if (!hasReturnShipping) {
      actions.push({ value: 'return-shipping', label: '반송장 등록', variant: 'info', description: '고객이 반송할 택배사와 송장번호를 등록합니다.' })
    }
    actions.push(
      { value: 'approve', label: '교환 승인', variant: 'success', description: '승인 후 입고 검수를 진행합니다.' },
      { value: 'reject', label: '교환 거절', variant: 'error', description: '교환 요청을 거절합니다.' },
    )
    return actions
  }
  if (status === 'REQUESTED' && type === 'RETURN') {
    const actions = []
    if (!hasReturnShipping) {
      actions.push({ value: 'return-shipping', label: '반송장 등록', variant: 'info', description: '고객이 반송할 택배사와 송장번호를 등록합니다.' })
    }
    actions.push(
      { value: 'approve', label: '반품 승인', variant: 'success', description: '승인 후 입고 검수를 진행합니다.' },
      { value: 'reject', label: '반품 거절', variant: 'error', description: '반품 요청을 거절합니다.' },
    )
    return actions
  }
  // APPROVED: 입고 검수 + 반송장 미등록 시에만 반송장 등록
  if (status === 'APPROVED' && (type === 'EXCHANGE' || type === 'RETURN')) {
    const actions = []
    if (!hasReturnShipping) {
      actions.push({ value: 'return-shipping', label: '반송장 등록', variant: 'info', description: '고객이 반송할 택배사와 송장번호를 등록합니다.' })
    }
    actions.push({ value: 'receive-inspect', label: '입고 검수', variant: 'primary', description: '반송 상품을 검수하고 승인 또는 거절합니다.' })
    return actions
  }
  // IN_PROGRESS: 교환 → 교환완료 or 환불 / 반품 → 환불
  if (status === 'IN_PROGRESS' && type === 'EXCHANGE') {
    return [
      { value: 'exchange-complete', label: '교환 완료 (송장 입력)', variant: 'primary', description: '교환 상품의 택배사와 송장번호를 입력합니다.' },
      { value: 'refund', label: '환불 처리', variant: 'error', description: '교환 대신 환불을 진행합니다.' },
    ]
  }
  if (status === 'IN_PROGRESS' && type === 'RETURN') {
    return [
      { value: 'refund', label: '환불 처리', variant: 'error', description: '환불을 진행합니다. 미입력 시 전액 환불됩니다.' },
    ]
  }
  // REJECTED: 재배송 송장 등록 + 환불 처리 (거절해도 환불 가능)
  if (status === 'REJECTED' && (type === 'RETURN' || type === 'EXCHANGE')) {
    const hasReshipShipping = detail?.exchangeTrackingNumber
    const actions = []
    if (!hasReshipShipping) {
      actions.push({ value: 'reship', label: '재배송 송장 등록', variant: 'info', description: '거절된 상품을 고객에게 재배송합니다.' })
    }
    actions.push({ value: 'refund', label: '환불 처리', variant: 'error', description: '거절된 클레임이지만 환불을 진행합니다.' })
    return actions
  }
  // REJECTED: 취소의 경우도 환불 처리 가능
  if (status === 'REJECTED' && type === 'CANCEL') {
    return [
      { value: 'refund', label: '환불 처리', variant: 'error', description: '거절된 취소 요청이지만 환불을 진행합니다.' },
    ]
  }
  return []
})

const canOpenClaimModal = computed(() => claimAvailableActions.value.length > 0)

// 클레임 액션 실행 가능 여부
const canExecuteClaim = computed(() => {
  if (!claimAction.value) return false
  if (claimAction.value === 'reject' && !claimRejectReason.value.trim()) return false
  if (claimAction.value === 'return-shipping' && (!claimReturnShippingCarrier.value || !claimReturnTrackingNumber.value.trim())) return false
  if (claimAction.value === 'exchange-complete' && (!claimShippingCompany.value || !claimTrackingNumber.value.trim())) return false
  if (claimAction.value === 'reship' && (!claimReshipCarrier.value || !claimReshipTrackingNumber.value.trim())) return false
  if (claimAction.value === 'refund' && !claimRefundReason.value.trim()) return false
  if (claimAction.value === 'receive-inspect' && claimInspectResult.value === 'REJECT' && !claimInspectRejectReason.value.trim()) return false
  // approve는 추가 입력 없이 실행 가능
  return true
})

const openClaimModal = () => {
  const actions = claimAvailableActions.value
  // 반송장이 이미 등록된 경우 입고 검수에 포커싱
  const hasReturnShipping = claimDetail.value?.returnShippingCarrier && claimDetail.value?.returnTrackingNumber
  const receiveInspect = actions.find(a => a.value === 'receive-inspect')
  claimAction.value = (hasReturnShipping && receiveInspect) ? 'receive-inspect' : (actions[0]?.value || '')
  claimAdminNote.value = ''
  claimRejectReason.value = ''
  claimShippingCompany.value = ''
  claimTrackingNumber.value = ''
  claimReturnShippingCarrier.value = ''
  claimReturnTrackingNumber.value = ''
  claimRefundReason.value = ''
  deductReturnFee.value = null
  deductOriginalFee.value = null
  claimReshipCarrier.value = ''
  claimReshipTrackingNumber.value = ''
  claimInspectResult.value = 'ACCEPT'
  claimRestoreStock.value = true
  claimInspectRejectReason.value = ''
  // 교환 완료 가능한 상태면 교환 아이템 초기화
  if (actions.some(a => a.value === 'exchange-complete')) {
    initExchangeItems()
  }
  showClaimModal.value = true
}

const executeClaimAction = async () => {
  if (!canExecuteClaim.value) return
  isClaimProcessing.value = true

  try {
    const id = claimDetail.value?.claimId
    const fromStatus = claimDetail.value?.status

    if (claimAction.value === 'approve') {
      const body = { fromStatus }
      if (claimAdminNote.value.trim()) body.adminNote = claimAdminNote.value
      await $api.post(`/admin/claims/${id}/approve`, body)
    } else if (claimAction.value === 'reject') {
      await $api.post(`/admin/claims/${id}/reject`, {
        fromStatus,
        rejectReason: claimRejectReason.value,
      })
    } else if (claimAction.value === 'return-shipping') {
      await $api.post(`/admin/claims/${id}/return-shipping`, {
        fromStatus,
        shippingCarrier: claimReturnShippingCarrier.value,
        trackingNumber: claimReturnTrackingNumber.value,
      })
    } else if (claimAction.value === 'receive-inspect') {
      const inspectBody = { fromStatus, result: claimInspectResult.value }
      if (claimInspectResult.value === 'ACCEPT') {
        inspectBody.restoreStock = claimRestoreStock.value
      }
      if (claimInspectResult.value === 'REJECT') {
        inspectBody.rejectReason = claimInspectRejectReason.value
      }
      await $api.post(`/admin/claims/${id}/receive-inspect`, inspectBody)
    } else if (claimAction.value === 'exchange-complete') {
      const body = {
        fromStatus,
        shippingCarrier: claimShippingCompany.value,
        trackingNumber: claimTrackingNumber.value,
        exchangeItems: exchangeItems.value.map((item) => ({
          originalClaimItemId: item.originalItem.claimItemId || item.originalItem.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          isSameProduct: item.isSameProduct,
        })),
      }
      if (claimAdminNote.value.trim()) body.adminNote = claimAdminNote.value
      await $api.post(`/admin/claims/${id}/exchange/complete`, body)
    } else if (claimAction.value === 'reship') {
      await $api.post(`/admin/claims/${id}/reship`, {
        fromStatus,
        shippingCarrier: claimReshipCarrier.value,
        trackingNumber: claimReshipTrackingNumber.value,
      })
    } else if (claimAction.value === 'refund') {
      let body = {}

      // 거절된 클레임은 claimId 없이 orderId로 새 클레임 생성 + 환불
      if (fromStatus === 'REJECTED') {
        body = {
          orderId: Number(orderId.value),
          claimType: claimDetail.value?.claimType,
          reasonType: 'OTHER',
          reason: claimRefundReason.value || '고객 서비스 차원 환불 (클레임 거절 건)',
          claimItems: (claimDetail.value?.items || []).map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          })),
        }
      } else {
        // 일반 환불 (승인된 클레임 → 환불)
        body = {
          claimId: Number(id),
          fromStatus,
          reason: claimRefundReason.value,
        }
      }

      if (deductReturnFee.value !== null) body.deductReturnFee = deductReturnFee.value
      if (deductOriginalFee.value !== null) body.deductOriginalFee = deductOriginalFee.value
      await $api.post('/admin/refunds', body)
    }

    showClaimModal.value = false
    uiStore.showToast({ type: 'success', message: '클레임 상태가 변경되었습니다.' })
    await Promise.all([fetchOrder(), fetchClaims()])
  } catch (err) {
    console.error('Claim action error:', err)
    uiStore.showToast({
      type: 'error',
      message: err.data?.error?.message || err.data?.message || err.message || '클레임 처리에 실패했습니다.',
    })
  } finally {
    isClaimProcessing.value = false
  }
}

// ── 클레임 생성 (배송 후) ──
const showCreateClaimModal = ref(false)
const newClaimType = ref('RETURN') // 'RETURN' | 'EXCHANGE'
const newClaimReasonType = ref('')
const newClaimReason = ref('')
const newClaimItems = ref([]) // [{ orderItemId, productName, variantName, imageUrl, quantity, maxQuantity, selected }]
const isCreatingClaim = ref(false)

// 클레임 생성 사유 옵션
const claimReasonOptions = [
  { value: 'CHANGE_OF_MIND', label: '단순 변심' },
  { value: 'DEFECTIVE', label: '상품 불량' },
  { value: 'WRONG_DELIVERY', label: '오배송' },
  { value: 'DELAYED_DELIVERY', label: '배송 지연' },
  { value: 'OUT_OF_STOCK', label: '품절' },
  { value: 'OTHER', label: '기타' },
]

const initNewClaimItems = () => {
  // 클레임 가능한 수량이 있는 상품만 포함
  const availableItems = (order.value?.items || [])
    .map((item) => {
      const remaining = getRemainingQuantity(item)
      return { ...item, remainingQuantity: remaining }
    })
    .filter((item) => item.remainingQuantity > 0)

  newClaimItems.value = availableItems.map((item) => ({
    orderItemId: item.orderItemId || item.id,
    productName: item.productName,
    variantName: item.variantName,
    imageUrl: item.imageUrl,
    quantity: item.remainingQuantity, // 남은 수량으로 기본 설정
    maxQuantity: item.remainingQuantity, // 남은 수량이 최대
    originalQuantity: item.quantity, // 원래 주문 수량 (표시용)
    claimedQuantity: item.quantity - item.remainingQuantity, // 이미 클레임된 수량 (표시용)
    selected: true,
  }))
}

const selectedNewClaimItems = computed(() => newClaimItems.value.filter((i) => i.selected))
const newClaimItemsValid = computed(() => {
  return selectedNewClaimItems.value.length > 0 && selectedNewClaimItems.value.every((i) => i.quantity > 0 && i.quantity <= i.maxQuantity)
})

const canCreateClaim = computed(() => {
  return newClaimType.value && newClaimReasonType.value && newClaimReason.value.trim() && newClaimItemsValid.value
})

const openCreateClaimModal = () => {
  newClaimType.value = 'RETURN'
  newClaimReasonType.value = ''
  newClaimReason.value = ''
  initNewClaimItems()
  showCreateClaimModal.value = true
}

const executeCreateClaim = async () => {
  if (!canCreateClaim.value) return
  isCreatingClaim.value = true

  try {
    const payload = {
      orderId: Number(orderId.value),
      claimType: newClaimType.value,
      reasonType: newClaimReasonType.value,
      reason: newClaimReason.value,
      claimItems: selectedNewClaimItems.value.map((i) => ({
        orderItemId: i.orderItemId,
        quantity: i.quantity,
      })),
    }

    await $api.post('/admin/claims', payload)

    showCreateClaimModal.value = false
    uiStore.showToast({ type: 'success', message: '클레임이 생성되었습니다.' })
    await Promise.all([fetchOrder(), fetchClaims()])
  } catch (err) {
    console.error('Create claim error:', err)
    uiStore.showToast({
      type: 'error',
      message: err.data?.error?.message || err.data?.message || err.message || '클레임 생성에 실패했습니다.',
    })
  } finally {
    isCreatingClaim.value = false
  }
}

// (orderClaims, fetchOrderClaims는 위에서 fetchClaims로 통합됨)

// 초기 로드
onMounted(async () => {
  await fetchOrder()
  // 클레임 정보 항상 조회
  fetchClaims()
})
</script>

<template>
  <LayoutDetailPage>
    <!-- Page Header -->
    <div class="mb-6">
      <button
        type="button"
        class="flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 mb-2"
        @click="goBack"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        {{ fromClaims ? '교환/반품/취소' : '주문 목록' }}
      </button>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold text-neutral-900">
            {{ selectedClaim ? `${claimTypeMap[selectedClaim.claimType]?.label || selectedClaim.claimType} 상세` : '주문 상세' }}
          </h1>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <UiSpinner size="lg" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-20">
      <p class="text-error-600 mb-4">{{ error }}</p>
      <UiButton variant="outline" @click="fetchOrder">다시 시도</UiButton>
    </div>

    <!-- Content -->
    <template v-else-if="order">
      <!-- Order Summary Card -->
      <UiCard class="mb-6">
        <div class="flex flex-col md:flex-row md:items-center gap-4">
          <!-- Order Info -->
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <h2 class="text-xl font-bold text-neutral-900">{{ order.orderNumber }}</h2>
            </div>
            <p class="text-sm text-neutral-500">주문일시: {{ formatDate(order.orderedAt) }}</p>
          </div>

          <!-- Amount Summary -->
          <div class="flex gap-6 md:gap-8 text-center">
            
            <div v-if="selectedClaim?.actualRefundAmount != null">
              <p class="text-2xl font-bold text-error-500">{{ formatCurrency(selectedClaim.actualRefundAmount) }}</p>
              <p class="text-sm text-neutral-500">환불금액</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-neutral-900">{{ order.items?.length || 0 }}건</p>
              <p class="text-sm text-neutral-500">주문상품</p>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- 클레임 정보 섹션 (클레임이 있으면 항상 표시) -->
      <UiCard v-if="hasClaims" class="mb-6">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-neutral-900">클레임 정보</h3>
              <span class="text-sm text-neutral-500">({{ orderClaims.length }}건)</span>
            </div>
            <UiButton
              v-if="selectedClaim"
              variant="primary"
              size="sm"
              @click="openClaimModal"
            >
              클레임 처리
            </UiButton>
          </div>
        </template>

        <!-- 클레임 탭 (여러 개일 때) -->
        <div v-if="orderClaims.length > 1" class="flex gap-2 mb-4 pb-4 border-b border-neutral-200 overflow-x-auto">
          <button
            v-for="claim in orderClaims"
            :key="claim.claimId"
            type="button"
            :class="[
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              selectedClaimId == claim.claimId || (!selectedClaimId && orderClaims[0]?.claimId === claim.claimId)
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            ]"
            @click="selectClaim(claim.claimId)"
          >
            <UiBadge :variant="claimTypeMap[claim.claimType]?.variant || 'neutral'" size="sm">
              {{ claimTypeMap[claim.claimType]?.label || claim.claimType }}
            </UiBadge>
            <span>{{ claimStatusMap[claim.status]?.label || claim.status }}</span>
          </button>
        </div>

        <!-- 선택된 클레임 헤더 (단일 클레임일 때) -->
        <div v-else-if="selectedClaim" class="flex items-center gap-2 mb-4">
          <UiBadge :variant="claimTypeMap[selectedClaim.claimType]?.variant || 'neutral'" size="sm">
            {{ claimTypeMap[selectedClaim.claimType]?.label || selectedClaim.claimType }}
          </UiBadge>
          <UiBadge :variant="claimStatusMap[selectedClaim.status]?.variant || 'neutral'" size="sm">
            {{ claimStatusMap[selectedClaim.status]?.label || selectedClaim.status }}
          </UiBadge>
        </div>

        <!-- 선택된 클레임 상세 -->
        <UiDescriptionList v-if="selectedClaim" :items="claimInfoItems">
          <template #value-claimType="{ item }">
            <span class="font-medium">{{ claimTypeMap[item.value]?.label || item.value }}</span>
          </template>
          <template #value-claimStatus="{ item }">
            <UiBadge :variant="claimStatusMap[item.value]?.variant || 'neutral'" size="sm">
              {{ claimStatusMap[item.value]?.label || item.value }}
            </UiBadge>
          </template>
          <template #value-refundAmount="{ item }">
            <span
              :class="claimDetail?.claimType === 'EXCHANGE' && claimDetail?.refundAmount === 0
                ? 'text-sm text-neutral-400'
                : 'text-sm font-bold text-error-500'"
            >{{ item.value }}</span>
          </template>
          <template #value-actualRefundAmount="{ item }">
            <span class="text-sm font-bold text-success-600">{{ item.value }}</span>
          </template>
          <template #value-returnShipping="{ item }">
            <a v-if="item.url" :href="item.url" target="_blank" rel="noopener" class="underline text-neutral-700 hover:text-neutral-900">
              {{ item.value }}
            </a>
            <span v-else>{{ item.value }}</span>
          </template>
          <template #value-exchangeShipping="{ item }">
            <a v-if="item.url" :href="item.url" target="_blank" rel="noopener" class="underline text-neutral-700 hover:text-neutral-900">
              {{ item.value }}
            </a>
            <span v-else>{{ item.value }}</span>
          </template>
          <template #value-claimItems="{ item }">
            <div v-if="item.value?.length" class="space-y-2">
              <div v-for="(ci, idx) in item.value" :key="idx" class="text-sm">
                <!-- 원래 상품 -->
                <div class="text-neutral-700">
                  {{ ci.productName }}
                  <span v-if="ci.variantName" class="text-neutral-500">({{ ci.variantName }})</span>
                  <span class="text-neutral-500"> x {{ ci.quantity }}</span>
                </div>
                <!-- 교환 요청 상품 (있을 경우) -->
                <div v-if="ci.exchangeVariantId" class="flex items-center gap-2 mt-1 pl-2 border-l-2 border-warning-300">
                  <svg class="w-4 h-4 text-warning-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span class="text-warning-700">
                    {{ ci.exchangeProductName }}
                    <span v-if="ci.exchangeVariantName" class="text-warning-600">({{ ci.exchangeVariantName }})</span>
                  </span>
                </div>
              </div>
            </div>
            <span v-else class="text-neutral-400">-</span>
          </template>
        </UiDescriptionList>
      </UiCard>

      <!-- 클레임 정보 로딩 -->
      <div v-else-if="isClaimLoading" class="mb-6 flex items-center justify-center py-8">
        <UiSpinner size="md" />
      </div>

      <!-- Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- 주문 회원 정보 -->
        <UiCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-neutral-900">주문 회원 정보</h3>
              <UiButton variant="ghost" size="xs" @click="goToUser(order.customer?.userId)">
                상세보기
              </UiButton>
            </div>
          </template>
          <UiDescriptionList :items="userInfoItems">
            <template #value-name="{ item }">
              {{ item.value }}
              <UiBadge v-if="order.customer?.grade" variant="warning" size="sm" class="ml-2">
                {{ order.customer.grade }}
              </UiBadge>
            </template>
          </UiDescriptionList>
        </UiCard>

        <!-- 결제 정보 -->
        <UiCard>
          <template #header>
            <h3 class="font-semibold text-neutral-900">결제 정보</h3>
          </template>
          <UiDescriptionList :items="paymentInfoItems">
            <template #value-status="{ item }">
              <UiBadge :variant="paymentStatusMap[item.value]?.variant || 'neutral'" size="sm">
                {{ paymentStatusMap[item.value]?.label || item.value }}
              </UiBadge>
            </template>
            <template #value-transactionId="{ item }">
              <span class="font-mono text-xs text-neutral-600">{{ item.value }}</span>
            </template>
          </UiDescriptionList>
        </UiCard>

        <!-- 배송지 정보 -->
        <UiCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-neutral-900">배송지 정보</h3>
              <div class="flex items-center gap-2">
                <UiButton
                  v-if="canCreateShipment"
                  variant="primary"
                  size="sm"
                  @click="openShipmentModal"
                >
                  발송 등록
                </UiButton>
                <UiButton
                  v-if="canOpenStatusModal"
                  variant="outline"
                  size="sm"
                  @click="openStatusModal"
                >
                  상태 변경
                </UiButton>
                <UiButton
                  v-if="isPostDelivery"
                  variant="warning"
                  size="sm"
                  @click="openCreateClaimModal"
                >
                  클레임 생성
                </UiButton>
              </div>
            </div>
          </template>
          <UiDescriptionList :items="shippingAddressItems" />
        </UiCard>
      </div>

      <!-- 배송 현황 (shipments) -->
      <UiCard v-if="shipments.length > 0" class="mb-6">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-neutral-900">배송 현황</h3>
              <span v-if="shipments.length > 1" class="text-sm text-neutral-500">({{ shipments.length }}건)</span>
            </div>
            <UiButton
              v-if="canRefreshDelivery"
              variant="outline"
              size="sm"
              :loading="isRefreshingDelivery"
              :title="`배송중 ${inTransitShipmentCount}건 갱신`"
              @click="refreshDelivery"
            >
              <svg class="w-4 h-4 md:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span class="hidden md:inline">배송중 갱신{{ inTransitShipmentCount > 1 ? ` (${inTransitShipmentCount}건)` : '' }}</span>
            </UiButton>
          </div>
        </template>

        <!-- 배송 탭 (여러 건일 때) -->
        <div v-if="shipments.length > 1" class="flex gap-2 mb-4 pb-4 border-b border-neutral-200 overflow-x-auto">
          <button
            v-for="(shipment, index) in shipments"
            :key="shipment.shipmentId || index"
            type="button"
            :class="[
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              selectedShipmentIndex === index
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'bg-neutral-50 text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
            ]"
            @click="selectedShipmentIndex = index"
          >
            <UiBadge :variant="shipmentStatusMap[shipment.status]?.variant || 'neutral'" size="sm">
              {{ shipmentStatusMap[shipment.status]?.label || shipment.status || '배송' }}
            </UiBadge>
            <span class="text-xs text-neutral-600">
              {{ shipment.shipmentNumber || shipment.trackingNumber }}
            </span>
          </button>
        </div>

        <!-- 선택된 배송 정보 -->
        <UiDescriptionList v-if="selectedShipment" :items="shippingInfoItems">
          <template #value-shipmentStatus="{ item }">
            <UiBadge :variant="shipmentStatusMap[item.value]?.variant || 'neutral'" size="sm">
              {{ shipmentStatusMap[item.value]?.label || item.value }}
            </UiBadge>
          </template>
          <template #value-tracking="{ item }">
            <a
              v-if="item.url"
              :href="item.url"
              target="_blank"
              rel="noopener"
              class="font-mono text-primary-600 hover:text-primary-700 underline"
            >
              {{ item.value }}
            </a>
            <span v-else class="font-mono">{{ item.value }}</span>
          </template>
        </UiDescriptionList>

        <!-- 배송된 상품 목록 -->
        <div v-if="selectedShipment?.items?.length" class="mt-4 pt-4 border-t border-neutral-200">
          <p class="text-sm font-medium text-neutral-700 mb-2">배송 상품 ({{ selectedShipment.items.length }}건)</p>
          <div class="space-y-2">
            <div
              v-for="(shipItem, idx) in selectedShipment.items"
              :key="idx"
              class="flex items-center gap-3 text-sm"
            >
              <div class="w-10 h-10 bg-neutral-100 rounded border border-neutral-200 flex-shrink-0 overflow-hidden">
                <img
                  v-if="getOrderItemById(shipItem.orderItemId)?.imageUrl"
                  :src="getOrderItemById(shipItem.orderItemId).imageUrl"
                  :alt="getOrderItemById(shipItem.orderItemId)?.productName"
                  class="w-full h-full object-cover"
                >
                <div v-else class="w-full h-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-neutral-900 truncate">{{ getOrderItemById(shipItem.orderItemId)?.productName || `상품 #${shipItem.orderItemId}` }}</p>
                <p v-if="getOrderItemById(shipItem.orderItemId)?.variantName" class="text-neutral-500 text-xs">{{ getOrderItemById(shipItem.orderItemId).variantName }}</p>
              </div>
              <span class="text-neutral-600">x{{ shipItem.quantity }}</span>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- 주문 상품 목록 -->
      <UiCard class="mb-6" padding="none">
        <template #header>
          <h3 class="font-semibold text-neutral-900 px-4 py-3 border-b border-neutral-200">
            주문 상품 ({{ order.items?.length || 0 }}건)
          </h3>
        </template>

        <!-- Desktop Table -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-neutral-200 bg-neutral-50">
                <th class="text-left py-3 px-4 text-sm font-medium text-neutral-600">상품정보</th>
                <th class="text-center py-3 px-4 text-sm font-medium text-neutral-600 w-24">수량</th>
                <th class="text-center py-3 px-4 text-sm font-medium text-neutral-600 w-28">상태</th>
                <th class="text-right py-3 px-4 text-sm font-medium text-neutral-600 w-32">단가</th>
                <th class="text-right py-3 px-4 text-sm font-medium text-neutral-600 w-32">금액</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in order.items"
                :key="index"
                :class="[
                  'border-b border-neutral-100',
                  isCompletedClaimItem(item) ? 'bg-neutral-50 opacity-60' : '',
                  isInProgressClaimItem(item) ? 'bg-warning-50 border-l-2 border-l-warning-400' : ''
                ]"
              >
                <td class="py-4 px-4">
                  <div class="flex items-center gap-3">
                    <div class="w-16 h-16 bg-neutral-100 rounded-lg flex-shrink-0 overflow-hidden">
                      <img
                        v-if="item.imageUrl"
                        :src="item.imageUrl"
                        :alt="item.productName"
                        class="w-full h-full object-cover"
                      >
                      <div v-else class="w-full h-full flex items-center justify-center">
                        <svg class="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p :class="['text-sm font-medium', isStrikethroughItem(item) ? 'line-through text-neutral-400' : 'text-neutral-900']">{{ item.productName }}</p>
                      <p v-if="item.variantName" :class="['text-xs', isStrikethroughItem(item) ? 'line-through text-neutral-400' : 'text-neutral-500']">{{ item.variantName }}</p>
                      <p v-if="item.options?.length" class="text-xs text-neutral-500">
                        {{ item.options.join(' / ') }}
                      </p>
                      <!-- 클레임 정보 표시 -->
                      <div v-if="getClaimInfo(item.orderItemId).length > 0" class="flex flex-wrap gap-1 mt-1">
                        <span
                          v-for="(info, idx) in getClaimInfo(item.orderItemId)"
                          :key="idx"
                          :class="[
                            'text-xs px-1.5 py-0.5 rounded',
                            info.status === 'COMPLETED' ? 'bg-neutral-200 text-neutral-600' : 'bg-warning-100 text-warning-700'
                          ]"
                        >
                          {{ info.label }}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td :class="['py-4 px-4 text-center text-sm', isStrikethroughItem(item) ? 'line-through text-neutral-400' : 'text-neutral-700']">{{ item.quantity }}</td>
                <td class="py-4 px-4 text-center">
                  <UiBadge
                    :variant="orderItemStatusMap[item.orderItemStatus]?.variant || 'neutral'"
                    size="sm"
                  >
                    {{ orderItemStatusMap[item.orderItemStatus]?.label || item.orderItemStatus }}
                  </UiBadge>
                </td>
                <td :class="['py-4 px-4 text-right text-sm', isStrikethroughItem(item) ? 'line-through text-neutral-400' : 'text-neutral-600']">{{ formatCurrency(item.unitPrice) }}</td>
                <td :class="['py-4 px-4 text-right text-sm font-medium', isStrikethroughItem(item) ? 'line-through text-neutral-400' : 'text-neutral-900']">{{ formatCurrency(item.subtotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="md:hidden divide-y divide-neutral-100">
          <div
            v-for="(item, index) in order.items"
            :key="index"
            :class="[
              'p-4',
              isCompletedClaimItem(item) ? 'bg-neutral-50 opacity-60' : '',
              isInProgressClaimItem(item) ? 'bg-warning-50 border-l-2 border-l-warning-400' : ''
            ]"
          >
            <div class="flex gap-3">
              <div class="w-16 h-16 bg-neutral-100 rounded-lg flex-shrink-0 overflow-hidden">
                <img
                  v-if="item.imageUrl"
                  :src="item.imageUrl"
                  :alt="item.productName"
                  class="w-full h-full object-cover"
                >
                <div v-else class="w-full h-full flex items-center justify-center">
                  <svg class="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <p :class="['text-sm font-medium', isStrikethroughItem(item) ? 'line-through text-neutral-400' : 'text-neutral-900']">{{ item.productName }}</p>
                  <UiBadge
                    :variant="orderItemStatusMap[item.orderItemStatus]?.variant || 'neutral'"
                    size="sm"
                  >
                    {{ orderItemStatusMap[item.orderItemStatus]?.label || item.orderItemStatus }}
                  </UiBadge>
                </div>
                <p v-if="item.variantName" :class="['text-xs', isStrikethroughItem(item) ? 'line-through text-neutral-400' : 'text-neutral-500']">{{ item.variantName }}</p>
                <!-- 클레임 정보 표시 -->
                <div v-if="getClaimInfo(item.orderItemId).length > 0" class="flex flex-wrap gap-1 mt-1">
                  <span
                    v-for="(info, idx) in getClaimInfo(item.orderItemId)"
                    :key="idx"
                    :class="[
                      'text-xs px-1.5 py-0.5 rounded',
                      info.status === 'COMPLETED' ? 'bg-neutral-200 text-neutral-600' : 'bg-warning-100 text-warning-700'
                    ]"
                  >
                    {{ info.label }}
                  </span>
                </div>
                <div class="flex items-center justify-between mt-2">
                  <span :class="['text-sm', isStrikethroughItem(item) ? 'line-through text-neutral-400' : 'text-neutral-600']">{{ item.quantity }}개 x {{ formatCurrency(item.unitPrice) }}</span>
                  <span :class="['text-sm font-semibold', isStrikethroughItem(item) ? 'line-through text-neutral-400' : 'text-neutral-900']">{{ formatCurrency(item.subtotal) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Amount Summary -->
        <div class="border-t border-neutral-200 bg-neutral-50 p-4">
          <dl class="space-y-2 max-w-xs ml-auto">
            <div class="flex justify-between text-sm">
              <dt class="text-neutral-500">상품 합계</dt>
              <dd class="text-neutral-900">{{ formatCurrency(order.summary?.subtotal) }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-neutral-500">배송비</dt>
              <dd class="text-neutral-900">
                {{ order.summary?.shippingTotal === 0 ? '무료' : formatCurrency(order.summary?.shippingTotal) }}
              </dd>
            </div>
            <div class="flex justify-between text-sm pt-1 border-t border-neutral-200">
              <dt class="text-neutral-600 font-medium">총 주문 금액</dt>
              <dd class="text-neutral-900 font-medium">{{ formatCurrency(order.summary?.grandTotal) }}</dd>
            </div>
            <div v-if="totalRefundedAmount > 0" class="flex justify-between text-sm">
              <dt class="text-error-500">환불 완료</dt>
              <dd class="font-medium text-error-500">-{{ formatCurrency(totalRefundedAmount) }}</dd>
            </div>
            <div class="flex justify-between pt-2 border-t border-neutral-300">
              <dt class="text-base font-semibold text-neutral-900">
                {{ totalRefundedAmount > 0 ? '실 결제 금액' : '결제 금액' }}
              </dt>
              <dd :class="['text-lg font-bold', totalRefundedAmount > 0 ? 'text-neutral-900' : 'text-primary-600']">
                {{ formatCurrency(actualPaidAmount) }}
              </dd>
            </div>
          </dl>
        </div>
      </UiCard>

      <!-- 주문/클레임 통합 이력 -->
      <UiCard v-if="order.combinedHistory?.length || order.history?.length">
        <template #header>
          <h3 class="font-semibold text-neutral-900">주문 이력</h3>
        </template>
        <ul class="space-y-6">
          <li
            v-for="(history, index) in (order.combinedHistory || order.history)"
            :key="index"
            class="relative flex gap-4"
          >
            <!-- 아이콘 + 세로선 -->
            <div class="flex flex-col items-center">
              <div
                :class="[
                  'w-3 h-3 rounded-full flex-shrink-0 ring-4',
                  history.type === 'CLAIM'
                    ? history.claimType === 'EXCHANGE'
                      ? 'bg-warning-500 ring-warning-100'
                      : history.claimType === 'RETURN'
                        ? 'bg-error-500 ring-error-100'
                        : 'bg-neutral-500 ring-neutral-100'
                    : 'bg-primary-500 ring-primary-100'
                ]"
              />
              <div
                v-if="index < (order.combinedHistory || order.history).length - 1"
                class="w-0.5 flex-1 bg-neutral-200 mt-2"
              />
            </div>
            <!-- 내용 -->
            <div class="flex-1 pb-2">
              <div class="flex items-center gap-2">
                <!-- 클레임 타입 뱃지 -->
                <UiBadge
                  v-if="history.type === 'CLAIM' && history.claimType"
                  :variant="claimTypeMap[history.claimType]?.variant || 'neutral'"
                  size="sm"
                >
                  {{ claimTypeMap[history.claimType]?.label || history.claimType }}
                </UiBadge>
                <!-- 상태 텍스트 (fromStatus → toStatus) -->
                <p class="text-sm font-medium text-neutral-900">
                  <template v-if="history.type === 'CLAIM'">
                    <template v-if="history.fromStatus">
                      {{ claimStatusMap[history.fromStatus]?.label || history.fromStatus }}
                      <span class="text-neutral-400 mx-1">→</span>
                    </template>
                    {{ claimStatusMap[history.toStatus]?.label || history.toStatus }}
                  </template>
                  <template v-else>
                    <template v-if="history.fromStatus">
                      {{ statusMap[history.fromStatus]?.label || history.fromStatus }}
                      <span class="text-neutral-400 mx-1">→</span>
                    </template>
                    {{ statusMap[history.toStatus]?.label || history.toStatus }}
                  </template>
                </p>
              </div>
              <p class="text-xs text-neutral-500 mt-0.5">
                {{ formatDate(history.createdAt, 'long') }}
                <span v-if="history.createdByName"> · {{ history.createdByName }}</span>
              </p>
              <p v-if="history.note" class="text-sm text-neutral-600 mt-1">{{ history.note }}</p>
            </div>
          </li>
        </ul>
      </UiCard>
    </template>

    <!-- Not Found -->
    <UiCard v-else>
      <UiEmpty
        title="주문을 찾을 수 없습니다"
        description="존재하지 않거나 삭제된 주문입니다."
      >
        <template #action>
          <UiButton variant="primary" @click="goBack">
            목록으로 돌아가기
          </UiButton>
        </template>
      </UiEmpty>
    </UiCard>

    <!-- Status Change Modal -->
    <UiModal
      v-model="showStatusModal"
      :title="showConfirmStep ? '상태 변경 확인' : '주문 상태 변경'"
      size="sm"
    >
      <!-- 확인 단계 -->
      <template v-if="showConfirmStep">
        <div class="text-center py-4">
          <!-- 경고 아이콘 -->
          <div class="mx-auto w-12 h-12 rounded-full bg-warning-100 flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h3 class="text-lg font-semibold text-neutral-900 mb-2">
            정말 변경하시겠습니까?
          </h3>

          <p class="text-sm text-neutral-600 mb-4">
            <span class="font-medium text-primary-600">{{ allStatusOptions.find(o => o.value === selectedStatus)?.label }}</span>
            상태로 변경하면<br>
            <span class="text-error-600 font-medium">이전 상태로 되돌릴 수 없습니다.</span>
          </p>

          <div class="bg-neutral-50 rounded-lg p-3 text-left">
            <p class="text-xs text-neutral-500 mb-1">변경 후 문제가 발생하면</p>
            <p class="text-sm text-neutral-700">별도의 <span class="font-medium">환불 처리</span>를 진행해 주세요.</p>
          </div>
        </div>
      </template>

      <!-- 상태 변경 불가 안내 -->
      <template v-else-if="!canOpenStatusModal">
        <div class="text-center py-4">
          <!-- 안내 아이콘 -->
          <div class="mx-auto w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h3 class="text-lg font-semibold text-neutral-900 mb-2">
            상태 변경 불가
          </h3>

          <p class="text-sm text-neutral-600 whitespace-pre-line">
            {{ getStatusChangeBlockedMessage() }}
          </p>
        </div>
      </template>

      <!-- 상태 선택 단계 -->
      <template v-else>
        <p class="text-sm text-neutral-600 mb-4">
          주문 <span class="font-medium text-neutral-900">{{ order?.orderNumber }}</span>의 상태를 변경합니다.
        </p>

        <!-- 상품준비중일 때 발송 등록 안내 -->
        <div v-if="order?.status === 'PREPARING'" class="mb-4 p-3 bg-info-50 border border-info-200 rounded-lg">
          <p class="text-sm text-info-700">
            <span class="font-medium">배송중</span> 전환은
            <span class="font-medium">발송 등록</span> 버튼을 이용해주세요.
          </p>
        </div>

        <div class="space-y-2">
          <label
            v-for="option in statusOptions"
            :key="option.value"
            :class="[
              'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
              selectedStatus === option.value
                ? 'border-primary-500 bg-primary-50'
                : 'border-neutral-200 hover:border-neutral-300',
            ]"
          >
            <input
              v-model="selectedStatus"
              type="radio"
              :value="option.value"
              class="w-4 h-4 text-primary-600 focus:ring-primary-500"
            >
            <span class="font-medium">{{ option.label }}</span>
            <UiBadge :variant="statusMap[option.value]?.variant" size="sm" class="ml-auto">
              {{ option.label }}
            </UiBadge>
          </label>
        </div>

        <!-- 되돌릴 수 없는 상태 변경 경고 -->
        <div v-if="isIrreversibleChange" class="mt-3 p-3 bg-warning-50 border border-warning-200 rounded-lg">
          <p class="text-sm text-warning-700">
            <span class="font-medium">주의:</span> 이 상태로 변경하면 이전 상태로 되돌릴 수 없습니다.
          </p>
        </div>

        <!-- 취소 선택 시 정보 입력 -->
        <div v-if="isCancelSelected" class="mt-4 p-4 bg-error-50 rounded-lg space-y-3">
          <p class="text-sm font-medium text-error-700">주문 취소</p>
          <p class="text-xs text-error-600">배송 전 주문을 취소합니다. 전체 주문이 취소됩니다.</p>
          <div>
            <label class="block text-sm text-neutral-600 mb-1">취소 사유 유형 <span class="text-error-500">*</span></label>
            <select
              v-model="cancelReasonType"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">사유 유형 선택</option>
              <option v-for="opt in cancelReasonOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-neutral-600 mb-1">취소 상세 사유 <span class="text-error-500">*</span></label>
            <textarea
              v-model="cancelReason"
              rows="2"
              placeholder="취소 사유를 입력하세요"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="cancelRestoreStock"
                type="checkbox"
                class="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              >
              <span class="text-sm text-neutral-700">재고 복구</span>
            </label>
            <p class="text-xs text-neutral-500 mt-1 ml-6">체크 해제 시 재고가 차감된 상태로 유지됩니다.</p>
          </div>
        </div>

        <!-- 변경 사유 (취소 제외) -->
        <div v-if="!isCancelSelected" class="mt-4">
          <label class="block text-sm text-neutral-600 mb-1">변경 사유</label>
          <input
            v-model="statusReason"
            type="text"
            placeholder="변경 사유를 입력하세요 (선택)"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
        </div>
      </template>

      <template #footer>
        <!-- 확인 단계 버튼 -->
        <div v-if="showConfirmStep" class="flex justify-end gap-2">
          <UiButton
            variant="outline"
            :disabled="isChangingStatus"
            @click="goBackFromConfirm"
          >
            뒤로
          </UiButton>
          <UiButton
            variant="error"
            :loading="isChangingStatus"
            @click="executeStatusChange"
          >
            변경 확정
          </UiButton>
        </div>

        <!-- 상태 변경 불가 시 닫기 버튼 -->
        <div v-else-if="!canOpenStatusModal" class="flex justify-end">
          <UiButton
            variant="outline"
            @click="showStatusModal = false"
          >
            닫기
          </UiButton>
        </div>

        <!-- 상태 선택 단계 버튼 -->
        <div v-else class="flex justify-end gap-2">
          <UiButton
            variant="outline"
            :disabled="isChangingStatus"
            @click="showStatusModal = false"
          >
            취소
          </UiButton>
          <UiButton
            variant="primary"
            :disabled="!canChangeStatus"
            :loading="isChangingStatus"
            @click="handleChangeClick"
          >
            변경
          </UiButton>
        </div>
      </template>
    </UiModal>

    <!-- Claim Action Modal -->
    <UiModal
      v-model="showClaimModal"
      :title="(claimTypeMap[claimDetail?.claimType]?.label || '클레임') + ' 처리'"
      size="sm"
    >
      <!-- 처리 완료 -->
      <template v-if="!canOpenClaimModal">
        <div class="text-center py-4">
          <div class="mx-auto w-12 h-12 rounded-full bg-success-100 flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-neutral-900 mb-2">처리 완료</h3>
          <p class="text-sm text-neutral-600">이 클레임은 모든 처리가 완료되었습니다.</p>
        </div>
      </template>

      <!-- 액션 선택 -->
      <template v-else>
        <p class="text-sm text-neutral-600 mb-4">
          주문 <span class="font-medium text-neutral-900">{{ order?.orderNumber }}</span>
        </p>

        <!-- 액션 라디오 선택 -->
        <div v-if="claimAvailableActions.length > 1" class="space-y-2 mb-4">
          <label
            v-for="action in claimAvailableActions"
            :key="action.value"
            :class="[
              'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
              claimAction === action.value
                ? 'border-primary-500 bg-primary-50'
                : 'border-neutral-200 hover:border-neutral-300',
            ]"
          >
            <input
              v-model="claimAction"
              type="radio"
              :value="action.value"
              class="w-4 h-4 text-primary-600 focus:ring-primary-500"
            >
            <div class="flex-1">
              <span class="font-medium">{{ action.label }}</span>
              <p v-if="action.description" class="text-xs text-neutral-500 mt-0.5">{{ action.description }}</p>
            </div>
            <UiBadge :variant="action.variant" size="sm" class="ml-auto flex-shrink-0">
              {{ action.label }}
            </UiBadge>
          </label>
        </div>

        <!-- 단일 액션일 때 제목 표시 -->
        <div v-else class="mb-4">
          <UiBadge :variant="claimAvailableActions[0]?.variant" size="sm">
            {{ claimAvailableActions[0]?.label }}
          </UiBadge>
        </div>

        <!-- 반송장 미등록 안내 (승인/입고검수 선택 시) -->
        <div
          v-if="['approve', 'receive-inspect'].includes(claimAction) && ['EXCHANGE', 'RETURN'].includes(claimDetail?.claimType) && !(claimDetail?.returnShippingCarrier && claimDetail?.returnTrackingNumber)"
          class="mb-4 p-3 bg-warning-50 border border-warning-200 rounded-lg"
        >
          <p class="text-sm text-warning-700">
            <span class="font-medium">안내:</span> 반송장이 아직 등록되지 않았습니다.
            {{ claimAction === 'approve' ? '승인 후에도 등록 가능합니다.' : '검수 후에도 등록 가능합니다.' }}
          </p>
        </div>

        <!-- 거절 사유 (reject 선택 시) -->
        <div v-if="claimAction === 'reject'" class="space-y-3">
          <div>
            <label class="block text-sm text-neutral-600 mb-1">거절 사유 <span class="text-error-500">*</span></label>
            <textarea
              v-model="claimRejectReason"
              rows="3"
              placeholder="거절 사유를 입력하세요"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <!-- 반송장 등록 (return-shipping 선택 시) -->
        <div v-if="claimAction === 'return-shipping'" class="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p class="text-sm font-medium text-neutral-700">반송 택배 정보</p>
          <div>
            <label class="block text-sm text-neutral-600 mb-1">택배사 <span class="text-error-500">*</span></label>
            <select
              v-model="claimReturnShippingCarrier"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">택배사 선택</option>
              <option v-for="carrier in carriers" :key="carrier.id" :value="carrier.name">
                {{ carrier.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-neutral-600 mb-1">송장번호 <span class="text-error-500">*</span></label>
            <input
              v-model="claimReturnTrackingNumber"
              type="text"
              placeholder="반송 송장번호를 입력하세요"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
          </div>
        </div>

        <!-- 입고 검수 (receive-inspect 선택 시) -->
        <div v-if="claimAction === 'receive-inspect'" class="space-y-4">
          <!-- 검수 결과 선택 -->
          <div class="space-y-2">
            <p class="text-sm font-medium text-neutral-700">검수 결과 <span class="text-error-500">*</span></p>
            <div class="flex gap-3">
              <label
                :class="[
                  'flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors',
                  claimInspectResult === 'ACCEPT' ? 'border-success-500 bg-success-50' : 'border-neutral-200 hover:border-neutral-300',
                ]"
              >
                <input v-model="claimInspectResult" type="radio" value="ACCEPT" class="w-4 h-4 text-success-600 focus:ring-success-500">
                <span class="font-medium text-sm">승인</span>
              </label>
              <label
                :class="[
                  'flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors',
                  claimInspectResult === 'REJECT' ? 'border-error-500 bg-error-50' : 'border-neutral-200 hover:border-neutral-300',
                ]"
              >
                <input v-model="claimInspectResult" type="radio" value="REJECT" class="w-4 h-4 text-error-600 focus:ring-error-500">
                <span class="font-medium text-sm">거절</span>
              </label>
            </div>
          </div>

          <!-- 승인 시: 재고 복구 여부 -->
          <div v-if="claimInspectResult === 'ACCEPT'" class="p-4 bg-neutral-50 rounded-lg space-y-2">
            <p class="text-sm font-medium text-neutral-700">재고 복구 여부</p>
            <div class="space-y-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="claimRestoreStock" type="radio" :value="true" class="w-4 h-4 text-primary-600 focus:ring-primary-500">
                <span class="text-sm text-neutral-700">재고 복구</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="claimRestoreStock" type="radio" :value="false" class="w-4 h-4 text-primary-600 focus:ring-primary-500">
                <span class="text-sm text-neutral-700">재고 복구 안 함 (파손 등)</span>
              </label>
            </div>
          </div>

          <!-- 거절 시: 거절 사유 -->
          <div v-if="claimInspectResult === 'REJECT'">
            <label class="block text-sm text-neutral-600 mb-1">거절 사유 <span class="text-error-500">*</span></label>
            <textarea
              v-model="claimInspectRejectReason"
              rows="3"
              placeholder="검수 거절 사유를 입력하세요 (예: 사용 흔적이 있어 반품 불가)"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <!-- 교환 완료 (exchange-complete 선택 시) -->
        <div v-if="claimAction === 'exchange-complete'" class="space-y-4">
          <!-- 반품 상품 (고객이 반송한 상품) -->
          <div class="p-4 bg-neutral-50 rounded-lg">
            <p class="text-sm font-medium text-neutral-700 mb-3">반품 상품 (고객 반송)</p>
            <div class="space-y-2">
              <div
                v-for="(item, index) in claimDetail?.items || []"
                :key="index"
                class="flex items-center gap-3 p-2 bg-white rounded border border-neutral-200"
              >
                <img
                  v-if="item.imageUrl"
                  :src="item.imageUrl"
                  :alt="item.productName"
                  class="w-12 h-12 object-cover rounded"
                >
                <div class="w-12 h-12 bg-neutral-100 rounded flex items-center justify-center" v-else>
                  <span class="text-neutral-400 text-xs">No img</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-neutral-900 truncate">{{ item.productName }}</p>
                  <p v-if="item.variantName" class="text-xs text-neutral-500">{{ item.variantName }}</p>
                </div>
                <span class="text-sm text-neutral-600">x {{ item.quantity }}</span>
              </div>
            </div>
          </div>

          <!-- 교환 발송 상품 (고객 요청 상품 - 읽기 전용) -->
          <div class="p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <p class="text-sm font-medium text-primary-700 mb-3">교환 발송 상품 (재고 차감)</p>
            <div class="space-y-2">
              <div
                v-for="(item, index) in exchangeItems"
                :key="index"
                class="flex items-center gap-3 p-2 bg-white rounded border border-neutral-200"
              >
                <img
                  v-if="item.imageUrl"
                  :src="item.imageUrl"
                  :alt="item.productName"
                  class="w-12 h-12 object-cover rounded"
                >
                <div class="w-12 h-12 bg-neutral-100 rounded flex items-center justify-center" v-else>
                  <span class="text-neutral-400 text-xs">No img</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-neutral-900 truncate">{{ item.productName }}</p>
                  <p v-if="item.variantName" class="text-xs text-neutral-500">{{ item.variantName }}</p>
                  <UiBadge v-if="item.isSameProduct" variant="success" size="sm" class="mt-1">동일상품</UiBadge>
                  <UiBadge v-else variant="warning" size="sm" class="mt-1">다른상품</UiBadge>
                </div>
                <span class="text-sm text-neutral-600 font-medium">x {{ item.quantity }}</span>
              </div>
            </div>
            <p class="text-xs text-primary-600 mt-2">
              <svg class="w-3.5 h-3.5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              고객이 요청한 교환 상품입니다
            </p>
          </div>

          <!-- 송장 정보 -->
          <div class="p-4 bg-neutral-50 rounded-lg space-y-3">
            <p class="text-sm font-medium text-neutral-700">송장 정보</p>
            <div>
              <label class="block text-sm text-neutral-600 mb-1">택배사 <span class="text-error-500">*</span></label>
              <select
                v-model="claimShippingCompany"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">택배사 선택</option>
                <option v-for="carrier in carriers" :key="carrier.id" :value="carrier.name">
                  {{ carrier.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-neutral-600 mb-1">송장번호 <span class="text-error-500">*</span></label>
              <input
                v-model="claimTrackingNumber"
                type="text"
                placeholder="송장번호를 입력하세요"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
            </div>
          </div>
        </div>

        <!-- 재배송 송장 등록 (reship 선택 시) -->
        <div v-if="claimAction === 'reship'" class="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p class="text-sm font-medium text-neutral-700">재배송 송장 정보</p>
          <div>
            <label class="block text-sm text-neutral-600 mb-1">택배사 <span class="text-error-500">*</span></label>
            <select
              v-model="claimReshipCarrier"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">택배사 선택</option>
              <option v-for="carrier in carriers" :key="carrier.id" :value="carrier.name">
                {{ carrier.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-neutral-600 mb-1">송장번호 <span class="text-error-500">*</span></label>
            <input
              v-model="claimReshipTrackingNumber"
              type="text"
              placeholder="재배송 송장번호를 입력하세요"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
          </div>
        </div>

        <!-- 환불 정보 (refund 선택 시) -->
        <div v-if="claimAction === 'refund'" class="p-4 bg-neutral-50 rounded-lg space-y-3">
          <p class="text-sm font-medium text-neutral-700">환불 정보</p>
          <div>
            <label class="block text-sm text-neutral-600 mb-1">환불 사유 <span class="text-error-500">*</span></label>
            <textarea
              v-model="claimRefundReason"
              rows="2"
              placeholder="환불 사유를 입력하세요"
              class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <!-- 환불 예정 금액 표시 (수정 불가) -->
          <div v-if="claimDetail?.refundAmount != null">
            <label class="block text-sm text-neutral-600 mb-1">환불 예정 금액</label>
            <p class="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm font-medium text-error-500">
              {{ formatCurrency(claimDetail.refundAmount) }}
            </p>
          </div>
          <!-- 배송비 차감 옵션 (반품/교환일 때) -->
          <div v-if="['RETURN', 'EXCHANGE'].includes(claimDetail?.claimType)" class="mt-3 space-y-3">
            <!-- 반품배송비 차감 -->
            <div>
              <label class="block text-sm text-neutral-600 mb-1">반품배송비 차감</label>
              <div class="flex items-center gap-4">
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    v-model="deductReturnFee"
                    type="radio"
                    :value="null"
                    class="w-4 h-4 text-primary-600"
                  >
                  <span class="text-sm text-neutral-700">자동</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    v-model="deductReturnFee"
                    type="radio"
                    :value="true"
                    class="w-4 h-4 text-primary-600"
                  >
                  <span class="text-sm text-neutral-700">차감</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    v-model="deductReturnFee"
                    type="radio"
                    :value="false"
                    class="w-4 h-4 text-primary-600"
                  >
                  <span class="text-sm text-neutral-700">면제</span>
                </label>
              </div>
            </div>
            <!-- 최초배송비 소급 차감 -->
            <div>
              <label class="block text-sm text-neutral-600 mb-1">최초배송비 소급 차감</label>
              <div class="flex items-center gap-4">
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    v-model="deductOriginalFee"
                    type="radio"
                    :value="null"
                    class="w-4 h-4 text-primary-600"
                  >
                  <span class="text-sm text-neutral-700">자동</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    v-model="deductOriginalFee"
                    type="radio"
                    :value="true"
                    class="w-4 h-4 text-primary-600"
                  >
                  <span class="text-sm text-neutral-700">차감</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    v-model="deductOriginalFee"
                    type="radio"
                    :value="false"
                    class="w-4 h-4 text-primary-600"
                  >
                  <span class="text-sm text-neutral-700">면제</span>
                </label>
              </div>
            </div>
            <p class="text-xs text-neutral-500">자동 선택 시 사유에 따라 자동 판단됩니다</p>
          </div>
        </div>

        <!-- 관리자 메모 (승인/교환완료 시) -->
        <div v-if="!['reject', 'refund'].includes(claimAction)" class="mt-4">
          <label class="block text-sm text-neutral-600 mb-1">관리자 메모</label>
          <input
            v-model="claimAdminNote"
            type="text"
            placeholder="메모를 입력하세요 (선택)"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
        </div>
      </template>

      <template #footer>
        <div v-if="!canOpenClaimModal" class="flex justify-end">
          <UiButton variant="outline" @click="showClaimModal = false">닫기</UiButton>
        </div>
        <div v-else class="flex justify-end gap-2">
          <UiButton variant="outline" :disabled="isClaimProcessing" @click="showClaimModal = false">
            취소
          </UiButton>
          <UiButton
            :variant="['reject', 'refund'].includes(claimAction) ? 'error' : 'primary'"
            :disabled="!canExecuteClaim"
            :loading="isClaimProcessing"
            @click="executeClaimAction"
          >
            {{ claimAvailableActions.find(a => a.value === claimAction)?.label || '확인' }}
          </UiButton>
        </div>
      </template>
    </UiModal>

    <!-- Shipment Modal (발송 등록 / 분할배송) -->
    <UiModal
      v-model="showShipmentModal"
      title="발송 등록"
      size="lg"
    >
      <p class="text-sm text-neutral-600 mb-4">
        배송할 상품을 선택하고 송장 정보를 입력해주세요.
        <span class="text-primary-600">분할배송</span>이 필요한 경우, 일부 상품만 선택하여 발송할 수 있습니다.
      </p>

      <!-- 송장 정보 입력 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-neutral-50 rounded-lg">
        <div>
          <label class="block text-sm text-neutral-600 mb-1">택배사 <span class="text-error-500">*</span></label>
          <select
            v-model="shipmentCarrierId"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">택배사 선택</option>
            <option v-for="carrier in carriers" :key="carrier.id" :value="carrier.id">
              {{ carrier.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-neutral-600 mb-1">송장번호 <span class="text-error-500">*</span></label>
          <input
            v-model="shipmentTrackingNumber"
            type="text"
            placeholder="송장번호를 입력하세요"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
        </div>
      </div>

      <!-- 발송 상품 선택 -->
      <div class="mb-2 flex items-center justify-between">
        <p class="text-sm font-medium text-neutral-700">발송할 상품 선택</p>
        <p class="text-xs text-neutral-500">
          선택: {{ selectedShipmentItems.length }}건 / 전체: {{ shipmentItems.length }}건
        </p>
      </div>

      <div class="space-y-3 max-h-80 overflow-y-auto">
        <div
          v-for="item in shipmentItems"
          :key="item.orderItemId"
          :class="[
            'flex items-center gap-3 p-3 border rounded-lg transition-colors',
            item.remainingQty <= 0
              ? 'border-neutral-200 bg-neutral-50 opacity-50'
              : item.selected
                ? 'border-primary-300 bg-primary-50'
                : 'border-neutral-200 hover:border-neutral-300 cursor-pointer',
          ]"
          @click="toggleShipmentItem(item)"
        >
          <!-- 체크박스 -->
          <div class="flex-shrink-0">
            <input
              type="checkbox"
              :checked="item.selected"
              :disabled="item.remainingQty <= 0"
              class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              @click.stop
              @change="toggleShipmentItem(item)"
            >
          </div>

          <!-- 상품 이미지 -->
          <div class="w-14 h-14 bg-neutral-100 rounded-lg flex-shrink-0 overflow-hidden">
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :alt="item.productName"
              class="w-full h-full object-cover"
            >
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <!-- 상품 정보 -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-neutral-900 truncate">{{ item.productName }}</p>
            <p v-if="item.variantName" class="text-xs text-neutral-500 truncate">{{ item.variantName }}</p>
            <div class="flex items-center gap-2 mt-1 text-xs">
              <span class="text-neutral-500">
                주문: {{ item.totalQty }}개
              </span>
              <span v-if="item.shippedQty > 0" class="text-success-600">
                발송완료: {{ item.shippedQty }}개
              </span>
              <span v-if="item.remainingQty > 0" class="text-primary-600">
                미발송: {{ item.remainingQty }}개
              </span>
              <span v-else class="text-neutral-400">
                전량발송완료
              </span>
            </div>
          </div>

          <!-- 발송 수량 입력 (미발송 상품만) -->
          <div v-if="item.remainingQty > 0" class="flex-shrink-0 flex items-center gap-2" @click.stop>
            <label class="text-xs text-neutral-600">발송수량</label>
            <input
              v-model.number="item.shipQty"
              type="number"
              :min="0"
              :max="item.remainingQty"
              class="w-16 px-2 py-1 border border-neutral-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
              @input="updateShipmentQty(item, $event.target.value)"
            >
            <span class="text-xs text-neutral-500">/ {{ item.remainingQty }}</span>
          </div>
        </div>
      </div>

      <!-- 발송 불가 안내 -->
      <div v-if="!hasUnshippedItems" class="mt-4 p-3 bg-neutral-100 rounded-lg text-center">
        <p class="text-sm text-neutral-600">모든 상품이 이미 발송되었습니다.</p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UiButton variant="outline" :disabled="isCreatingShipment" @click="showShipmentModal = false">
            취소
          </UiButton>
          <UiButton
            variant="primary"
            :disabled="!canSubmitShipment"
            :loading="isCreatingShipment"
            @click="createShipment"
          >
            발송 등록
          </UiButton>
        </div>
      </template>
    </UiModal>

    <!-- Create Claim Modal (배송 후 클레임 생성) -->
    <UiModal
      v-model="showCreateClaimModal"
      title="클레임 생성"
      size="md"
    >
      <p class="text-sm text-neutral-600 mb-4">
        주문 <span class="font-medium text-neutral-900">{{ order?.orderNumber }}</span>에 대한 클레임을 생성합니다.
      </p>

      <!-- 클레임 유형 선택 -->
      <div class="space-y-2 mb-4">
        <p class="text-sm font-medium text-neutral-700">클레임 유형 <span class="text-error-500">*</span></p>
        <div class="flex gap-3">
          <label
            :class="[
              'flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors',
              newClaimType === 'RETURN' ? 'border-error-500 bg-error-50' : 'border-neutral-200 hover:border-neutral-300',
            ]"
          >
            <input v-model="newClaimType" type="radio" value="RETURN" class="w-4 h-4 text-error-600 focus:ring-error-500">
            <span class="font-medium text-sm">반품</span>
          </label>
          <label
            :class="[
              'flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors',
              newClaimType === 'EXCHANGE' ? 'border-warning-500 bg-warning-50' : 'border-neutral-200 hover:border-neutral-300',
            ]"
          >
            <input v-model="newClaimType" type="radio" value="EXCHANGE" class="w-4 h-4 text-warning-600 focus:ring-warning-500">
            <span class="font-medium text-sm">교환</span>
          </label>
        </div>
      </div>

      <!-- 사유 유형 -->
      <div class="mb-4">
        <label class="block text-sm text-neutral-600 mb-1">사유 유형 <span class="text-error-500">*</span></label>
        <select
          v-model="newClaimReasonType"
          class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">사유 유형 선택</option>
          <option v-for="opt in claimReasonOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <!-- 대상 상품 선택 -->
      <div class="mb-4">
        <label class="block text-sm text-neutral-600 mb-1">대상 상품 <span class="text-error-500">*</span></label>
        <div class="space-y-2 max-h-60 overflow-y-auto">
          <div
            v-for="(item, idx) in newClaimItems"
            :key="idx"
            :class="[
              'flex items-center gap-3 p-3 rounded-lg border transition-colors',
              item.selected ? 'border-primary-300 bg-primary-50/50' : 'border-neutral-200 bg-white',
            ]"
          >
            <input
              v-model="item.selected"
              type="checkbox"
              class="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            >
            <div v-if="item.imageUrl" class="w-10 h-10 rounded overflow-hidden flex-shrink-0">
              <img :src="item.imageUrl" :alt="item.productName" class="w-full h-full object-cover">
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-neutral-900 truncate">{{ item.productName }}</p>
              <p v-if="item.variantName" class="text-xs text-neutral-500">{{ item.variantName }}</p>
              <p v-if="item.claimedQuantity > 0" class="text-xs text-warning-600">
                ({{ item.originalQuantity }}개 중 {{ item.claimedQuantity }}개 클레임 진행/완료)
              </p>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                class="w-7 h-7 flex items-center justify-center rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                :disabled="!item.selected || item.quantity <= 1"
                @click="item.quantity--"
              >
                -
              </button>
              <input
                v-model.number="item.quantity"
                type="number"
                :min="1"
                :max="item.maxQuantity"
                :disabled="!item.selected"
                class="w-10 h-7 text-center text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
              <button
                type="button"
                class="w-7 h-7 flex items-center justify-center rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                :disabled="!item.selected || item.quantity >= item.maxQuantity"
                @click="item.quantity++"
              >
                +
              </button>
              <span class="text-xs text-neutral-400 ml-1">/{{ item.maxQuantity }}</span>
            </div>
          </div>
        </div>
        <p v-if="selectedNewClaimItems.length === 0" class="text-xs text-error-500 mt-1">
          최소 1개 이상의 상품을 선택해주세요.
        </p>
      </div>

      <!-- 상세 사유 -->
      <div>
        <label class="block text-sm text-neutral-600 mb-1">상세 사유 <span class="text-error-500">*</span></label>
        <textarea
          v-model="newClaimReason"
          rows="3"
          placeholder="고객이 요청한 클레임 사유를 상세히 입력하세요"
          class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UiButton variant="outline" :disabled="isCreatingClaim" @click="showCreateClaimModal = false">
            취소
          </UiButton>
          <UiButton
            :variant="newClaimType === 'RETURN' ? 'error' : 'warning'"
            :disabled="!canCreateClaim"
            :loading="isCreatingClaim"
            @click="executeCreateClaim"
          >
            클레임 생성
          </UiButton>
        </div>
      </template>
    </UiModal>

  </LayoutDetailPage>
</template>
