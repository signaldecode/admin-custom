/**
 * 할인 금액/비율 유효성 검증 유틸리티
 */

/**
 * 정액 할인 금액 검증 (최대 6자리, 999,999원)
 * @param {number|string} value - 할인 금액
 * @returns {boolean}
 */
export const validateDiscountAmount = (value) => {
  const num = Number(value)
  if (isNaN(num) || num < 0) return false
  return num <= 999999
}

/**
 * 정률 할인 비율 검증 (최대 2자리, 1~99%)
 * @param {number|string} value - 할인 비율
 * @returns {boolean}
 */
export const validateDiscountRate = (value) => {
  const num = Number(value)
  if (isNaN(num) || num < 0) return false
  return num <= 99
}

/**
 * 할인 값 검증 (타입에 따라 분기)
 * @param {string} type - 'AMOUNT' | 'RATE'
 * @param {number|string} value - 할인 값
 * @returns {{ valid: boolean, message: string }}
 */
export const validateDiscountValue = (type, value) => {
  const num = Number(value)

  if (isNaN(num) || num <= 0) {
    return {
      valid: false,
      message: type === 'RATE' ? '할인율을 입력해주세요.' : '할인 금액을 입력해주세요.',
    }
  }

  if (type === 'RATE') {
    if (num > 99) {
      return {
        valid: false,
        message: '할인율은 99%를 초과할 수 없습니다.',
      }
    }
  } else {
    if (num > 999999) {
      return {
        valid: false,
        message: '할인 금액은 999,999원을 초과할 수 없습니다.',
      }
    }
  }

  return { valid: true, message: '' }
}

/**
 * 입력값 제한 (input 이벤트에서 사용)
 * @param {string} type - 'AMOUNT' | 'RATE'
 * @param {number|string} value - 입력값
 * @returns {number} - 제한된 값
 */
export const clampDiscountValue = (type, value) => {
  const num = Number(value)
  if (isNaN(num) || num < 0) return 0

  if (type === 'RATE') {
    return Math.min(num, 99)
  }
  return Math.min(num, 999999)
}

/**
 * 금액 입력값 제한 (최대 20자리)
 * @param {number|string} value - 입력값
 * @param {number} maxLength - 최대 자릿수 (기본 20)
 * @returns {number} - 제한된 값
 */
export const clampAmountValue = (value, maxLength = 20) => {
  const str = String(value).replace(/[^0-9]/g, '')
  const trimmed = str.slice(0, maxLength)
  return Number(trimmed) || 0
}
