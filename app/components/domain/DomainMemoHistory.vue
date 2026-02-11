<script setup>
/**
 * Domain Memo History
 * 관리자 메모 히스토리 (댓글 형식)
 * - 메모 목록 표시 (작성자, 시간 포함)
 * - 새 메모 작성
 * - 메모 수정/삭제 (본인 작성만)
 */

const props = defineProps({
  // 메모 목록
  memos: {
    type: Array,
    default: () => [],
  },
  // 현재 로그인한 관리자 ID
  currentAdminId: {
    type: String,
    default: 'admin001',
  },
  // 현재 로그인한 관리자 이름
  currentAdminName: {
    type: String,
    default: '관리자',
  },
  // 저장 중 상태
  isSaving: {
    type: Boolean,
    default: false,
  },
  // placeholder
  placeholder: {
    type: String,
    default: '메모를 입력하세요...',
  },
})

const emit = defineEmits(['add', 'edit', 'delete'])

// 새 메모 입력
const newMemo = ref('')

// 수정 중인 메모
const editingMemoId = ref(null)
const editingContent = ref('')

// 메모 추가
const handleAddMemo = () => {
  const content = newMemo.value.trim()
  if (!content) return

  emit('add', {
    content,
    adminId: props.currentAdminId,
    adminName: props.currentAdminName,
  })

  newMemo.value = ''
}

// 수정 모드 시작
const startEdit = (memo) => {
  editingMemoId.value = memo.id
  editingContent.value = memo.content
}

// 수정 취소
const cancelEdit = () => {
  editingMemoId.value = null
  editingContent.value = ''
}

// 메모 수정 저장
const handleEditMemo = () => {
  const content = editingContent.value.trim()
  if (!content || !editingMemoId.value) return

  emit('edit', {
    id: editingMemoId.value,
    content,
  })

  editingMemoId.value = null
  editingContent.value = ''
}

// 메모 삭제
const handleDeleteMemo = (memoId) => {
  emit('delete', memoId)
}

// 날짜 포맷 (상대 시간)
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '방금 전'
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`

  // 7일 이상이면 날짜 표시
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 본인 작성 여부
const isOwnMemo = (memo) => {
  return memo.adminId === props.currentAdminId
}

// 수정 중인지 확인
const isEditing = (memoId) => {
  return editingMemoId.value === memoId
}
</script>

<template>
  <div>
    <!-- 메모 입력 -->
    <div class="mb-4">
      <div class="flex gap-3">
        <!-- 관리자 아바타 -->
        <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
          {{ currentAdminName.charAt(0) }}
        </div>
        <!-- 입력 영역 -->
        <div class="flex-1">
          <textarea
            v-model="newMemo"
            rows="2"
            :placeholder="placeholder"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            :disabled="isSaving"
            @keydown.ctrl.enter="handleAddMemo"
            @keydown.meta.enter="handleAddMemo"
          />
          <div class="flex items-center justify-between mt-2">
            <span class="text-xs text-neutral-400">Ctrl + Enter로 등록</span>
            <UiButton
              variant="primary"
              size="sm"
              :disabled="!newMemo.trim() || isSaving"
              @click="handleAddMemo"
            >
              <UiSpinner v-if="isSaving" size="sm" class="mr-1" />
              등록
            </UiButton>
          </div>
        </div>
      </div>
    </div>

    <!-- 구분선 -->
    <div v-if="memos.length > 0" class="border-t border-neutral-200 pt-4">
      <p class="text-sm text-neutral-500 mb-4">
        총 {{ memos.length }}개의 메모
      </p>
    </div>

    <!-- 메모 목록 -->
    <div v-if="memos.length > 0" class="space-y-4">
      <div
        v-for="memo in memos"
        :key="memo.id"
        class="flex gap-3"
      >
        <!-- 작성자 아바타 -->
        <div
          :class="[
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0',
            isOwnMemo(memo) ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-600',
          ]"
        >
          {{ memo.adminName.charAt(0) }}
        </div>

        <!-- 메모 내용 -->
        <div class="flex-1 min-w-0">
          <!-- 보기 모드 -->
          <template v-if="!isEditing(memo.id)">
            <div class="flex items-start justify-between gap-2">
              <div>
                <span class="text-sm font-medium text-neutral-900">{{ memo.adminName }}</span>
                <span class="text-xs text-neutral-400 ml-2">{{ formatRelativeTime(memo.createdAt) }}</span>
                <span v-if="memo.updatedAt && memo.updatedAt !== memo.createdAt" class="text-xs text-neutral-400 ml-1">(수정됨)</span>
              </div>
              <!-- 수정/삭제 버튼 (본인 작성만) -->
              <div v-if="isOwnMemo(memo)" class="flex items-center gap-1">
                <button
                  type="button"
                  class="text-neutral-400 hover:text-primary-500 transition-colors p-1"
                  title="수정"
                  @click="startEdit(memo)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="text-neutral-400 hover:text-error-500 transition-colors p-1"
                  title="삭제"
                  @click="handleDeleteMemo(memo.id)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <p class="text-sm text-neutral-700 mt-1 whitespace-pre-wrap break-words">
              {{ memo.content }}
            </p>
          </template>

          <!-- 수정 모드 -->
          <template v-else>
            <textarea
              v-model="editingContent"
              rows="3"
              class="w-full px-3 py-2 border border-primary-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              @keydown.ctrl.enter="handleEditMemo"
              @keydown.meta.enter="handleEditMemo"
              @keydown.escape="cancelEdit"
            />
            <div class="flex items-center justify-end gap-2 mt-2">
              <UiButton
                variant="ghost"
                size="xs"
                @click="cancelEdit"
              >
                취소
              </UiButton>
              <UiButton
                variant="primary"
                size="xs"
                :disabled="!editingContent.trim()"
                @click="handleEditMemo"
              >
                저장
              </UiButton>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-6">
      <svg class="w-12 h-12 mx-auto text-neutral-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <p class="text-sm text-neutral-400">아직 작성된 메모가 없습니다.</p>
    </div>
  </div>
</template>
