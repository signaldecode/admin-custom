/**
 * API Plugin
 * API 호출 유틸리티를 전역으로 제공
 * - HttpOnly Cookie 기반 인증 (credentials: include)
 * - 401 에러 시 자동 토큰 갱신 (refresh token)
 */

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBase

  // 토큰 갱신 중 플래그 (중복 갱신 방지)
  let isRefreshing = false
  // 갱신 대기 중인 요청들
  let pendingRequests = []

  /**
   * 토큰 갱신
   */
  const refreshToken = async () => {
    try {
      await $fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 401 에러 처리 및 재시도
   */
  const handleUnauthorized = async (requestFn) => {
    // 이미 갱신 중이면 대기
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({ resolve, reject, requestFn })
      })
    }

    isRefreshing = true

    try {
      const refreshed = await refreshToken()

      if (refreshed) {
        // 갱신 성공: 대기 중인 요청들 재시도
        pendingRequests.forEach(({ resolve, requestFn }) => {
          resolve(requestFn())
        })
        pendingRequests = []

        // 원래 요청 재시도
        return await requestFn()
      } else {
        // 갱신 실패: 로그인 페이지로 이동
        pendingRequests.forEach(({ reject }) => {
          reject(new Error('Session expired'))
        })
        pendingRequests = []

        // 로그인 페이지로 이동
        const router = useRouter()
        router.push('/login')
        throw new Error('Session expired')
      }
    } finally {
      isRefreshing = false
    }
  }

  /**
   * 요청 래퍼 (401 시 자동 갱신)
   */
  const requestWithRetry = async (requestFn, skipRefresh = false) => {
    try {
      return await requestFn()
    } catch (error) {
      // 401 에러이고, refresh 요청이 아니면 토큰 갱신 시도
      if ((error.status === 401 || error.statusCode === 401) && !skipRefresh) {
        return await handleUnauthorized(requestFn)
      }
      throw error
    }
  }

  /**
   * API 요청 헬퍼
   */
  const api = {
    /**
     * GET 요청
     */
    async get(endpoint, params = {}) {
      const searchParams = new URLSearchParams()

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value)
        }
      })

      const queryString = searchParams.toString()
      const url = `${baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`

      const requestFn = () => $fetch(url, {
        method: 'GET',
        credentials: 'include',
      })

      // /auth/refresh, /auth/login 등은 refresh 시도 안함
      const skipRefresh = endpoint.startsWith('/auth/')
      return await requestWithRetry(requestFn, skipRefresh)
    },

    /**
     * POST 요청
     */
    async post(endpoint, body = {}) {
      const requestFn = () => $fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        body,
      })

      const skipRefresh = endpoint.startsWith('/auth/')
      return await requestWithRetry(requestFn, skipRefresh)
    },

    /**
     * PUT 요청
     */
    async put(endpoint, body = {}) {
      const requestFn = () => $fetch(`${baseUrl}${endpoint}`, {
        method: 'PUT',
        credentials: 'include',
        body,
      })

      return await requestWithRetry(requestFn)
    },

    /**
     * PATCH 요청
     */
    async patch(endpoint, body = {}) {
      const requestFn = () => $fetch(`${baseUrl}${endpoint}`, {
        method: 'PATCH',
        credentials: 'include',
        body,
      })

      return await requestWithRetry(requestFn)
    },

    /**
     * DELETE 요청
     */
    async delete(endpoint, body = {}) {
      const requestFn = () => $fetch(`${baseUrl}${endpoint}`, {
        method: 'DELETE',
        credentials: 'include',
        body,
      })

      return await requestWithRetry(requestFn)
    },

    /**
     * POST FormData 요청 (multipart/form-data)
     */
    async postFormData(endpoint, formData) {
      const requestFn = () => $fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      return await requestWithRetry(requestFn)
    },

    /**
     * PATCH FormData 요청 (multipart/form-data)
     */
    async patchFormData(endpoint, formData) {
      const requestFn = () => $fetch(`${baseUrl}${endpoint}`, {
        method: 'PATCH',
        credentials: 'include',
        body: formData,
      })

      return await requestWithRetry(requestFn)
    },

    /**
     * PUT FormData 요청 (multipart/form-data)
     */
    async putFormData(endpoint, formData) {
      const requestFn = () => $fetch(`${baseUrl}${endpoint}`, {
        method: 'PUT',
        credentials: 'include',
        body: formData,
      })

      return await requestWithRetry(requestFn)
    },
  }

  return {
    provide: {
      api,
    },
  }
})
