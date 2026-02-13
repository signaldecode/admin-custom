/**
 * API Proxy - 모든 /api/* 요청을 백엔드로 프록시
 * 서버 사이드에서 요청하므로 CORS 문제 없음
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const targetBase = config.public.apiBaseUrl

  // 요청 경로에서 /api 제거하고 쿼리스트링 분리
  const fullPath = event.path.replace(/^\/api/, '') || ''
  const questionIndex = fullPath.indexOf('?')
  const path = questionIndex > -1 ? fullPath.substring(0, questionIndex) : fullPath
  const queryString = questionIndex > -1 ? fullPath.substring(questionIndex + 1) : ''

  // 최종 URL 조합
  const targetUrl = queryString ? `${targetBase}${path}?${queryString}` : `${targetBase}${path}`

  const method = event.method

  // 요청 헤더
  const headers = {}

  // Content-Type 전달
  const contentType = getHeader(event, 'content-type')
  if (contentType) {
    headers['Content-Type'] = contentType
  }

  // 쿠키 전달
  const cookie = getHeader(event, 'cookie')
  if (cookie) {
    headers['Cookie'] = cookie
  }

  // 요청 옵션
  const fetchOptions = {
    method,
    headers,
  }

  // POST, PUT, PATCH, DELETE인 경우 body 전달
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    // FormData인 경우 스트림으로 전달
    if (contentType?.includes('multipart/form-data')) {
      fetchOptions.body = event.node.req
      fetchOptions.duplex = 'half'
    } else {
      const body = await readBody(event)
      if (body) {
        fetchOptions.body = JSON.stringify(body)
        headers['Content-Type'] = 'application/json'
      }
    }
  }

  console.log('[Proxy]', method, targetUrl)

  try {
    const response = await fetch(targetUrl, fetchOptions)

    // Set-Cookie 전달
    const setCookies = response.headers.getSetCookie?.() || []
    setCookies.forEach((cookie) => {
      appendResponseHeader(event, 'Set-Cookie', cookie)
    })

    // 응답 상태 코드 설정
    setResponseStatus(event, response.status)

    // 응답 Content-Type 전달
    const resContentType = response.headers.get('content-type')
    if (resContentType) {
      setResponseHeader(event, 'Content-Type', resContentType)
    }

    // 응답 body 처리
    const responseText = await response.text()

    // 빈 응답이면 빈 객체 반환
    if (!responseText) {
      return { success: true }
    }

    // JSON 응답 파싱
    if (resContentType?.includes('application/json')) {
      try {
        return JSON.parse(responseText)
      } catch {
        return { success: true, data: responseText }
      }
    }

    return responseText
  } catch (error) {
    console.error('[Proxy Error]', error.message)
    setResponseStatus(event, 500)
    return { error: error.message }
  }
})
