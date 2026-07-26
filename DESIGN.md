---
version: beta
name: Flip Canvas
description: Warm paper-craft design system for an Expo flipbook drawing app — kraft paper, ink-brown text, terracotta primary, handwritten headings.
colors:
  primary: "#C0563B"
  secondary: "#6E5A3E"
  tertiary: "#B9483C"
  neutral: "#E3CFA9"
  surface: "#FBF6EA"
  surface-soft: "#FFFDF6"
  surface-track: "#EFE5CF"
  on-surface: "#4A3B2A"
  on-surface-muted: "#B0A184"
  border: "#D9C69C"
  guide-line: "#EFE5CF"
  success: "#6E8A60"
  white: "#FFFFFF"
typography:
  display-md:
    fontFamily: Gaegu
    fontSize: 30px
    fontWeight: 700
    lineHeight: 40px
    letterSpacing: 0px
  headline-lg:
    fontFamily: Gaegu
    fontSize: 28px
    fontWeight: 700
    lineHeight: 34px
    letterSpacing: 0px
  headline-md:
    fontFamily: Gaegu
    fontSize: 22px
    fontWeight: 700
    lineHeight: 28px
    letterSpacing: 0px
  title-sm:
    fontFamily: Gaegu
    fontSize: 17px
    fontWeight: 700
    lineHeight: 22px
    letterSpacing: 0px
  body-md:
    fontFamily: System
    fontSize: 15px
    fontWeight: 400
    lineHeight: 22px
    letterSpacing: 0px
  body-sm:
    fontFamily: System
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  button-label:
    fontFamily: Gaegu
    fontSize: 17px
    fontWeight: 700
    lineHeight: 22px
    letterSpacing: 0px
  label-md:
    fontFamily: System
    fontSize: 13px
    fontWeight: 700
    lineHeight: 19px
    letterSpacing: 0px
  label-sm:
    fontFamily: System
    fontSize: 12px
    fontWeight: 700
    lineHeight: 18px
    letterSpacing: 0px
  caption:
    fontFamily: System
    fontSize: 11px
    fontWeight: 700
    lineHeight: 16px
    letterSpacing: 0px
  control-lg:
    fontFamily: System
    fontSize: 22px
    fontWeight: 800
    lineHeight: 28px
    letterSpacing: 0px
rounded:
  xs: 3px
  sm: 5px
  md: 8px
  lg: 14px
  xl: 24px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  page-padding: 23px
  card-padding: 18px
  form-padding: 20px
  button-height: 46px
  button-compact-height: 34px
  touch-target: 44px
components:
  app-surface:
    backgroundColor: "{colors.neutral}"
  paper-surface:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    height: "{spacing.button-height}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    borderColor: "{colors.border}"
    rounded: "{rounded.sm}"
    height: "{spacing.button-height}"
  button-dark:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    height: "{spacing.button-height}"
  input:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.on-surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.sm}"
    height: "{spacing.button-height}"
  progress:
    trackColor: "{colors.surface-track}"
    fillColor: "{colors.primary}"
  warning:
    color: "{colors.tertiary}"
---

# Flip Canvas Design System

## Overview

Flip Canvas는 따뜻한 페이퍼 크래프트(공작 노트) 톤의 플립북 드로잉 앱이다. 화면은 작업 도구처럼 직접적이어야 하고, 마케팅용 장식보다 사용자가 그리는 정사각형 종이, 프레임 목록, 재생 결과가 먼저 보여야 한다.

디자인 성격은 크라프트지 배경, 그 위에 올려진 크림색 종이, 잉크 브라운 텍스트, 손으로 오려 붙인 듯한 종이 카드다. 깊이는 부드러운 블러 그림자가 아니라 종이가 겹친 듯한 단단한 오프셋 그림자(`0 3px 0`)로 만든다. 앱 크롬은 사용자의 그림보다 강하게 보이면 안 된다. 전면 개편을 할 때는 이 파일의 YAML 토큰을 먼저 바꾸고, 같은 의미의 값을 `src/theme.ts`에 반영한 뒤, 아래 컴포넌트 규칙을 화면별로 갱신한다.

## Colors

팔레트는 크라프트지 배경과 잉크 브라운 텍스트를 중심으로 한다.

- **Primary Terracotta (`#C0563B`):** 주요 액션, 선택 상태, 진행 바 채움, 활성 프레임 테두리에 사용한다.
- **On Surface Ink (`#4A3B2A`):** 기본 텍스트와 기본 펜 색상이다.
- **Secondary Ink Soft (`#6E5A3E`):** 설명 문장처럼 본문보다 낮지만 여전히 읽혀야 하는 텍스트에 사용한다.
- **Tertiary Vermilion (`#B9483C`):** 삭제, 오류, 드롭 타깃 같은 위험 또는 주의 상태에만 사용한다.
- **Neutral Kraft (`#E3CFA9`):** 앱 전체 배경이다.
- **Surface Cream (`#FBF6EA`):** 카드, 종이, 캔버스 표면이다.
- **Surface Soft (`#FFFDF6`):** 입력 배경, 썸네일 비활성 표면, 도구 버튼 표면이다.
- **Surface Track (`#EFE5CF`):** 진행 바 트랙·슬라이더 트랙처럼 표면보다 약간 분리되어야 하는 낮은 대비 영역이다.
- **Border Hairline (`#D9C69C`):** 카드, 입력, 종이, 썸네일의 1.5px 경계선이다.
- **Guide Line (`#EFE5CF`):** 산출물 내부 가이드 선을 위해 예약된 토큰이다. 앱 캔버스와 UI에는 사용하지 않는다.
- **Success Green (`#6E8A60`):** 복사 완료 같은 성공 피드백에 사용한다.

반투명 값은 YAML 색상 토큰으로 넣지 않는다. 모달 스크림은 Ink 32% opacity, 리스트 overflow 힌트는 Cream 72% opacity, 오프셋 그림자는 Ink 20-35% opacity로 해석한다. 마스킹 테이프 조각은 Primary/Success를 50% opacity로 얹어 표현하되 장식은 종이 카드 상단 모서리에만 절제해서 쓴다.

## Typography

본문·메타는 React Native `System`(Noto Sans KR)을 쓰고, 제목·라벨·버튼은 손글씨 글꼴 `Gaegu`를 `expo-font`로 로드해서 쓴다. 손글씨는 페이퍼 크래프트 성격을 담당하고, 수치·본문은 시스템 글꼴로 또렷하게 읽히게 한다.

- **Display / Headline:** 라이브러리 히어로, 화면 제목은 Gaegu 700 weight, 22-30px를 쓴다.
- **Buttons & Titles:** 버튼 라벨과 섹션 제목은 Gaegu 700 weight, 17px를 쓴다.
- **Body:** 보조 설명은 System 13px/20px 또는 15px/22px를 쓴다.
- **Labels:** 필드 라벨, 프레임 번호, 메타데이터는 System 11-13px bold를 쓴다.
- **Numeric Controls:** FPS 입력처럼 수치를 직접 조작하는 값은 System 22-24px/800과 tabular nums를 쓴다. 손글씨 글꼴은 수치 입력에 쓰지 않는다.

문자 간격은 기본적으로 `0px`이다. 음수 letter spacing이나 viewport 기반 폰트 크기를 추가하지 않는다.

## Layout

기본 화면은 `AppSurface` 위에 세워진다. 배경은 Linen이고, 스크롤 화면은 `23px` page padding과 가운데 정렬된 고정 최대 너비 컨텐츠를 사용한다. 현재 주요 최대 너비는 라이브러리 720px, 새 프로젝트/렌더 520px, 프레임 관리 680px, 미리보기/AI 보간 720~760px이다.

드로잉 화면은 예외적으로 무스크롤 작업대다. `getDrawStudioLayout`의 단일 adaptive layout 결과를 사용하고, 세로 모드에서는 캔버스, 프레임 스트립, 도구 독, 하단 액션이 위에서 아래로 쌓인다. 가로 모드에서는 도구 레일, 정사각형 캔버스, 프레임 패널을 하나의 그룹으로 가운데 정렬한다.

정사각형 캔버스와 프레임 썸네일은 안정적인 width/height를 받아야 한다. 동적 측정이 필요한 경우에도 첫 렌더의 레이아웃 시프트가 생기지 않도록 viewport width/height를 명시한다.

## Elevation & Depth

깊이는 부드러운 블러 그림자가 아니라 종이가 겹친 듯한 단단한 오프셋 그림자로 만든다. 카드·종이·패널·버튼은 Cream/Soft 표면, Hairline 경계선, `0 3px 0` 형태의 Ink 20-35% 오프셋 그림자를 기본으로 한다. 모달 패널도 같은 표면 언어를 쓰되, 뒤 배경에는 Ink 32% 스크림을 사용한다.

프레임 패널, 도구 독, 옵션 패널은 작업 화면의 도구이므로 시각적으로 떠 있지만 과장되면 안 된다. 그림자나 스크림을 추가할 때는 사용자의 그림, 캔버스, 프레임 썸네일보다 먼저 눈에 들어오지 않는지 확인한다.

## Shapes

모서리는 작고 일관적이어야 한다. 주요 카드·패널·플레이어는 8px, 앱 바깥 셸은 14px radius를 기본으로 한다. 버튼과 입력은 5px radius, 종이·썸네일 표면은 3px radius를 사용한다. 24px 이상의 큰 radius는 현재 공용 패턴이 아니므로 새 UI에 임의로 추가하지 않는다.

둥근 카드 안에 또 다른 장식 카드가 들어가는 구조를 만들지 않는다. 반복 아이템, 모달, 실제 도구 패널처럼 프레임이 필요한 경우에만 카드형 표면을 사용한다.

## Components

**AppSurface:** 모든 앱 화면의 최상위 표면이다. 스크롤 화면은 safe area를 ScrollView에 맡기고, 무스크롤 작업 화면은 `noScroll`로 상단 safe area padding을 직접 가진다.

**ScreenHeader:** 뒤로 가기, 제목, 부제, 우측 액션을 처리하는 공용 헤더다. 새 화면은 route-local 제목 스타일을 새로 만들지 말고 `ScreenHeader`를 먼저 사용한다.

**Button:** `primary`, `secondary`, `dark` 세 변형만 사용한다. Primary는 화면의 다음 주요 행동에, Secondary는 보조 행동에, Dark는 삭제처럼 강한 보조 행동에 사용한다. Regular는 46px 이상, compact는 34px 이상이어야 한다.

**NotebookPaper:** 캔버스, 히어로, 프로젝트 썸네일의 종이 표면이다. 앱 내부 드로잉 종이는 plain paper여야 한다. 줄무늬나 margin line은 지우개 stroke와 충돌하므로 캔버스에 넣지 않는다.

**DrawingCanvas:** 정사각형이어야 하며 기본 펜 색은 Ink(`#4A3B2A`)다. 어니언 스킨 기본 opacity는 24%이고, 이전 프레임은 현재 stroke보다 보조적으로 보여야 한다.

**ToolDock:** Pen, Erase, Onion, Undo, Redo를 도구 레일에 배치한다. 도구 선택과 설정 패널 열기는 분리한다. 옵션 패널은 Modal로 띄워 뒤쪽 drawing input이 터치를 받지 않게 한다.

**FrameStrip and FrameGrid:** 프레임 목록은 virtualized list를 사용한다. 추가 프레임은 같은 크기의 썸네일과 `+` 아이콘으로 표현한다. 순서 변경은 길게 누른 뒤 끌기로 처리하고, 이동 중인 프레임은 낮은 opacity와 Vermilion drop target으로 상태를 보여준다.

**Form Controls:** TextInput, FPS input, slider, color picker는 Paper Soft 배경과 Hairline 경계를 따른다. 수치 입력은 tabular nums를 사용하고, 직접 조작 가능한 영역은 44px 이상 터치 타깃을 유지한다.

**Player and Preview:** 로컬 미리보기, 썸네일, 영상 캡처는 모두 `FrameComposite`를 사용해 생성 배경과 벡터 스트로크의 합성 순서를 동일하게 유지한다. 카운터는 우상단 작은 muted tabular label로 통일한다.

**AI Interpolation:** 인접 구간, 생성 장수, 광고 리워드라는 세 가지 선택만 노출한다. 생성 결과는 한 배치로 미리보고 전체 적용 또는 전체 취소만 제공한다. RIFE가 만든 래스터는 고정 배경이며 그 위에 추가한 스트로크만 편집 가능하다는 점을 명시한다.

**Local Export:** 영상 화면은 MP4/GIF 형식과 480/720/1080 정사각 해상도 선택을 제공하고 현재 설정이 로컬에서 처리됨을 보여준다. 결과가 준비된 뒤 `기기에 저장`과 `즉시 공유`를 동등한 최종 행동으로 제공한다. 업로드나 공개 링크 상태는 표시하지 않는다.

## Do's and Don'ts

- Do update this file's YAML tokens before changing the global visual direction in code.
- Do keep app chrome quiet so drawings, frames, and playback remain the primary visual signal.
- Do use Cream, Soft, Hairline, and the shared offset shadow for cards, panels, inputs, and framed tools.
- Do use Primary Terracotta for the most important action or selected state on a screen.
- Do keep drawing canvas surfaces plain inside the app.
- Do reserve Gaegu for headings, section titles, and button labels; keep body, meta, and numeric controls in the system font.
- Don't add decorative gradients, bokeh, or large illustrative backgrounds to workflow screens; masking-tape accents stay on card corners only.
- Don't introduce one-off hardcoded app chrome colors when the value belongs in `src/theme.ts`.
- Don't add new card nesting or oversized corner radii unless the whole system is being redesigned.
- Don't use Vermilion outside destructive, error, or drag target states.
- Don't change frame list layout behavior without checking large projects and compact landscape screens.
