const UPDATED_AT = "2026-07-24";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

export function GET(): Response {
  const contact =
    process.env.PRIVACY_CONTACT_EMAIL?.trim() ||
    "앱 스토어에 표시된 개발자 연락처";

  const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Flip Canvas 개인정보처리방침</title>
    <style>
      :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #E3CFA9; color: #4A3B2A; }
      body { margin: 0; padding: 32px 20px 64px; }
      main { max-width: 720px; margin: 0 auto; background: #FBF6EA; border: 1.5px solid #D9C69C; border-radius: 8px; padding: 28px; box-shadow: 0 3px 0 rgba(74, 59, 42, 0.22); }
      h1 { margin-top: 0; font-size: 28px; }
      h2 { margin-top: 28px; font-size: 19px; }
      p, li { line-height: 1.7; }
      .updated { color: #6E5A3E; font-size: 14px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Flip Canvas 개인정보처리방침</h1>
      <p class="updated">시행 및 최종 수정일: ${UPDATED_AT}</p>
      <p>Flip Canvas는 로그인 없이 사용할 수 있습니다. 사용자가 만든 프로젝트, 그림 프레임, 완성 영상은 기본적으로 사용자 기기에만 저장되며 Flip Canvas 서버에 보관되지 않습니다.</p>

      <h2>AI 중간 프레임 생성</h2>
      <p>사용자가 기능을 직접 실행한 경우에만 선택한 두 프레임의 이미지와 생성 개수를 암호화된 연결을 통해 fal.ai의 RIFE 프레임 보간 서비스로 전송합니다. 생성 결과는 앱이 사용자 기기로 내려받으며, Flip Canvas 서버는 원본 프레임이나 생성 이미지를 장기 저장하지 않습니다. fal.ai가 처리 과정에서 데이터를 다루는 방식은 해당 서비스의 정책을 따릅니다.</p>

      <h2>리워드 광고와 부정 사용 방지</h2>
      <p>Google AdMob 리워드 광고와 동의 관리 기능을 사용합니다. 광고 제공, 빈도 제한, 부정 사용 방지를 위해 Google이 기기·광고 식별자, 대략적 위치, 광고 상호작용 등의 정보를 처리할 수 있습니다. Flip Canvas의 보상 검증 저장소에는 무작위 앱 설치 식별자, 일회성 보상 번호, 광고 거래 식별자, 처리 상태와 만료 시각만 제한적으로 저장됩니다.</p>

      <h2>보관과 삭제</h2>
      <p>보상 및 AI 요청 상태는 중복 지급 방지와 요청 복구에 필요한 짧은 기간 후 자동 삭제됩니다. 기기에 저장된 프로젝트와 영상은 앱 안의 삭제 기능 또는 운영체제의 사진 앱에서 사용자가 직접 삭제할 수 있습니다. 앱을 삭제하면 앱 전용 저장소의 프로젝트도 삭제됩니다.</p>

      <h2>제3자 서비스</h2>
      <ul>
        <li>Google AdMob 및 User Messaging Platform: 광고 제공과 동의 관리</li>
        <li>fal.ai: 사용자가 요청한 CNN 기반 RIFE 프레임 보간</li>
        <li>Upstash Redis: 일회성 보상 상태, 중복 거래 방지, 요청 횟수 제한</li>
        <li>Expo EAS Hosting: 보상 검증 및 AI 중계 API 실행</li>
      </ul>

      <h2>문의</h2>
      <p>개인정보 관련 문의: ${escapeHtml(contact)}</p>
    </main>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
