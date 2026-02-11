/**
 * Date Formatter Utility
 * ISO 8601 형식의 날짜를 한글 포맷으로 변환
 */

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
