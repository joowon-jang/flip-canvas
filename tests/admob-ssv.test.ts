import { deepEqual, equal, throws } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseAdMobSsvQuery } from "../src/server/admob-ssv";
import { describe, it } from "./harness";

describe("AdMob SSV query parsing", () => {
  it("preserves Google's signed query bytes before signature and key_id", () => {
    const parsed = parseAdMobSsvQuery(
      "ad_network=54&ad_unit=unit_1&custom_data=reward_123&reward_amount=1&reward_item=ai&timestamp=123&transaction_id=tx_1&signature=MEUCIQ&key_id=7",
    );

    deepEqual(parsed, {
      signedContent:
        "ad_network=54&ad_unit=unit_1&custom_data=reward_123&reward_amount=1&reward_item=ai&timestamp=123&transaction_id=tx_1",
      signature: "MEUCIQ",
      keyId: 7,
      adUnit: "unit_1",
      customData: "reward_123",
      transactionId: "tx_1",
    });
  });

  it("rejects reordered or incomplete signature suffixes", () => {
    throws(() => parseAdMobSsvQuery("key_id=7&signature=MEUCIQ"));
    throws(() => parseAdMobSsvQuery("ad_unit=unit_1&signature=MEUCIQ"));
  });

  it("keeps signature verification compatible with WinterCG runtimes", () => {
    const source = readFileSync(resolve("src/server/admob-ssv-verify.ts"), "utf8");

    equal(source.includes("Buffer.from"), false);
    equal(source.includes("atob"), true);
    equal(source.includes("crypto.subtle.verify"), true);
  });
});
