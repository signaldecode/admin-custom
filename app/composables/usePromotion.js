/**
 * usePromotion Composable
 * 프로모션/할인 관련 API
 */

import { useApi } from '~/composables/useApi'

export function usePromotion() {
  const { get, post, put, del } = useApi()

  /**
   * 프로모션 목록 조회
   * @param {Object} params - { keyword, categoryId, page, size }
   */
  const getPromotions = async (params = {}) => {
    const response = await get('/admin/promotions', params)
    return {
      content: response.data?.content || [],
      totalElements: response.data?.total_elements || 0,
      page: response.data?.page || 0,
      size: response.data?.size || 20,
    }
  }

  /**
   * 프로모션 상세 조회
   * @param {number} id - 프로모션 ID
   */
  const getPromotion = async (id) => {
    const response = await get(`/admin/promotions/${id}`)
    return response.data
  }

  /**
   * 프로모션 등록
   * @param {Object} data - { isActive, name, discountType, discountValue, applicableCategories, startedAt, endedAt }
   */
  const createPromotion = async (data) => {
    const response = await post('/admin/promotions', data)
    return response.data
  }

  /**
   * 프로모션 수정
   * @param {number} id - 프로모션 ID
   * @param {Object} data - { isActive, name, discountType, discountValue, applicableCategories, startedAt, endedAt }
   */
  const updatePromotion = async (id, data) => {
    const response = await put(`/admin/promotions/${id}`, data)
    return response.data
  }

  /**
   * 프로모션 삭제
   * @param {number} id - 프로모션 ID
   */
  const deletePromotion = async (id) => {
    const response = await del(`/admin/promotions/${id}`)
    return response
  }

  /**
   * 카테고리 목록 조회 (프로모션 적용 대상용)
   */
  const getCategories = async () => {
    try {
      const response = await get('/admin/categories')
      return response.data || []
    } catch (error) {
      return []
    }
  }

  /**
   * 날짜 포맷 변환 (ISO -> datetime-local)
   */
  const formatDateForInput = (isoString) => {
    if (!isoString) return ''
    return isoString.slice(0, 16)
  }

  /**
   * 날짜 포맷 변환 (datetime-local -> ISO)
   * YYYY-MM-DDTHH:mm:00 형식으로 반환
   */
  const formatDateForApi = (dateString) => {
    if (!dateString) return null
    // YYYY-MM-DDTHH:mm 까지만 잘라서 :00 추가
    return dateString.slice(0, 16) + ':00'
  }

  return {
    // API methods
    getPromotions,
    getPromotion,
    createPromotion,
    updatePromotion,
    deletePromotion,
    getCategories,
    // Helpers
    formatDateForInput,
    formatDateForApi,
  }
}
