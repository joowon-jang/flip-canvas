import { deepEqual, equal, throws } from "node:assert/strict";

import { buildRifeInput, parseInterpolationRequest } from "../src/server/interpolation-request";
import { describe, it } from "./harness";

const PNG = "data:image/png;base64,iVBORw0KGgo=";

describe("interpolation API request", () => {
  it("accepts one adjacent-pair batch with one to three generated frames", () => {
    const request = parseInterpolationRequest({
      clientInstanceId: "client_1234567890",
      rewardNonce: "reward_1234567890",
      startImage: PNG,
      endImage: PNG,
      frameCount: 3,
    });

    equal(request.frameCount, 3);
    equal(request.startImage, PNG);
  });

  it("rejects invalid image data and out-of-range batches", () => {
    throws(() =>
      parseInterpolationRequest({
        clientInstanceId: "client_1234567890",
        rewardNonce: "reward_1234567890",
        startImage: "https://example.com/a.png",
        endImage: PNG,
        frameCount: 1,
      }),
    );
    throws(() =>
      parseInterpolationRequest({
        clientInstanceId: "client_1234567890",
        rewardNonce: "reward_1234567890",
        startImage: PNG,
        endImage: PNG,
        frameCount: 4,
      }),
    );
  });

  it("maps the batch to the RIFE image interpolation schema", () => {
    deepEqual(buildRifeInput(PNG, PNG, 2), {
      start_image_url: PNG,
      end_image_url: PNG,
      output_type: "images",
      output_format: "png",
      num_frames: 2,
      include_start: false,
      include_end: false,
    });
  });
});
