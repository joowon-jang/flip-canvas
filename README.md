# Flip Canvas

Expo SDK 54 기반 Flip Canvas 앱입니다. Figma v2 디자인의 조용한 노트/종이 톤을 기준으로 라이브러리, 프로젝트 생성, 무스크롤 드로잉, 프레임 관리, 미리보기, 업로드, 공유 링크, 웹 플레이어를 구현했습니다.

## 실행

```bash
npm install
npm run start -- --host localhost --port 8081
```

`npm run start`는 `expo start --go`를 사용해서 Expo Go에서 열 수 있는 링크를 강제합니다. Expo Go에서는 손가락/기본 터치 fallback과 React Native 기반 stroke preview로 동작합니다.

Apple Pencil/S Pen 정밀 입력은 `modules/stylus-input` local Expo module을 사용하므로 Expo Go가 아니라 development build가 필요합니다. 정밀 펜 입력을 테스트할 때는 development build 앱에서 아래 명령을 사용합니다.

```bash
npm run start:dev-client
npm run ios
npm run android
```

## 네이티브 프로젝트 운영

이 프로젝트의 `android/` 폴더는 `app.json`, Expo plugins, `modules/stylus-input` local Expo module을 기준으로 만든 native output입니다. native project 운영은 prebuild 재생성 기준으로 관리합니다.

native config, Expo plugin, local module native 코드, Android package 설정을 바꾼 뒤에는 아래 순서로 동기화합니다.

```bash
npx expo prebuild --clean --platform android
npm run android
```

생성된 `android/` 변경사항은 커밋 전에 반드시 리뷰합니다. Expo Go는 기본 터치 fallback 확인용이고, Apple Pencil/S Pen 정밀 입력은 development build에서 확인합니다.

현재처럼 `android/`를 보관하는 non-CNG 구조에서는 app config가 native output에 자동 동기화되지 않습니다. 이 프로젝트는 해당 운영 방식을 명시적으로 선택했기 때문에 `package.json`에서 Expo Doctor의 app config 동기화 경고를 끄고, 위 prebuild 절차와 native diff 리뷰를 동기화 기준으로 삼습니다.

## 공유 환경 변수

API route와 웹 플레이어 업로드에는 아래 값이 필요합니다.

로컬 설정은 `.env.example`을 복사해서 시작합니다.

```bash
R2_ACCOUNT_ID=
R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_BASE_URL=
APP_PUBLIC_BASE_URL=
EXPO_PUBLIC_APP_PUBLIC_BASE_URL=
SHARE_ALLOWED_ORIGINS=
SHARE_MAX_BODY_BYTES=2048
SHARE_RATE_LIMIT_PROVIDER=upstash
SHARE_RATE_LIMIT_MAX=30
SHARE_RATE_LIMIT_WINDOW_SECONDS=60
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

프로덕션에서는 `SHARE_RATE_LIMIT_PROVIDER`가 없으면 공유 생성 API가 503으로 실패합니다. 현재 durable provider는 `upstash`를 지원하며, 개발 환경에서는 로컬 테스트를 위해 provider 없이도 통과시킵니다.

## 운영 체크리스트

공유 기능을 배포하기 전에 아래 항목을 확인합니다.

- R2 bucket public/custom domain이 `R2_PUBLIC_BASE_URL`과 같은 origin으로 열리는지 확인합니다.
- `APP_PUBLIC_BASE_URL`과 `EXPO_PUBLIC_APP_PUBLIC_BASE_URL`은 사용자가 여는 앱 URL로 맞춥니다.
- `SHARE_ALLOWED_ORIGINS`는 앱 origin만 허용합니다. 비워두면 `APP_PUBLIC_BASE_URL`의 origin을 사용합니다.
- 프로덕션에서는 `SHARE_RATE_LIMIT_PROVIDER=upstash`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`을 설정합니다.
- 업로드 후 `/v/[shareId]`가 `/api/shares/[shareId]/manifest`를 통해 manifest를 읽고 첫 프레임을 표시하는지 확인합니다.

성능 회귀를 확인할 때는 64~128 프레임 프로젝트, 긴 stroke가 있는 프레임 전환, 태블릿/휴대폰 가로 회전, FrameStrip/FrameGrid 스크롤을 같이 봅니다.

## 검증

```bash
npm run typecheck
npm test
npx expo install --check
npx expo export --platform web --output-dir .web-export-test
```
