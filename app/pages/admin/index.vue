<script setup>
/**
 * Admin Dashboard
 * 관리자 대시보드 메인 페이지
 */
import { useAuthStore } from '~/stores/auth'
import { formatCurrency, formatDate } from '~/utils/formatters'

const authStore = useAuthStore()
const { $api } = useNuxtApp()

// 로딩 & 에러 상태
const isLoading = ref(true)
const error = ref(null)

// 주문 현황 데이터
const orderStats = ref([
  { id: 'new', label: '신규주문', value: 0, color: 'primary', to: '/admin/orders?status=PAID' },
  { id: 'ready', label: '배송준비', value: 0, color: 'warning', to: '/admin/orders?status=PREPARING' },
  { id: 'shipping', label: '배송중', value: 0, color: 'info', to: '/admin/orders?status=SHIPPING' },
  { id: 'delivered', label: '배송완료', value: 0, color: 'success', to: '/admin/orders?status=DELIVERED' },
])

// 매출 현황 데이터
const salesStats = ref([
  { id: 'today', label: '오늘 매출', value: 0, change: '0%', changeType: 'positive' },
  { id: 'week', label: '이번주 매출', value: 0, change: '0%', changeType: 'positive' },
  { id: 'month', label: '이번달 매출', value: 0, change: '0%', changeType: 'positive' },
])

// 클레임 현황
const claimStats = ref([
  { id: 'exchangeRequested', label: '교환 대기', value: 0, color: 'info', to: '/admin/orders/claims?claimType=EXCHANGE&status=REQUESTED' },
  { id: 'returnRequested', label: '반품 대기', value: 0, color: 'warning', to: '/admin/orders/claims?claimType=RETURN&status=REQUESTED' },
  { id: 'inspectPending', label: '검수 대기', value: 0, color: 'primary', to: '/admin/orders/claims?status=APPROVED' },
  { id: 'cancelRequested', label: '환불 대기', value: 0, color: 'error', to: '/admin/orders/claims?claimType=CANCEL&status=REQUESTED' },
])

// 최근 주문
const recentOrders = ref([])

// 주문 상태 뱃지 매핑
const statusMap = {
  PENDING: { label: '결제대기', variant: 'neutral' },
  PAID: { label: '결제완료', variant: 'primary' },
  PREPARING: { label: '배송준비', variant: 'warning' },
  SHIPPING: { label: '배송중', variant: 'info' },
  DELIVERED: { label: '배송완료', variant: 'success' },
  CANCELLED: { label: '취소', variant: 'error' },
  REFUNDED: { label: '환불', variant: 'error' },
}

// 색상 클래스 매핑
const colorClasses = {
  primary: { bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-200' },
  success: { bg: 'bg-success-50', text: 'text-success-700', border: 'border-success-200' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-700', border: 'border-warning-200' },
  error: { bg: 'bg-error-50', text: 'text-error-700', border: 'border-error-200' },
  info: { bg: 'bg-info-50', text: 'text-info-700', border: 'border-info-200' },
}

// 대시보드 데이터 불러오기
const fetchDashboard = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await $api.get('/admin/dashboard')
    const data = response.data

    // 주문 현황 매핑
    if (data.orderStatus) {
      orderStats.value[0].value = data.orderStatus.newOrders || 0
      orderStats.value[1].value = data.orderStatus.preparing || 0
      orderStats.value[2].value = data.orderStatus.shipping || 0
      orderStats.value[3].value = data.orderStatus.completed || 0
    }

    // 매출 현황 매핑
    if (data.sales) {
      const mapSales = (salesData, index) => {
        if (salesData) {
          salesStats.value[index].value = salesData.amount || 0
          const rate = salesData.changeRate || 0
          salesStats.value[index].change = `${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%`
          salesStats.value[index].changeType = rate >= 0 ? 'positive' : 'negative'
        }
      }
      mapSales(data.sales.today, 0)
      mapSales(data.sales.week, 1)
      mapSales(data.sales.month, 2)
    }

    // 클레임 현황 매핑
    if (data.claims) {
      claimStats.value[0].value = data.claims.exchangeRequested || 0
      claimStats.value[1].value = data.claims.returnRequested || 0
      claimStats.value[2].value = data.claims.inspectPending || 0
      claimStats.value[3].value = data.claims.cancelRequested || 0
    }

    // 최근 주문 매핑
    if (data.recentOrders) {
      recentOrders.value = data.recentOrders.map((order) => ({
        id: order.orderId,
        orderNumber: order.orderNumber,
        customer: order.customerName,
        amount: order.amount,
        status: order.status,
        statusLabel: order.statusLabel,
        date: formatDate(order.createdAt),
      }))
    }
  } catch (err) {
    console.error('Dashboard fetch error:', err)
    error.value = err.data?.error?.message || err.data?.message || err.message || '대시보드 데이터를 불러오는데 실패했습니다.'
  } finally {
    isLoading.value = false
  }
}

// 주문번호 검색
const router = useRouter()
const searchOrderNo = ref('')

const handleOrderSearch = () => {
  const keyword = searchOrderNo.value.trim()
  if (!keyword) return

  router.push({
    path: '/admin/orders',
    query: { keyword, searchType: 'ORDER_NUMBER' },
  })
}

// 마운트 시 데이터 불러오기
onMounted(() => {
  fetchDashboard()
})
</script>

<template>
  <LayoutDetailPage>
    <!-- Page Header -->
    <div class="mb-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-neutral-900">대시보드</h1>
          <p class="mt-1 text-neutral-600">
            안녕하세요, {{ authStore.userName || '관리자' }}님.
          </p>
        </div>
        <!-- 주문번호 검색 -->
        <div class="flex gap-2">
          <input
            v-model="searchOrderNo"
            type="text"
            placeholder="주문번호로 검색"
            class="w-48 md:w-56 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            @keyup.enter="handleOrderSearch"
          >
          <UiButton variant="primary" size="sm" @click="handleOrderSearch">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </UiButton>
        </div>
      </div>
    </div>

    <!-- 로딩 -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <UiSpinner size="lg" />
    </div>

    <!-- 에러 -->
    <div v-else-if="error" class="text-center py-20">
      <p class="text-error-600 mb-4">{{ error }}</p>
      <UiButton variant="outline" @click="fetchDashboard">다시 시도</UiButton>
    </div>

    <!-- 대시보드 콘텐츠 -->
    <template v-else>
      <!-- 주문 현황 -->
      <section class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-neutral-900">주문 현황</h2>
          <NuxtLink
            to="/admin/orders"
            class="text-sm text-primary-600 hover:text-primary-700"
          >
            주문목록 →
          </NuxtLink>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <NuxtLink
            v-for="stat in orderStats"
            :key="stat.id"
            :to="stat.to"
            :class="[
              'block p-4 rounded-lg border transition-all hover:shadow-md',
              colorClasses[stat.color].bg,
              colorClasses[stat.color].border,
            ]"
          >
            <p :class="['text-sm', colorClasses[stat.color].text]">{{ stat.label }}</p>
            <p :class="['text-3xl font-bold mt-1', colorClasses[stat.color].text]">
              {{ stat.value }}
            </p>
          </NuxtLink>
        </div>
      </section>

      <!-- 매출 현황 -->
      <section class="mb-6">
        <h2 class="text-lg font-semibold text-neutral-900 mb-3">매출 현황</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <UiCard
            v-for="stat in salesStats"
            :key="stat.id"
            padding="md"
          >
            <p class="text-sm text-neutral-500">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-neutral-900 mt-1">
              {{ formatCurrency(stat.value) }}
            </p>
            <p
              :class="[
                'text-sm font-medium mt-1',
                stat.changeType === 'positive' ? 'text-success-600' : 'text-error-600',
              ]"
            >
              {{ stat.change }} vs 이전 기간
            </p>
          </UiCard>
        </div>
      </section>

      <!-- 교환/반품/취소 현황 -->
      <section class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-neutral-900">클레임 관리</h2>
          <NuxtLink
            to="/admin/orders/claims"
            class="text-sm text-primary-600 hover:text-primary-700"
          >
            전체 보기 →
          </NuxtLink>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <NuxtLink
            v-for="stat in claimStats"
            :key="stat.id"
            :to="stat.to"
            :class="[
              'block p-4 rounded-lg border transition-all hover:shadow-md text-center',
              colorClasses[stat.color].bg,
              colorClasses[stat.color].border,
            ]"
          >
            <p :class="['text-sm', colorClasses[stat.color].text]">{{ stat.label }}</p>
            <p :class="['text-3xl font-bold mt-1', colorClasses[stat.color].text]">
              {{ stat.value }}
            </p>
          </NuxtLink>
        </div>
      </section>

      <!-- 최근 주문 -->
      <section>
        <UiCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-neutral-900">최근 주문</h2>
              <NuxtLink
                to="/admin/orders"
                class="text-sm text-primary-600 hover:text-primary-700"
              >
                주문목록 →
              </NuxtLink>
            </div>
          </template>

          <!-- Empty State -->
          <UiEmpty v-if="recentOrders.length === 0" message="최근 주문이 없습니다." />

          <!-- Desktop Table -->
          <div v-else class="hidden md:block overflow-x-auto -mx-4 md:-mx-6">
            <table class="w-full">
              <thead>
                <tr class="border-b border-neutral-200">
                  <th class="text-left py-3 px-4 md:px-6 text-sm font-medium text-neutral-500">주문번호</th>
                  <th class="text-left py-3 px-4 text-sm font-medium text-neutral-500">고객명</th>
                  <th class="text-right py-3 px-4 text-sm font-medium text-neutral-500">금액</th>
                  <th class="text-center py-3 px-4 text-sm font-medium text-neutral-500">상태</th>
                  <th class="text-left py-3 px-4 md:px-6 text-sm font-medium text-neutral-500">일시</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="order in recentOrders"
                  :key="order.id"
                  class="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer"
                  @click="$router.push(`/admin/orders/${order.id.replace('#', '')}`)"
                >
                  <td class="py-3 px-4 md:px-6 text-sm font-medium text-primary-600">{{ order.id }}</td>
                  <td class="py-3 px-4 text-sm text-neutral-700">{{ order.customer }}</td>
                  <td class="py-3 px-4 text-sm text-neutral-900 text-right font-medium">
                    {{ formatCurrency(order.amount) }}
                  </td>
                  <td class="py-3 px-4 text-center">
                    <UiBadge
                      :variant="statusMap[order.status]?.variant || 'neutral'"
                      size="sm"
                    >
                      {{ order.statusLabel || statusMap[order.status]?.label || order.status }}
                    </UiBadge>
                  </td>
                  <td class="py-3 px-4 md:px-6 text-sm text-neutral-500">{{ order.date }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div v-if="recentOrders.length > 0" class="md:hidden space-y-3 -mx-4">
            <div
              v-for="order in recentOrders"
              :key="order.id"
              class="px-4 py-3 border-b border-neutral-100 last:border-0"
              @click="$router.push(`/admin/orders/${order.id.replace('#', '')}`)"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium text-primary-600">{{ order.id }}</span>
                <UiBadge
                  :variant="statusMap[order.status]?.variant || 'neutral'"
                  size="sm"
                >
                  {{ order.statusLabel || statusMap[order.status]?.label || order.status }}
                </UiBadge>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-neutral-600">{{ order.customer }}</span>
                <span class="text-sm font-medium text-neutral-900">{{ formatCurrency(order.amount) }}</span>
              </div>
              <p class="text-xs text-neutral-500 mt-1">{{ order.date }}</p>
            </div>
          </div>

          <template v-if="recentOrders.length > 0" #footer>
            <div class="text-center">
              <NuxtLink
                to="/admin/orders"
                class="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                주문 목록 전체 보기
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </NuxtLink>
            </div>
          </template>
        </UiCard>
      </section>
    </template>
  </LayoutDetailPage>
</template>
