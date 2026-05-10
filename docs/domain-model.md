# Flip Canvas Domain Model

이 문서는 Flip Canvas 코드에서 쓰는 도메인 언어와 책임 경계를 정리한다. 목적은 DDD 이론을 설명하는 것이 아니라, 이후 리팩터링과 기능 추가 때 같은 이름과 같은 책임 기준을 사용하기 위한 실무 기준을 남기는 것이다.

현재 코드의 사실과 앞으로 지향할 구조는 분리해서 읽는다. 현재 구조는 이미 존재하는 타입, 모듈, 테스트에서 확인한 내용이고, 지향 구조는 다음 리팩터링에서 맞춰 갈 방향이다.

## 문서 원칙

- 한국어 도메인 용어를 우선하고, 현재 코드 타입이나 모듈 이름은 괄호로 병기한다.
- 저장 구조와 도메인 소유권을 혼동하지 않는다.
- UI 화면의 위치가 아니라 도메인 책임을 기준으로 경계를 나눈다.
- 아직 코드에서 완전히 분리되지 않은 책임은 현재 구조와 지향 구조를 따로 적는다.

## Bounded Context 후보

### Flipbook Editing

핵심 도메인이다. 사용자가 플립북 프로젝트를 만들고, 프레임을 편집하고, 스트로크를 기록하며, FPS에 따라 재생 가능한 결과물을 만드는 책임을 가진다.

주요 언어:

- 플립북 프로젝트(FlipProject)
- 프레임(FlipFrame)
- 획/스트로크(Stroke)
- FPS
- 실행 취소/다시 실행(undo/redo)
- 어니언 스킨(onion skin)

현재 코드는 `src/types/flipbook.ts`, `src/model/frame-actions.ts`, `src/model/fps.ts`, `src/model/session-history.ts`, `src/model/sanitize-project.ts`에 핵심 규칙이 흩어져 있다.

지향 구조에서는 플립북 프로젝트(FlipProject)를 Aggregate Root로 두고, 프레임과 스트로크의 생명주기와 일관성 규칙을 이 컨텍스트 안에 모은다.

### Drawing Input

Flipbook Editing을 지원하는 하위 도메인이다. 원시 포인터/스타일러스 이벤트를 수집하고, 압력과 좌표를 보정해 스트로크 생성에 필요한 점 목록을 만든다.

주요 언어:

- 스타일러스 포인트(StylusPoint)
- 포인터 타입(PointerType)
- 입력 샘플링
- 압력 기반 선폭

최종적으로 프레임에 기록되는 스트로크(Stroke)는 Flipbook Editing의 도메인 개념이다. Drawing Input은 스트로크를 직접 소유하지 않고, 커밋 가능한 스트로크 생성을 돕는 변환과 샘플링 책임을 가진다.

현재 관련 코드는 `src/drawing/stroke-sampling.ts`, `src/drawing/pressure-stroke.ts`, `src/drawing/use-draw-session.ts`, `modules/stylus-input/`에 있다.

### Project Library

프로젝트 컬렉션을 다루는 컨텍스트 후보이다. 프로젝트 목록 조회, 정렬, 요약, 선택, 삭제 같은 관리 책임을 가진다.

주요 언어:

- 프로젝트 요약(ProjectSummary)
- 프로젝트 목록
- 최근 수정 순 정렬
- 프로젝트 선택
- 프로젝트 삭제

이름 변경과 복제는 라이브러리 화면에서 호출되더라도 플립북 프로젝트 Aggregate의 상태 변경 규칙을 포함한다. 현재는 `src/model/project-management.ts`에 있지만, 지향 구조에서는 Flipbook Editing의 도메인 서비스 또는 Aggregate factory 쪽으로 이동할 후보이다.

프로젝트 삭제는 저장소와 라이브러리 유스케이스가 소유해도 된다. 삭제는 프로젝트 내부 불변조건을 바꾸는 작업이 아니라 컬렉션에서 Aggregate를 제거하는 작업에 가깝다.

### Sharing / Publishing

공유 가능한 배포 산출물을 만드는 컨텍스트 후보이다. 원본 프로젝트의 특정 시점 스냅샷을 읽어 공유 manifest와 frame asset을 생성한다.

주요 언어:

- 공유 ID(shareId)
- 공유 URL(shareUrl)
- 공유 manifest(ShareManifest)
- 공유 프레임(ShareManifestFrame)
- 업로드된 frame asset

공유 배포물은 원본 프로젝트와 별도 산출물이다. `shareId`와 `shareUrl`은 플립북 프로젝트에 남는 게시 상태 메타데이터이지만, `ShareManifest`와 업로드된 프레임 SVG는 Sharing / Publishing 컨텍스트의 read model 또는 배포 결과로 본다.

공유 컨텍스트는 원본 프로젝트를 수정하지 않고, 프로젝트 스냅샷을 읽어 manifest와 frame assets를 생성한다.

## 핵심 Aggregate

### 플립북 프로젝트(FlipProject)

플립북 프로젝트(FlipProject)는 1차 핵심 Aggregate Root이다.

소유하는 Entity:

- 프레임(FlipFrame)
- 스트로크(Stroke)

연관된 값과 메타데이터:

- FPS
- 제목(title)
- 생성/수정 시각(createdAt, updatedAt)
- 공유 상태 메타데이터(shareId, shareUrl)

프레임과 스트로크는 현재 저장소에서 별도 테이블로 저장되지만, 도메인 소유권은 플립북 프로젝트 Aggregate 기준으로 설명한다. 테이블 분리는 저장과 조회 효율을 위한 구현 세부사항이다.

### 프레임(FlipFrame)

프레임은 플립북 프로젝트 안의 한 장면이다. 프레임은 프로젝트 밖에서 독립 생명주기를 갖지 않는다.

주요 속성:

- 식별자(id)
- 프로젝트 안의 순서(index)
- 스트로크 목록(strokes)
- 썸네일 URI(thumbnailUri)
- 수정 시각(updatedAt)

프레임 index는 0부터 시작하고 프로젝트 안에서 연속되어야 한다. 이동, 추가, 복제, 삭제 후에는 다시 reindex된다.

### 스트로크(Stroke)

스트로크는 사용자가 한 번 커밋한 획이다. 스트로크는 프레임 안에서만 의미를 가진다.

주요 속성:

- 식별자(id)
- 도구(tool: pen 또는 eraser)
- 색상(color)
- 기준 선폭(baseWidth)
- 점 목록(points)
- 생성 시각(createdAt)

원시 입력 이벤트는 스트로크 자체가 아니다. 입력 하위 도메인이 보정한 점 목록이 커밋되면 Flipbook Editing 도메인의 스트로크가 된다.

## Projection과 DTO

### 프로젝트 요약(ProjectSummary)

프로젝트 요약(ProjectSummary)은 Aggregate가 아니라 목록 조회용 Projection이다.

역할:

- 라이브러리 화면에서 프로젝트 목록을 빠르게 보여준다.
- 전체 프레임과 스트로크를 모두 로드하지 않고 프로젝트 제목, FPS, 프레임 수, 첫 프레임 미리보기 등을 제공한다.

### 공유 manifest(ShareManifest)

공유 manifest(ShareManifest)는 Aggregate가 아니라 Sharing / Publishing 컨텍스트의 read model 또는 DTO이다.

역할:

- 공유 ID, 제목, FPS, 프레임 수, 생성 시각, 공유 프레임 URL 목록을 담는다.
- 공유 웹 플레이어가 원본 프로젝트 저장소를 직접 읽지 않고 배포 산출물을 재생하게 한다.

### 저장 레코드(ProjectRecord, FrameRecord, StrokeRecord)

`ProjectRecord`, `FrameRecord`, `StrokeRecord`는 persistence DTO이다. 도메인 모델이 아니다.

역할:

- SQLite 테이블 구조와 도메인 타입 사이를 매핑한다.
- `FlipProject` Aggregate를 저장 가능한 행 단위 구조로 펼친다.
- 저장소에서 읽은 행들을 다시 유효한 `FlipProject`로 복원한다.

## 핵심 불변조건

현재 코드와 테스트에서 확인한 1차 핵심 불변조건은 다음과 같다.

- 플립북 프로젝트는 항상 1개 이상의 프레임을 가진다.
- FPS는 1 이상 60 이하의 정수로 정규화된다.
- 프레임 index는 0부터 시작해 연속되어야 한다.
- 마지막 남은 프레임은 삭제되지 않는다.
- 프레임 복제는 새 프레임 ID를 부여하고, 스트로크와 포인트를 깊은 복사한다.
- 저장 데이터가 깨져 있거나 오래된 형식이어도 `sanitizeProject`는 유효한 프로젝트로 복구한다.

아래 규칙은 현재 코드에서 관찰되지만, 도메인 규칙인지 구현 편의인지 추가 정리가 필요하다.

- `thumbnailUri`의 소유권과 갱신 시점
- `shareId`와 `shareUrl`의 상태 전이 규칙
- 프로젝트와 프레임의 `updatedAt` 갱신 기준
- undo/redo 기록이 프로젝트 영속 상태인지 세션 상태인지의 경계

## 현재 모듈 매핑

| 모듈 | 현재 책임 | 도메인 관점 |
| --- | --- | --- |
| `src/types/flipbook.ts` | 핵심 타입 정의 | 도메인 언어의 현재 중심 |
| `src/model/fps.ts` | FPS 파싱, 정규화, 프레임 지속 시간 계산 | Flipbook Editing 값 규칙 |
| `src/model/frame-actions.ts` | 프레임 이동, 추가, 복제, 삭제 | FlipProject Aggregate 내부 규칙 후보 |
| `src/model/session-history.ts` | undo/redo 스택 관리 | 편집 세션 도메인 규칙 후보 |
| `src/model/sanitize-project.ts` | 깨진 프로젝트 데이터 복구와 정규화 | Aggregate 복원/정규화 규칙 |
| `src/model/project-management.ts` | 프로젝트 이름 변경, 복제 | 일부는 Flipbook Editing으로 이동할 후보 |
| `src/state/project-store.tsx` | 앱 상태와 유스케이스 연결 | Application layer 후보 |
| `src/storage/project-repository.ts` | SQLite 저장소 구현 | Infrastructure |
| `src/storage/project-records.ts` | 도메인 타입과 저장 레코드 매핑 | Persistence mapper |
| `src/drawing/*` | 입력 처리, stroke preview, draw session 연결 | Drawing Input과 UI/Application 책임이 섞여 있음 |
| `src/share/*` | 공유 manifest, 업로드, API guard, rate limit | Sharing / Publishing 및 Infrastructure |

## 지향 구조

지향 구조는 아래 방향으로 정리한다.

```text
src/domain/flipbook
  project.ts
  frame.ts
  stroke.ts
  fps.ts
  frame-actions.ts
  session-history.ts

src/application
  project-use-cases.ts
  drawing-session-use-cases.ts
  sharing-use-cases.ts

src/infrastructure/storage
  project-repository.ts
  project-records.ts

src/infrastructure/share
  upload-share.ts
  r2-presign.ts
  share-rate-limit.ts

src/drawing-input
  stroke-sampling.ts
  pressure-stroke.ts
```

이 구조는 즉시 강제할 목표가 아니라 책임 경계를 선명하게 하기 위한 방향이다. 현재 코드를 한 번에 옮기기보다, 새 기능을 추가하거나 관련 파일을 수정할 때 점진적으로 맞춘다.

## 리팩터링 우선순위

1. 도메인 타입과 용어를 정리한다.
2. `FlipProject` Aggregate 규칙을 한곳으로 모은다.
3. 저장소 포트와 SQLite 구현을 분리한다.
4. Sharing / Publishing read model과 배포 산출물을 Flipbook Editing에서 분리한다.
5. Drawing Input과 Stroke 생성 경계를 명확히 한다.

## 열린 질문

- `shareId`와 `shareUrl`을 `FlipProject` 안에 계속 둘지, 별도 게시 상태 객체로 분리할지 결정해야 한다.
- undo/redo 기록을 세션 전용 상태로 유지할지, 프로젝트 단위 편집 이력으로 확장할지 결정해야 한다.
- `thumbnailUri`가 프레임 도메인 상태인지, UI/저장소 최적화를 위한 캐시인지 결정해야 한다.
- 프로젝트 복제와 이름 변경을 Aggregate method, domain service, application use case 중 어디에 둘지 확정해야 한다.
- Drawing Input에서 만들어지는 점 목록과 커밋된 Stroke 사이의 변환 책임을 어느 모듈에 둘지 확정해야 한다.
