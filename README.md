
## 컴포넌트 명명 규칙 (Naming Convention)

### 접두사로 성격 구분
- `Ui*` : 범용 UI 컴포넌트
  - 예) `UiButton`, `UiInput`, `UiModal`, `UiPagination`
- `Layout*` : 페이지/화면 레이아웃 구조
  - 예) `LayoutListPage`, `LayoutHeader`, `LayoutSidebar`
- `Domain*` : 도메인별 패턴 컴포넌트
  - 예) `DomainDataTable`, `DomainFilterCard`, `DomainBulkActionBar`

### 명명 원칙
- 상태/동작이 있어도 명사는 역할 기준으로 명명
  - 예) `LayoutToastContainer`, `DomainBulkActionBar`

---

## 레이아웃 구조

- `layouts/default.vue` : 관리자 기본 레이아웃
- `layouts/auth.vue` : 로그인/인증 전용 레이아웃

레이아웃 구성 요소는 모두 `Layout*` 
- `LayoutHeader`
- `LayoutSidebar`
- `LayoutDrawer`
- `LayoutListPage`

---

## LayoutListPage 슬롯 규칙

`LayoutListPage`는 리스트 화면의 공통 뼈대 역할을 하며,  
아래 슬롯을 제공한다.

- `#filters` : 상단 필터 영역
- `#actions` : 상단 우측 액션 버튼
- `#bulk` : 선택 시 노출되는 벌크 액션 영역
- 기본 슬롯 : 메인 리스트/테이블 영역
- `#pagination` : 하단 페이지네이션

---

## `<template #filters>` 의미

- 자식 컴포넌트가 정의한 `filters` 슬롯 영역에 콘텐츠
- `#filters` === `v-slot:filters`

---

## 리스트 페이지 기본 사용 패턴

```vue
<LayoutListPage title="배너 관리">
    <template #filters>
    <template #selects>
    <template #search>
        

## Setup


```bash
# pnpm
pnpm install

```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# pnpm
pnpm dev

## Production

Build the application for production:

```bash

# pnpm
pnpm build

```

Locally preview production build:

```bash

# pnpm
pnpm preview

```