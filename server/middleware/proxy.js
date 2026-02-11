/**
 * API 프록시 미들웨어
 * - /api/** 요청을 백엔드로 프록시
 * - 쿠키 양방향 전달 (Safari 호환)
 */

export default defineEventHandler(async (event) => {
  const path = event.path

  // /api로 시작하는 요청만 처리
  if (!path.startsWith('/api')) {
    return
  }

  const targetBase = process.env.API_BASE_URL || 'https://api-admin.sigdec.click/api/v1'
  const targetPath = path.replace(/^\/api/, '')
  const targetUrl = `${targetBase}${targetPath}`
  const method = event.method

  console.log('[Proxy]', method, targetUrl)

  // 요청 헤더 복사
  const reqHeaders = getHeaders(event)
  const headers = {}

  // 필요한 헤더만 전달
  if (reqHeaders['content-type']) headers['content-type'] = reqHeaders['content-type']
  if (reqHeaders['content-length']) headers['content-length'] = reqHeaders['content-length']
  if (reqHeaders.accept) headers.accept = reqHeaders.accept
  if (reqHeaders.cookie) headers.cookie = reqHeaders.cookie

  try {
    // 요청 바디 스트림으로 전달
    const response = await fetch(targetUrl, {
      method,
      headers,
      body: ['GET', 'HEAD'].includes(method) ? undefined : event.node.req,
      duplex: 'half',
    })

    // Set-Cookie 전달 (백엔드 → 브라우저)
    const setCookies = response.headers.getSetCookie?.() || []
    const isDev = process.env.NODE_ENV === 'development'

    setCookies.forEach((cookie) => {
      let modifiedCookie = cookie
        .replace(/Path=\/api\/v1/gi, 'Path=/api')
        .replace(/;\s*Domain=[^;]*/gi, '')

      if (isDev) {
        modifiedCookie = modifiedCookie
          .replace(/;\s*Secure/gi, '')
          .replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
      }

      appendResponseHeader(event, 'set-cookie', modifiedCookie)
    })

    // 응답 상태 설정
    setResponseStatus(event, response.status)

    // 응답 헤더 전달 (content-type 등)
    const resContentType = response.headers.get('content-type')
    if (resContentType) {
      setResponseHeader(event, 'content-type', resContentType)
    }

    // 응답 바디 반환
    if (resContentType?.includes('application/json')) {
      return await response.json()
    } else {
      // 이미지 등 바이너리 응답
      return await response.arrayBuffer()
    }
  } catch (error) {
    console.error('[Proxy Error]', error.message)
    setResponseStatus(event, 500)
    return { error: error.message }
  }
})
