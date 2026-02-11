/**
 * Formatter Utilities
 * 날짜 및 금액 포맷팅 함수들
 */

/**
 * 금액을 한국 원화로 포맷팅합니다
 * @param {number} value - 포맷팅할 숫자
 * @returns {string} 포맷팅된 금액 (예: "1,234,567원")
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('ko-KR').format(value) + '원'
}

/**
 * 날짜를 포맷팅합니다
 * @param {string} dateString - ISO 8601 형식의 날짜 문자열 (예: "2026-01-20T14:01:42")
 * @param {string} format - 포맷 타입 ('short', 'long', 'date', 'time')
 * @returns {string} 포맷팅된 날짜 문자열
 */
export const formatDate = (dateString, format = 'long') => {
  if (!dateString) return '-'

  try {
    const date = new Date(dateString)

    // 유효한 날짜 확인
    if (isNaN(date.getTime())) {
      return '-'
    }

    switch (format) {
      // 짧은 형식: 01-20 14:01
      case 'short':
        return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

      // 긴 형식: 2026-01-20 14:01
      case 'long':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

      // 날짜만: 2026-01-20
      case 'date':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      // 시간만: 14:01
      case 'time':
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

      default:
        return date.toLocaleString('ko-KR')
    }
  } catch (error) {
    console.error('Date formatting error:', error)
    return '-'
  }
}

/**
 * 주소를 축약합니다 (모바일용)
 * @param {string} address - 주소 문자열
 * @param {number} maxLength - 최대 길이 (기본값: 20)
 * @returns {string} 축약된 주소
 */
export const truncateAddress = (address, maxLength = 20) => {
  if (!address || typeof address !== 'string') return '-'
  return address.length > maxLength ? address.slice(0, maxLength) + '...' : address
}
