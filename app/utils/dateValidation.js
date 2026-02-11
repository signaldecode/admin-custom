/**
 * 날짜/시간 유효성 검증 유틸
 */

/**
 * 시작일시 기본 시간 설정 (00:00:00)
 * @param {string} dateTimeValue - datetime-local 값 (YYYY-MM-DDTHH:MM)
 * @returns {string} 시간이 00:00으로 설정된 값
 */
export const setStartTime = (dateTimeValue) => {
  if (!dateTimeValue) return ''
  const datePart = dateTimeValue.slice(0, 10)
  return `${datePart}T00:00`
}

/**
 * 종료일시 기본 시간 설정 (23:59:00)
 * @param {string} dateTimeValue - datetime-local 값 (YYYY-MM-DDTHH:MM)
 * @returns {string} 시간이 23:59으로 설정된 값
 */
export const setEndTime = (dateTimeValue) => {
  if (!dateTimeValue) return ''
  const datePart = dateTimeValue.slice(0, 10)
  return `${datePart}T23:59`
}

/**
 * 종료일시가 시작일시보다 앞인지 검증
 * @param {string} startDate - 시작일시 (YYYY-MM-DDTHH:MM)
 * @param {string} endDate - 종료일시 (YYYY-MM-DDTHH:MM)
 * @returns {{ valid: boolean, message: string }}
 */
export const validateDateRange = (startDate, endDate) => {
  if (!startDate) {
    return { valid: false, message: '시작일시를 입력해주세요.' }
  }

  if (!endDate) {
    return { valid: true, message: '' }
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (end < start) {
    return { valid: false, message: '종료일시는 시작일시보다 이후여야 합니다.' }
  }

  return { valid: true, message: '' }
}

/**
 * 오늘 날짜의 시작 시간 (00:00) 반환
 * @returns {string} YYYY-MM-DDTHH:MM 형식
 */
export const getTodayStart = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}T00:00`
}

/**
 * 오늘 날짜의 종료 시간 (23:59) 반환
 * @returns {string} YYYY-MM-DDTHH:MM 형식
 */
export const getTodayEnd = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}T23:59`
}
