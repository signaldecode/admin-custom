/**
 * API Proxy - 모든 /api/* 요청을 백엔드로 프록시
 * 서버 사이드에서 요청하므로 CORS 문제 없음
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const targetBase = config.apiBaseUrl

  // 요청 경로 추출 (/api 이후 부분)
  const path = event.path.replace(/^\/api/, '') || ''

  // 쿼리스트링 포함
  const query = getQuery(event)
  const queryString = new URLSearchParams(query).toString()
  const targetUrl = queryString ? `${targetBase}${path}?${queryString}` : `${targetBase}${path}`

  // 요청 메서드
  const method = event.method

  // 요청 헤더
  const headers = {
    'Content-Type': 'application/json',
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
    const body = await readBody(event)
    if (body) {
      fetchOptions.body = JSON.stringify(body)
    }
  }

  console.log('[Proxy]', method, targetUrl)

  const response = await fetch(targetUrl, fetchOptions)

  // 응답 헤더에서 Set-Cookie 추출하여 클라이언트에 전달
  const setCookieHeader = response.headers.getSetCookie?.() || response.headers.get('set-cookie')
  if (setCookieHeader) {
    if (Array.isArray(setCookieHeader)) {
      setCookieHeader.forEach(cookie => {
        appendResponseHeader(event, 'Set-Cookie', cookie)
      })
    } else {
      appendResponseHeader(event, 'Set-Cookie', setCookieHeader)
    }
  }

  // 응답 상태 코드 설정
  setResponseStatus(event, response.status)

  // JSON 응답 반환
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return await response.json()
  }

  return await response.text()
})
