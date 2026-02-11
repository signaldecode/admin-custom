/**
 * useReview Composable
 * 리뷰 관련 API
 */

import { useApi } from '~/composables/useApi'

export function useReview() {
  const { get, del, patch } = useApi()

  /**
   * 리뷰 목록 조회
   * @param {Object} params - { keyword, rating, page, size }
   */
  const getReviews = async (params = {}) => {
    const response = await get('/admin/reviews', params)
    return {
      content: response.data?.content || [],
      totalElements: response.data?.total_elements || 0,
      page: response.data?.page || 0,
      size: response.data?.size || 20,
    }
  }

  /**
   * 리뷰 상세 조회
   * @param {number} id - 리뷰 ID
   */
  const getReview = async (id) => {
    const response = await get(`/admin/reviews/${id}`)
    return response.data
  }

  /**
   * 리뷰 삭제
   * @param {number} id - 리뷰 ID
   */
  const deleteReview = async (id) => {
    const response = await del(`/admin/reviews/${id}`)
    return response
  }

  /**
   * 리뷰 일괄 삭제
   * @param {number[]} ids - 리뷰 ID 배열
   */
  const deleteReviews = async (ids) => {
    const response = await del('/admin/reviews', { ids })
    return response
  }

  /**
   * 리뷰 활성화/비활성화 토글
   * @param {number[]} reviewIds - 리뷰 ID 배열
   */
  const toggleVisibility = async (reviewIds) => {
    const response = await patch('/admin/reviews/visibility', { reviewIds })
    return response
  }

  return {
    getReviews,
    getReview,
    deleteReview,
    deleteReviews,
    toggleVisibility,
  }
}
