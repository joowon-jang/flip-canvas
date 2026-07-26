# Flip Canvas 배포 가이드

목표는 EAS Hosting에 최소 API를 배포하고, 같은 production 환경을 사용하는 iOS TestFlight와 Google Play 내부 테스트 빌드를 만드는 것입니다. 앱의 프로젝트와 미디어를 보관하는 별도 서버는 만들지 않습니다.

## 1. 배포 구조

```text
iOS / Android 앱
├─ 로컬 SQLite + 생성 이미지 + MP4/GIF
├─ Google UMP / AdMob 리워드 광고
└─ HTTPS
   └─ EAS Hosting (Expo Router API routes)
      ├─ Google AdMob SSV 서명 검증
      ├─ Upstash: 보상·중복 거래·요청 상태·일일 제한
      └─ fal.ai: fal-ai/rife 요청과 상태 조회
```

EAS Hosting에는 `app/api/v1/**`와 `/privacy`가 배포됩니다. 원본 프로젝트, 전체 프레임 목록, 완성 MP4/GIF를 업로드하는 API는 없습니다.

## 2. 필요한 외부 계정

- Expo/EAS 계정
- Apple Developer 및 App Store Connect 앱
- Google Play Console 앱과 내부 테스트 트랙
- Google AdMob의 iOS/Android 앱, 리워드 광고 단위, UMP 메시지
- fal.ai API key
- Upstash Redis database

## 3. EAS 프로젝트 연결

EAS CLI에서 로그인하고 현재 프로젝트를 연결합니다.

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

`eas init`이 추가한 `extra.eas.projectId`는 임의로 만들지 말고 그대로 커밋합니다. 저장소의 `eas.json`은 `development`, `preview`, `beta`, `production` 프로필을 제공합니다.

## 4. production 환경 변수

먼저 EAS 프로젝트 대시보드의 **Project settings → Environment variables**에서 production 환경을 만듭니다. 다음 값은 서버에만 있어야 합니다.

| 변수 | 권장 visibility | 용도 |
| --- | --- | --- |
| `FAL_KEY` | secret | fal.ai 서버 인증 |
| `UPSTASH_REDIS_REST_URL` | sensitive | Upstash REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | secret | Upstash REST token |
| `ADMOB_SSV_ALLOWED_AD_UNITS` | plaintext | 허용할 리워드 광고 단위 ID, 쉼표 구분 |
| `AI_DAILY_CLIENT_LIMIT` | plaintext | 익명 설치별 일일 생성 제한 |
| `AI_DAILY_GLOBAL_LIMIT` | plaintext | 전체 일일 생성 제한 |
| `AI_MAX_IMAGE_BYTES` | plaintext | 프레임 한 장의 최대 data URL 크기 |
| `PRIVACY_CONTACT_EMAIL` | plaintext | `/privacy`에 표시할 실제 문의 주소 |

다음 값은 앱 바이너리에 포함되는 공개 설정입니다. 비밀값으로 취급하지 않습니다.

| 변수 | 권장 visibility | 용도 |
| --- | --- | --- |
| `ADMOB_IOS_APP_ID` | plaintext | iOS AdMob 앱 ID |
| `ADMOB_ANDROID_APP_ID` | plaintext | Android AdMob 앱 ID |
| `EXPO_PUBLIC_ADMOB_IOS_REWARDED_AD_UNIT_ID` | plaintext | iOS 리워드 광고 단위 |
| `EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_AD_UNIT_ID` | plaintext | Android 리워드 광고 단위 |
| `EXPO_PUBLIC_API_BASE_URL` | plaintext | EAS Hosting production origin |

`.env.example`의 기본 제한값은 작은 베타용입니다. 비용 한도와 fal.ai 단가를 확인한 뒤 production 값을 결정합니다.

## 5. API 첫 배포와 URL 확정

처음에는 `EXPO_PUBLIC_API_BASE_URL` 없이도 API route를 배포할 수 있습니다.

```bash
npm run export:server
npx eas-cli@latest deploy --environment production
```

첫 배포 때 EAS Hosting preview subdomain을 선택합니다. 확인 후 production alias로 승격합니다.

```bash
npx eas-cli@latest deploy --environment production --prod
```

production URL이 `https://flip-canvas.example.expo.app`이라면 다음 값을 production 환경에 추가합니다.

```text
EXPO_PUBLIC_API_BASE_URL=https://flip-canvas.example.expo.app
```

변수 변경 후 배포물은 불변이므로 다시 export/deploy합니다.

```bash
npm run deploy:api
```

확인할 URL:

- `GET https://<production-origin>/privacy` → 개인정보처리방침 HTML
- 임의 요청 `GET https://<production-origin>/api/v1/rewards/not-found` → JSON 404

## 6. AdMob 설정

AdMob에서 iOS와 Android 앱을 각각 만들고 리워드 광고 단위를 하나씩 만듭니다.

1. UMP의 GDPR/미국 주 규정 메시지를 작성합니다.
2. 리워드 광고 단위의 Server-side verification callback을 아래로 지정합니다.

```text
https://<production-origin>/api/v1/admob/ssv
```

3. iOS/Android 광고 단위 ID 모두를 `ADMOB_SSV_ALLOWED_AD_UNITS`에 쉼표로 넣습니다.
4. 앱 ID와 광고 단위 ID를 위 표의 production 변수에 넣습니다.
5. AdMob 콘솔의 테스트 기기 또는 Google 테스트 광고 ID로 개발 빌드를 검증합니다.

개발/preview 빌드는 Google 테스트 앱 ID를 쓸 수 있지만, `beta`와 `production` 빌드는 실제 iOS/Android AdMob 앱 ID와 리워드 광고 단위 ID 네 개가 모두 없으면 app config 단계에서 실패합니다.

`ios/`와 `android/`를 커밋하는 non-CNG 구조이므로 EAS Build는 Prebuild를 자동 실행하지 않습니다. 대신 `eas-build-post-install` 훅이 production 환경의 `ADMOB_IOS_APP_ID` 또는 `ADMOB_ANDROID_APP_ID`를 해당 네이티브 설정 파일에 반영한 뒤 빌드를 계속합니다.

## 7. 베타 빌드

서버를 먼저 배포한 뒤 앱을 빌드합니다. `beta`는 EAS production 환경 변수를 명시적으로 사용하고 Android App Bundle과 iOS archive를 생성합니다.

```bash
npm test
npm run typecheck
npx expo install --check
npm run build:beta
```

빌드가 끝나면 최신 빌드를 제출합니다.

```bash
npm run submit:beta
```

- iOS: App Store Connect에서 export compliance, 개인정보 응답, 내부 TestFlight 그룹과 테스터를 확인합니다.
- Android: `submit.beta.android.releaseStatus`가 `draft`이므로 Play Console 내부 테스트 트랙에서 변경 사항을 검토한 뒤 출시를 시작합니다.
- 공개 스토어 출시는 `production` 프로필로 별도 승인할 때까지 진행하지 않습니다.

## 8. 베타 검수 체크리스트

- 새 설치에서 UMP 동의 화면이 정상 노출되는가
- 광고를 닫거나 보상을 받지 못했을 때 AI 요청이 시작되지 않는가
- 유효한 SSV 뒤 한 광고로 정확히 한 인접 구간만 생성되는가
- 1장, 2장, 3장 결과가 두 원본 사이에 균등한 순서로 들어가는가
- AI 공급자 실패 후 같은 보상이 복구되는가
- 성공 미리보기 취소 후 결과 파일이 삭제되고 보상은 재사용되지 않는가
- 생성 배경 위의 새 펜/지우개 스트로크를 편집할 수 있는가
- MP4/GIF와 480/720/1080 해상도의 각 조합이 선택대로 생성되는가
- iOS 공유 시트와 Android Sharesheet가 올바른 MIME의 MP4/GIF를 받는가
- 앱 삭제/재설치와 프로젝트 삭제의 로컬 데이터 동작이 정책 문구와 일치하는가
- EAS Hosting 로그에 원본 이미지 data URL, FAL key, Redis token을 직접 출력하지 않는가

## 9. 비용과 장애 운영

- `AI_DAILY_CLIENT_LIMIT`과 `AI_DAILY_GLOBAL_LIMIT`으로 예산 상한을 둡니다.
- fal.ai 요청 전 보상을 예약하고, 공급자 실패 시에만 원자적으로 복구합니다.
- AI job은 1시간, 보상 nonce는 30분, 광고 transaction 중복 키는 30일 뒤 만료됩니다.
- EAS Hosting의 Requests/Logs/Crashes와 fal.ai·Upstash 사용량 알림을 함께 확인합니다.
- API 장애 중에도 로컬 드로잉, 미리보기, MP4/GIF 생성·저장·공유는 계속 사용할 수 있어야 합니다.
