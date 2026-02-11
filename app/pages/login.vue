<script setup>
/**
 * Login Page
 * 관리자 로그인 페이지
 */
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'auth',
})

const authStore = useAuthStore()
const router = useRouter()

// 폼 데이터
const form = reactive({
  email: 'staff@test-shop.com',
  password: 'test1234',
})

// 폼 에러
const errors = reactive({
  email: '',
  password: '',
})

// 로딩 상태
const isLoading = ref(false)

// 일반 에러 메시지
const errorMessage = ref('')

// 폼 유효성 검사
const validate = () => {
  let isValid = true
  errors.email = ''
  errors.password = ''

  if (!form.email) {
    errors.email = '아이디를 입력해주세요.'
    isValid = false
  }

  if (!form.password) {
    errors.password = '비밀번호를 입력해주세요.'
    isValid = false
  }

  return isValid
}

// 로그인 처리
const handleSubmit = async () => {
  errorMessage.value = ''

  if (!validate()) return

  isLoading.value = true

  try {
    const result = await authStore.login({
      email: form.email,
      password: form.password,
    })

    if (result.success) {
      router.push('/admin')
    } else {
      errorMessage.value = result.error || '로그인에 실패했습니다.'
    }
  } catch (error) {
    errorMessage.value = '로그인 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div>
    <!-- Logo/Title -->
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold text-primary-700">Admin</h1>
      <p class="mt-2 text-neutral-600">관리자 계정으로 로그인해주세요.</p>
    </div>

    <!-- Login Card -->
    <UiCard padding="lg">
      <form @submit.prevent="handleSubmit">
        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg text-sm text-error-700"
          role="alert"
        >
          {{ errorMessage }}
        </div>

        <!-- ID -->
        <div class="mb-4">
          <UiInput
            v-model="form.email"
            type="text"
            label="아이디"
            placeholder="staff@test-shop.com"
            :error="errors.email"
            required
            autocomplete="username"
          />
        </div>

        <!-- Password -->
        <div class="mb-6">
          <UiInput
            v-model="form.password"
            type="password"
            label="비밀번호"
            placeholder="1234"
            :error="errors.password"
            required
            autocomplete="current-password"
          />
        </div>

        <!-- Test Account Info -->
        <div class="mb-4 p-3 bg-info-50 border border-info-200 rounded-lg text-sm text-info-700">
          <p class="font-medium">테스트 계정</p>
          <p>아이디: staff@test-shop.com / 비밀번호: test1234</p>
        </div>

        <!-- Submit Button -->
        <UiButton
          type="submit"
          variant="primary"
          size="lg"
          block
          :loading="isLoading"
        >
          로그인
        </UiButton>
      </form>
    </UiCard>

    <!-- Footer -->
    <p class="mt-6 text-center text-sm text-neutral-500">
      계정 문제가 있으신가요?
      <a
        href="#"
        class="text-primary-600 hover:text-primary-700"
      >
        관리자에게 문의
      </a>
    </p>
  </div>
</template>
