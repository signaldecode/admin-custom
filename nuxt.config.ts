// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  devtools: { enabled: true },

  // 로컬 개발 서버 설정
  devServer: {
    // HTTPS 활성화 (Safari 쿠키 문제 해결)
    // https: true,  // 필요시 주석 해제
  },

  // 모듈 설정
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vite-pwa/nuxt',
  ],

  // 앱 설정
  app: {
    head: {
      title: 'Admin',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
        { name: 'description', content: 'Admin Dashboard' },
        { name: 'theme-color', content: '#1e40af' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
      script: [
        { src: '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js', async: true },
      ],
    },
  },

  // CSS 설정
  css: ['~/assets/css/main.css'],

  // 런타임 설정 (환경변수 기반)
  runtimeConfig: {
    public: {
      // API 요청 경로 (프록시 사용)
      apiBase: '/api',
      // 백엔드 API URL (서버에서 프록시용)
      apiBaseUrl: process.env.API_BASE_URL,
      // Phase 1: 단일 서비스 식별자 (Phase 2에서 동적으로 변경 가능)
      defaultTenantId: process.env.NUXT_PUBLIC_DEFAULT_TENANT_ID || 'default',
    },
  },

  // Tailwind 설정
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.js',
  },

  // Pinia 설정
  pinia: {
    storesDirs: ['./app/stores/**'],
  },

  // PWA 설정
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Admin Dashboard',
      short_name: 'Admin',
      description: 'Admin Dashboard PWA',
      theme_color: '#1e40af',
      background_color: '#f8fafc',
      display: 'standalone',
      start_url: '/admin/orders',
      icons: [
        {
          src: '/icons/icon-192x192.svg',
          sizes: '192x192',
          type: 'image/svg+xml',
        },
        {
          src: '/icons/icon-512x512.svg',
          sizes: '512x512',
          type: 'image/svg+xml',
        },
      ],
    },
    workbox: {
      // 정적 자산만 캐싱 (API 캐싱 금지)
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      navigateFallback: null,
      // API 요청은 캐싱하지 않음
      runtimeCaching: [],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
      type: 'module',
    },
  },

  // 라우터 설정
  routeRules: {
    // 루트 접근 시 주문 목록으로 리다이렉트
    '/': { redirect: '/admin/orders' },
    // Admin 페이지는 CSR (인증 필요)
    '/admin/**': { ssr: false },
    '/login': { ssr: false },
  },

  // Nitro 설정
  nitro: {
    // 프록시는 server/api에서 처리
  },
})
