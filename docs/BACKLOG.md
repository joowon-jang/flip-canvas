# Flip Canvas 구현 상태와 백로그

기준일: 2026-07-24

## 구현 완료

- R2 업로드, 공개 공유 링크, 원격 웹 플레이어 제거
- SQLite/IndexedDB 로컬 프로젝트 저장과 기존 레코드 호환 마이그레이션
- 생성 이미지를 고정 배경으로 두고 벡터 스트로크를 계속 편집하는 합성 모델
- 인접 프레임 구간 선택, 1~3장 균등 보간, 전체 미리보기·전체 적용·전체 취소
- Google UMP 및 AdMob rewarded 광고
- Google 공개키 기반 SSV ECDSA 검증과 광고 transaction 중복 방지
- Upstash 보상 상태 전이 및 공급자 실패 시 보상 복구
- fal.ai `fal-ai/rife` queue 요청·상태 조회·단기 결과 다운로드
- 설치별/전체 일일 AI 사용 제한
- iOS/Android 네이티브 MP4·GIF 생성과 480/720/1080 정사각 해상도 선택
- 사진 보관함 저장과 네이티브 공유 시트
- 앱 아이콘, 스플래시, `/privacy`, EAS Hosting·beta build/submit 설정

## 베타 배포 전 외부 작업

코드로 대신할 수 없는 계정·정책 작업입니다.

- [ ] `eas init`으로 실제 Expo project ID 연결
- [ ] fal.ai key와 Upstash production database 발급
- [ ] AdMob iOS/Android 앱과 rewarded ad unit 생성
- [ ] UMP 개인정보 메시지 게시
- [ ] EAS production 환경 변수 등록
- [ ] EAS Hosting 첫 배포, production origin 확정
- [ ] AdMob SSV callback URL 등록
- [ ] `PRIVACY_CONTACT_EMAIL`을 실제 운영 문의 주소로 설정
- [ ] Apple/Google 개인정보 설문을 실제 SDK 데이터 수집 항목과 대조
- [ ] App Store Connect/Play Console 앱 레코드, 가격·배포 국가, 연령 등급 작성
- [ ] 실제 기기에서 베타 검수 체크리스트 통과
- [ ] TestFlight 내부 그룹과 Play 내부 테스트 트랙에 제출

## 베타에서 수집할 판단 자료

- AI 생성 성공률과 p50/p95 처리 시간
- 광고 완료 대비 SSV 수신률
- 한 번의 생성당 fal.ai 비용과 일일 상한 도달 빈도
- 64~128 프레임 프로젝트의 MP4/GIF 생성 시간, 파일 크기와 메모리 사용량
- 생성 프레임을 적용하지 않고 취소하는 비율
- iOS/Android별 사진 권한 거절 및 공유 실패율

## 알려진 기술 부채

- `npm audit --omit=dev` 기준 Expo SDK 54의 CLI/빌드 도구 전이 의존성에서 25건(critical 2, high 6 포함)이 보고됩니다. 현재 수정 제안은 Expo 57 메이저 업그레이드이므로 자동 수정하지 않았습니다. 앱 런타임/API 번들 노출 여부를 다시 검토하고, 공개 출시 전 SDK 업그레이드와 두 로컬 모듈 호환성 검증으로 해소합니다.
- GIF는 플랫폼별 색상 양자화 결과가 다를 수 있으므로 실제 기기에서 화질과 파일 크기를 비교합니다.

## 정식 출시 후보

베타 지표를 확인하기 전에는 구현하지 않습니다.

- 낮은 메모리 기기의 MP4/GIF 스트리밍·배치 인코딩 최적화
- 공급자 장애·지연에 대한 사용자 재조회 UX
- 접근성 실기기 점검 및 지역화
- 스토어 스크린샷과 마케팅 문구 최종본
- 비용 경보와 운영 대시보드
- Expo SDK 업그레이드와 production dependency audit 통과

로그인, 클라우드 프로젝트 동기화, 원격 미디어 보관, 공개 공유 링크는 현재 제품 범위에 포함하지 않습니다.
