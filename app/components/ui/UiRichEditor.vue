<script setup>
/**
 * Rich Text Editor (WYSIWYG)
 * TipTap 기반 상품 상세페이지 에디터
 * - 텍스트 포맷팅 (굵게, 기울임, 밑줄, 취소선)
 * - 제목 (H1~H3)
 * - 리스트 (순서/비순서)
 * - 정렬 (좌/중/우)
 * - 이미지 업로드
 * - 링크
 */

import { useUiStore } from '~/stores/ui'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '상품 상세 내용을 입력하세요...',
  },
  minHeight: {
    type: String,
    default: '400px',
  },
})

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Image.configure({
      inline: false,
      allowBase64: false,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Underline,
    Placeholder.configure({
      placeholder: props.placeholder,
    }),
    Link.configure({
      openOnClick: false,
    }),
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
})

// 이미지 업로드 핸들러
const imageInputRef = ref(null)
const isUploading = ref(false)

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const handleImageUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  // 파일 유효성 검사
  if (!ALLOWED_TYPES.includes(file.type)) {
    const uiStore = useUiStore()
    uiStore.showToast({ type: 'error', message: '허용되지 않는 파일 형식입니다. (JPEG, PNG, GIF, WebP만 허용)' })
    event.target.value = ''
    return
  }

  if (file.size > MAX_FILE_SIZE) {
    const uiStore = useUiStore()
    uiStore.showToast({ type: 'error', message: '파일 크기가 10MB를 초과합니다.' })
    event.target.value = ''
    return
  }

  isUploading.value = true

  try {
    const { $api } = useNuxtApp()
    const formData = new FormData()
    formData.append('file', file)

    const response = await $api.postFormData('/admin/images', formData)
    const imageUrl = response.data?.url

    if (imageUrl && editor.value) {
      editor.value
        .chain()
        .focus()
        .insertContent({
          type: 'image',
          attrs: { src: imageUrl },
        })
        .createParagraphNear()
        .run()
    }
  } catch (err) {
    const uiStore = useUiStore()
    uiStore.showToast({
      type: 'error',
      message: err.data?.error?.message || '이미지 업로드에 실패했습니다.',
    })
  } finally {
    isUploading.value = false
    event.target.value = ''
  }
}

const triggerImageUpload = () => {
  if (isUploading.value) return
  imageInputRef.value?.click()
}

// 링크 추가
const addLink = () => {
  const url = window.prompt('링크 URL을 입력하세요:')
  if (url && editor.value) {
    editor.value.chain().focus().setLink({ href: url }).run()
  }
}

// 링크 제거
const removeLink = () => {
  if (editor.value) {
    editor.value.chain().focus().unsetLink().run()
  }
}

// 툴바 버튼 정의
const toolbarGroups = computed(() => {
  if (!editor.value) return []

  return [
    // 텍스트 스타일
    {
      id: 'text-style',
      buttons: [
        {
          icon: 'bold',
          title: '굵게',
          action: () => editor.value.chain().focus().toggleBold().run(),
          isActive: editor.value.isActive('bold'),
        },
        {
          icon: 'italic',
          title: '기울임',
          action: () => editor.value.chain().focus().toggleItalic().run(),
          isActive: editor.value.isActive('italic'),
        },
        {
          icon: 'underline',
          title: '밑줄',
          action: () => editor.value.chain().focus().toggleUnderline().run(),
          isActive: editor.value.isActive('underline'),
        },
        {
          icon: 'strikethrough',
          title: '취소선',
          action: () => editor.value.chain().focus().toggleStrike().run(),
          isActive: editor.value.isActive('strike'),
        },
      ],
    },
    // 제목
    {
      id: 'headings',
      buttons: [
        {
          icon: 'h1',
          title: '제목 1',
          action: () => editor.value.chain().focus().toggleHeading({ level: 1 }).run(),
          isActive: editor.value.isActive('heading', { level: 1 }),
        },
        {
          icon: 'h2',
          title: '제목 2',
          action: () => editor.value.chain().focus().toggleHeading({ level: 2 }).run(),
          isActive: editor.value.isActive('heading', { level: 2 }),
        },
        {
          icon: 'h3',
          title: '제목 3',
          action: () => editor.value.chain().focus().toggleHeading({ level: 3 }).run(),
          isActive: editor.value.isActive('heading', { level: 3 }),
        },
      ],
    },
    // 리스트
    {
      id: 'lists',
      buttons: [
        {
          icon: 'list-ul',
          title: '글머리 기호',
          action: () => editor.value.chain().focus().toggleBulletList().run(),
          isActive: editor.value.isActive('bulletList'),
        },
        {
          icon: 'list-ol',
          title: '번호 매기기',
          action: () => editor.value.chain().focus().toggleOrderedList().run(),
          isActive: editor.value.isActive('orderedList'),
        },
      ],
    },
    // 정렬
    {
      id: 'align',
      buttons: [
        {
          icon: 'align-left',
          title: '왼쪽 정렬',
          action: () => editor.value.chain().focus().setTextAlign('left').run(),
          isActive: editor.value.isActive({ textAlign: 'left' }),
        },
        {
          icon: 'align-center',
          title: '가운데 정렬',
          action: () => editor.value.chain().focus().setTextAlign('center').run(),
          isActive: editor.value.isActive({ textAlign: 'center' }),
        },
        {
          icon: 'align-right',
          title: '오른쪽 정렬',
          action: () => editor.value.chain().focus().setTextAlign('right').run(),
          isActive: editor.value.isActive({ textAlign: 'right' }),
        },
      ],
    },
    // 미디어/링크
    {
      id: 'media',
      buttons: [
        {
          icon: 'image',
          title: isUploading.value ? '업로드 중...' : '이미지',
          action: triggerImageUpload,
          isActive: false,
          disabled: isUploading.value,
        },
        {
          icon: 'link',
          title: '링크',
          action: addLink,
          isActive: editor.value.isActive('link'),
        },
        {
          icon: 'unlink',
          title: '링크 해제',
          action: removeLink,
          isActive: false,
          disabled: !editor.value.isActive('link'),
        },
      ],
    },
    // 기타
    {
      id: 'misc',
      buttons: [
        {
          icon: 'horizontal-rule',
          title: '구분선',
          action: () => editor.value.chain().focus().setHorizontalRule().run(),
          isActive: false,
        },
        {
          icon: 'undo',
          title: '실행 취소',
          action: () => editor.value.chain().focus().undo().run(),
          isActive: false,
          disabled: !editor.value.can().undo(),
        },
        {
          icon: 'redo',
          title: '다시 실행',
          action: () => editor.value.chain().focus().redo().run(),
          isActive: false,
          disabled: !editor.value.can().redo(),
        },
      ],
    },
  ]
})

// modelValue 동기화
watch(
  () => props.modelValue,
  (newValue) => {
    if (editor.value && newValue !== editor.value.getHTML()) {
      editor.value.commands.setContent(newValue, false)
    }
  }
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="ui-rich-editor border border-neutral-300 rounded-lg overflow-hidden">
    <!-- 숨겨진 이미지 input -->
    <input
      ref="imageInputRef"
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp"
      class="hidden"
      @change="handleImageUpload"
    >

    <!-- 툴바 -->
    <div v-if="editor" class="flex flex-wrap items-center gap-1 p-2 border-b border-neutral-200 bg-neutral-50">
      <template v-for="group in toolbarGroups" :key="group.id">
        <div class="flex items-center gap-0.5">
          <button
            v-for="btn in group.buttons"
            :key="btn.icon"
            type="button"
            :title="btn.title"
            :disabled="btn.disabled"
            :class="[
              'p-1.5 rounded transition-colors',
              btn.isActive
                ? 'bg-primary-100 text-primary-700'
                : btn.disabled
                  ? 'text-neutral-300 cursor-not-allowed'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
            ]"
            @click="btn.action"
          >
            <!-- Bold -->
            <svg v-if="btn.icon === 'bold'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
            </svg>
            <!-- Italic -->
            <svg v-else-if="btn.icon === 'italic'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 4h4m-2 16h-4m6-16l-4 16" />
            </svg>
            <!-- Underline -->
            <svg v-else-if="btn.icon === 'underline'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v7a5 5 0 0010 0V4M5 20h14" />
            </svg>
            <!-- Strikethrough -->
            <svg v-else-if="btn.icon === 'strikethrough'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 8h6M9 16h3m5-4H7" />
            </svg>
            <!-- H1 -->
            <span v-else-if="btn.icon === 'h1'" class="text-xs font-bold">H1</span>
            <!-- H2 -->
            <span v-else-if="btn.icon === 'h2'" class="text-xs font-bold">H2</span>
            <!-- H3 -->
            <span v-else-if="btn.icon === 'h3'" class="text-xs font-bold">H3</span>
            <!-- List UL -->
            <svg v-else-if="btn.icon === 'list-ul'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <circle cx="2" cy="6" r="1" fill="currentColor" />
              <circle cx="2" cy="12" r="1" fill="currentColor" />
              <circle cx="2" cy="18" r="1" fill="currentColor" />
            </svg>
            <!-- List OL -->
            <svg v-else-if="btn.icon === 'list-ol'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 6h13M7 12h13M7 18h13" />
              <text x="1" y="8" font-size="6" fill="currentColor">1</text>
              <text x="1" y="14" font-size="6" fill="currentColor">2</text>
              <text x="1" y="20" font-size="6" fill="currentColor">3</text>
            </svg>
            <!-- Align Left -->
            <svg v-else-if="btn.icon === 'align-left'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h10M4 18h14" />
            </svg>
            <!-- Align Center -->
            <svg v-else-if="btn.icon === 'align-center'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M7 12h10M5 18h14" />
            </svg>
            <!-- Align Right -->
            <svg v-else-if="btn.icon === 'align-right'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M10 12h10M6 18h14" />
            </svg>
            <!-- Image -->
            <svg v-else-if="btn.icon === 'image'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <!-- Link -->
            <svg v-else-if="btn.icon === 'link'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <!-- Unlink -->
            <svg v-else-if="btn.icon === 'unlink'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1M3 3l18 18" />
            </svg>
            <!-- Horizontal Rule -->
            <svg v-else-if="btn.icon === 'horizontal-rule'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14" />
            </svg>
            <!-- Undo -->
            <svg v-else-if="btn.icon === 'undo'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
            </svg>
            <!-- Redo -->
            <svg v-else-if="btn.icon === 'redo'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
            </svg>
          </button>
        </div>
        <div class="w-px h-5 bg-neutral-200 mx-1" />
      </template>
    </div>

    <!-- 에디터 영역 -->
    <EditorContent
      :editor="editor"
      class="prose prose-sm max-w-none p-4"
      :style="{ minHeight: minHeight }"
    />
  </div>
</template>

<style>
/* TipTap 에디터 스타일 */
.ui-rich-editor .ProseMirror {
  outline: none;
  min-height: inherit;
}

.ui-rich-editor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af;
  pointer-events: none;
  height: 0;
}

.ui-rich-editor .ProseMirror h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.ui-rich-editor .ProseMirror h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0.875rem;
  margin-bottom: 0.5rem;
}

.ui-rich-editor .ProseMirror h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
}

.ui-rich-editor .ProseMirror p {
  margin: 0.5rem 0;
}

.ui-rich-editor .ProseMirror ul,
.ui-rich-editor .ProseMirror ol {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.ui-rich-editor .ProseMirror ul {
  list-style-type: disc;
}

.ui-rich-editor .ProseMirror ol {
  list-style-type: decimal;
}

.ui-rich-editor .ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: 0.375rem;
  margin: 0.5rem 0;
}

.ui-rich-editor .ProseMirror hr {
  border: none;
  border-top: 2px solid #e5e7eb;
  margin: 1rem 0;
}

.ui-rich-editor .ProseMirror a {
  color: #2563eb;
  text-decoration: underline;
}

.ui-rich-editor .ProseMirror a:hover {
  color: #1d4ed8;
}
</style>
