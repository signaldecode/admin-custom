/**
 * useApi Composable
 * API 호출을 위한 래퍼
 * - credentials: 'include' 자동 적용 (HttpOnly Cookie)
 * - tenant 헤더 자동 추가
 * - 에러 처리 통합
 * - 401 시 자동 로그아웃
 */

/**
 * API 에러 클래스
 */
class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/**
 * API 호출 composable
 */
export function useApi() {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBase

  /**
   * 기본 fetch 래퍼
   * @param {string} endpoint - API 엔드포인트
   * @param {Object} options - fetch 옵션
   */
  const request = async (endpoint, options = {}) => {
    const url = `${baseUrl}${endpoint}`

    // 테넌트 헤더 가져오기
    const tenantStore = useTenantStore()
    const tenantHeaders = tenantStore.tenantHeader

    // 기본 옵션
    const defaultOptions = {
      credentials: 'include', // HttpOnly Cookie 전송
      headers: {
        'Content-Type': 'application/json',
        ...tenantHeaders,
        ...options.headers,
      },
    }

    const fetchOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    }

    // body가 있으면 JSON 직렬화
    if (options.body && typeof options.body === 'object') {
      fetchOptions.body = JSON.stringify(options.body)
    }

    try {
      const response = await fetch(url, fetchOptions)

      // 응답 처리
      let data = null

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      }

      // 에러 응답 처리
      if (!response.ok) {
        // 401 Unauthorized → 로그아웃
        if (response.status === 401) {
          const authStore = useAuthStore()
          authStore.reset()

          // 로그인 페이지가 아니면 리다이렉트
          const route = useRoute()
          if (route.path !== '/login') {
            const router = useRouter()
            router.push('/login')
          }
        }

        throw new ApiError(
          data?.message || getDefaultErrorMessage(response.status),
          response.status,
          data
        )
      }

      return data
    } catch (error) {
      // ApiError가 아닌 경우 (네트워크 에러 등)
      if (!(error instanceof ApiError)) {
        throw new ApiError(
          '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          0,
          null
        )
      }
      throw error
    }
  }

  /**
   * GET 요청
   */
  const get = (endpoint, params = {}) => {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value)
      }
    })

    const queryString = searchParams.toString()
    const url = queryString ? `${endpoint}?${queryString}` : endpoint

    return request(url, { method: 'GET' })
  }

  /**
   * POST 요청
   */
  const post = (endpoint, body = {}) => {
    return request(endpoint, { method: 'POST', body })
  }

  /**
   * PUT 요청
   */
  const put = (endpoint, body = {}) => {
    return request(endpoint, { method: 'PUT', body })
  }

  /**
   * PATCH 요청
   */
  const patch = (endpoint, body = {}) => {
    return request(endpoint, { method: 'PATCH', body })
  }

  /**
   * DELETE 요청
   */
  const del = (endpoint, body = {}) => {
    return request(endpoint, { method: 'DELETE', body })
  }

  return {
    request,
    get,
    post,
    put,
    patch,
    del,
    ApiError,
  }
}

/**
 * 상태 코드별 기본 에러 메시지
 */
function getDefaultErrorMessage(status) {
  const messages = {
    400: '잘못된 요청입니다.',
    401: '인증이 필요합니다.',
    403: '접근 권한이 없습니다.',
    404: '요청한 리소스를 찾을 수 없습니다.',
    409: '요청이 충돌했습니다.',
    422: '입력값을 확인해주세요.',
    429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    500: '서버 오류가 발생했습니다.',
    502: '서버에 연결할 수 없습니다.',
    503: '서비스를 일시적으로 사용할 수 없습니다.',
  }

  return messages[status] || '오류가 발생했습니다.'
}

// Store imports (lazy)
function useAuthStore() {
  const pinia = useNuxtApp().$pinia
  if (pinia.state.value.auth) {
    return pinia._s.get('auth')
  }
  return { reset: () => {} }
}

function useTenantStore() {
  const pinia = useNuxtApp().$pinia
  if (pinia.state.value.tenant) {
    return pinia._s.get('tenant')
  }
  return { tenantHeader: {} }
}
