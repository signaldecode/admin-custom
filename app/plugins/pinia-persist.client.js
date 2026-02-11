/**
 * Pinia Persisted State Plugin
 * 스토어 상태를 localStorage에 저장하여 새로고침 시에도 유지
 * .client.js - 클라이언트에서만 실행 (SSR 제외)
 */
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.$pinia.use(piniaPluginPersistedstate)
})
