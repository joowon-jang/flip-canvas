# Flip Canvas

Expo SDK 54 기반의 로컬 우선 플립북 앱입니다. 그림과 프로젝트는 사용자 기기에 저장하고, 해상도를 선택한 무음 H.264 MP4 또는 애니메이션 GIF를 기기에서 직접 만들어 사진 보관함에 저장하거나 공유 시트로 즉시 보냅니다.

선택 기능인 **AI 중간 프레임**은 인접한 두 프레임 사이에 1~3장의 장면을 RIFE CNN으로 보간합니다. 광고 한 번으로 선택한 한 구간을 생성하며, 서버는 AdMob 보상 검증과 fal.ai 요청 중계만 담당합니다. 프로젝트와 완성 영상은 서버에 저장하지 않습니다.

## 실행

Google Mobile Ads와 로컬 미디어 인코더가 네이티브 모듈이므로 Expo Go에서는 실행할 수 없습니다.

```bash
npm install
npm run ios
# 또는
npm run android

# 개발 빌드가 설치된 뒤 Metro만 다시 실행할 때
npm start
```

로컬 AI API까지 확인하려면 `.env.example`을 `.env.local`로 복사해 개발용 fal.ai, Upstash, AdMob 값을 채웁니다.

## 기능 경계

- 프로젝트, 프레임, 스트로크: SQLite/IndexedDB의 기기 로컬 저장
- 생성된 AI 프레임: 앱 문서 디렉터리에 저장되는 고정 배경 + 그 위의 편집 가능한 벡터 스트로크
- 영상: 네이티브 인코더로 MP4 또는 GIF를 480/720/1080 정사각 해상도에서 로컬 생성
- 서버 저장: 보상 nonce, 익명 설치 ID, 광고 transaction ID, AI job 상태만 TTL과 함께 Upstash에 저장
- AI 전송: 사용자가 선택한 인접 프레임 두 장만 fal.ai `fal-ai/rife`로 전송
- 로그인, 프로젝트 동기화, 원격 미디어 보관, 공개 공유 링크: 제공하지 않음

## AI 보상 흐름

1. 앱이 일회성 보상 nonce를 만듭니다.
2. Google UMP 동의를 수집한 뒤 AdMob 리워드 광고를 표시합니다.
3. Google SSV 서명을 검증하고 보상을 `pending → granted`로 전환합니다.
4. 한 AI 요청이 보상을 `reserved`로 예약합니다.
5. fal.ai 결과가 성공한 때만 `consumed`로 확정합니다.
6. 공급자 또는 네트워크 처리 실패 시 보상은 `granted`로 복구됩니다. 성공 결과 미리보기에서 사용자가 취소한 경우에는 환불하지 않습니다.

## 주요 명령

```bash
npm test
npm run typecheck
npx expo install --check

# API route 전용 서버 번들
npm run export:server

# EAS Hosting preview / production
npm run deploy:api:preview
npm run deploy:api

# TestFlight + Play 내부 테스트용 빌드/제출
npm run build:beta
npm run submit:beta
```

배포 전 계정·환경 변수·AdMob SSV·스토어 설정은 [배포 가이드](docs/DEPLOYMENT.md)를 따릅니다. 현재 구현 상태와 남은 외부 작업은 [백로그](docs/BACKLOG.md)에 정리되어 있습니다.

## 네이티브 프로젝트 운영

`ios/`와 `android/`는 커밋하는 non-CNG 구조입니다. app config, Expo plugin 또는 `modules/`의 네이티브 코드를 바꾼 뒤 아래 순서로 동기화하고 generated diff를 검토합니다.

```bash
npx expo prebuild --platform all --no-install
npx pod-install
npm run android
npm run ios
```

정밀 Apple Pencil/S Pen 입력은 `modules/stylus-input`, MP4/GIF 생성은 `modules/video-encoder` local Expo module이 담당합니다.
