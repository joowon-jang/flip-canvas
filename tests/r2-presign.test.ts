import { equal, match } from "node:assert/strict";

import { createShareUploadPlan } from "../src/share/r2-presign";
import { describe, it } from "./harness";

describe("R2 presigned upload plan", () => {
  it("returns manifest and frame upload URLs for a share", async () => {
    const plan = await createShareUploadPlan(
      { title: "테스트", fps: 12, frameCount: 2 },
      {
        accountId: "account",
        bucket: "bucket",
        accessKeyId: "access",
        secretAccessKey: "secret",
        publicBaseUrl: "https://cdn.example.com",
        appPublicBaseUrl: "https://app.example.com",
        now: new Date("2026-05-02T00:00:00.000Z"),
        randomId: () => "share123",
      },
    );

    equal(plan.shareId, "share123");
    equal(plan.playerUrl, "https://app.example.com/v/share123");
    equal(plan.publicBaseUrl, "https://cdn.example.com");
    equal(plan.manifestUrl, "https://cdn.example.com/shares/share123/manifest.json");
    match(plan.manifestUploadUrl, /\/shares\/share123\/manifest\.json/);
    equal(plan.frameUploadUrls.length, 2);
    match(plan.frameUploadUrls[0], /\/shares\/share123\/frames\/0001\.svg/);
    match(plan.frameUploadUrls[1], /\/shares\/share123\/frames\/0002\.svg/);
  });
});
