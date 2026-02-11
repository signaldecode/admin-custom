/**
 * useCoupon Composable
 * 쿠폰 관련 API
 */

import { useApi } from '~/composables/useApi'

export function useCoupon() {
  const { get, post, patch, del } = useApi()

  /**
   * 쿠폰 타입 옵션
   */
  const couponTypeOptions = [
    { value: 'PRODUCT_DISCOUNT', label: '상품 할인' },
    { value: 'SHIPPING', label: '무료배송' },
  ]

  /**
   * 발급 상태 옵션
   */
  const issuanceStatusOptions = [
    { value: 'REGISTERED', label: '등록', color: 'neutral' },
    { value: 'ACTIVE', label: '발급중', color: 'success' },
    { value: 'STOPPED', label: '발급중지', color: 'warning' },
    { value: 'ENDED', label: '종료', color: 'error' },
  ]

  /**
   * 할인 방식 옵션
   */
  const discountMethodOptions = [
    { value: 'AMOUNT', label: '정액 할인' },
    { value: 'RATE', label: '정률 할인 (%)' },
  ]

  /**
   * 쿠폰 타입별 기본 유의사항
   */
  const defaultNotesByCouponType = {
    PRODUCT_DISCOUNT: [
      '본 쿠폰은 일부 상품에 적용되지 않을 수 있습니다.',
      '다른 쿠폰과 중복 사용이 불가할 수 있습니다.',
      '유효기간 내 미사용 시 자동 소멸됩니다.',
    ],
    SHIPPING: [
      '배송비 쿠폰은 기본 배송비에만 적용됩니다.',
      '도서산간 지역 추가 배송비는 별도 부담됩니다.',
      '유효기간 내 미사용 시 자동 소멸됩니다.',
    ],
  }

  /**
   * 쿠폰 타입별 기본 유의사항 조회
   * @param {string} couponType - 쿠폰 타입
   * @returns {string[]}
   */
  const getDefaultNotes = (couponType) => {
    return defaultNotesByCouponType[couponType] || []
  }

  /**
   * 쿠폰 목록 조회
   * @param {Object} params - { keyword, couponType, status, page, size }
   */
  const getCoupons = async (params = {}) => {
    const response = await get('/admin/coupons', params)
    return {
      content: response.data?.content || [],
      totalElements: response.data?.total_elements || 0,
      page: response.data?.page || 0,
      size: response.data?.size || 20,
    }
  }

  /**
   * 쿠폰 상세 조회
   * @param {number} id - 쿠폰 ID
   */
  const getCoupon = async (id) => {
    const response = await get(`/admin/coupons/${id}`)
    return response.data
  }

  /**
   * 쿠폰 등록
   * @param {Object} data - 쿠폰 데이터
   */
  const createCoupon = async (data) => {
    const response = await post('/admin/coupons', data)
    return response.data
  }

  /**
   * 쿠폰 수정 (PATCH)
   * - 등록 상태: 모든 필드 수정 가능
   * - 발급중지 상태: name, description만 수정 가능
   * @param {number} id - 쿠폰 ID
   * @param {Object} data - 쿠폰 데이터
   */
  const updateCoupon = async (id, data) => {
    const response = await patch(`/admin/coupons/${id}`, data)
    return response.data
  }

  /**
   * 쿠폰 삭제
   * @param {number} id - 쿠폰 ID
   */
  const deleteCoupon = async (id) => {
    const response = await del(`/admin/coupons/${id}`)
    return response
  }

  /**
   * 쿠폰 발급 상태 변경
   * @param {number} id - 쿠폰 ID
   * @param {string} status - 변경할 상태 (ACTIVE, STOPPED, ENDED)
   */
  const updateCouponStatus = async (id, status) => {
    const response = await patch(`/admin/coupons/${id}/status`, { status })
    return response.data
  }

  /**
   * 미사용 쿠폰 회수 (RECALLED 처리)
   * @param {number} id - 쿠폰 ID
   */
  const recallCoupon = async (id) => {
    const response = await post(`/admin/coupons/${id}/recall`)
    return response.data
  }

  /**
   * 발급 상태에 따른 수정 가능 필드 확인
   * @param {string} status - 발급 상태
   * @returns {Object} - { allEditable, editableFields }
   */
  const getEditableFields = (status) => {
    // 등록: 전체 수정 가능
    if (status === 'REGISTERED') {
      return {
        allEditable: true,
        editableFields: null,
      }
    }
    // 발급중지: 쿠폰명, 설명만 수정 가능
    if (status === 'STOPPED') {
      return {
        allEditable: false,
        editableFields: ['name', 'description'],
      }
    }
    // 발급중, 종료: 수정 불가
    return {
      allEditable: false,
      editableFields: [],
    }
  }

  /**
   * 필드 수정 가능 여부 확인
   * @param {string} fieldName - 필드명
   * @param {string} status - 발급 상태
   * @returns {boolean}
   */
  const isFieldEditable = (fieldName, status) => {
    const { allEditable, editableFields } = getEditableFields(status)
    if (allEditable) return true
    if (!editableFields) return true
    return editableFields.includes(fieldName)
  }

  return {
    // Options
    couponTypeOptions,
    issuanceStatusOptions,
    discountMethodOptions,
    // API methods
    getCoupons,
    getCoupon,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    updateCouponStatus,
    recallCoupon,
    // Helpers
    getEditableFields,
    isFieldEditable,
    getDefaultNotes,
  }
}
