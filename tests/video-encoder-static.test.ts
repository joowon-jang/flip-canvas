import { equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "./harness";

describe("local media encoder contract", () => {
  it("encodes H.264 with native iOS and Android media APIs", () => {
    const swift = readFileSync(resolve("modules/video-encoder/ios/VideoEncoderModule.swift"), "utf8");
    const kotlin = readFileSync(
      resolve("modules/video-encoder/android/src/main/java/expo/modules/videoencoder/VideoEncoderModule.kt"),
      "utf8",
    );

    equal(swift.includes("AVAssetWriter"), true);
    equal(swift.includes("AVVideoCodecType.h264"), true);
    equal(kotlin.includes("MediaCodec"), true);
    equal(kotlin.includes("MediaMuxer"), true);
    equal(kotlin.includes("MIMETYPE_VIDEO_AVC"), true);
  });

  it("exposes frame-to-MP4 and frame-to-GIF encoding with progress events", () => {
    const types = readFileSync(resolve("modules/video-encoder/src/VideoEncoder.types.ts"), "utf8");
    const module = readFileSync(resolve("modules/video-encoder/src/VideoEncoderModule.ts"), "utf8");
    const index = readFileSync(resolve("modules/video-encoder/index.ts"), "utf8");

    equal(types.includes("frameUris: string[]"), true);
    equal(types.includes("onProgress"), true);
    equal(module.includes("encodeGif"), true);
    equal(index.includes("VideoEncoderView"), false);
  });

  it("keeps the web fallback safe to load during server export", () => {
    const webModule = readFileSync(resolve("modules/video-encoder/src/VideoEncoderModule.web.ts"), "utf8");
    const renderRoute = readFileSync(resolve("app/project/[id]/render.tsx"), "utf8");
    const mediaLibraryWeb = readFileSync(resolve("src/media-library.web.ts"), "utf8");

    equal(webModule.includes("NativeModule"), false);
    equal(webModule.includes("registerWebModule"), false);
    equal(webModule.includes("addListener"), true);
    equal(renderRoute.includes('"expo-media-library"'), false);
    equal(mediaLibraryWeb.includes('"expo-media-library"'), false);
  });

  it("lets users choose MP4 or GIF and a supported square resolution", () => {
    const source = readFileSync(resolve("app/project/[id]/render.tsx"), "utf8");

    equal(source.includes('"mp4" | "gif"'), true);
    equal(source.includes("480"), true);
    equal(source.includes("720"), true);
    equal(source.includes("1080"), true);
    equal(source.includes("VideoEncoderModule.encodeGif"), true);
    equal(source.includes('"image/gif"'), true);
  });

  it("asks for confirmation before saving to the photo library", () => {
    const source = readFileSync(resolve("app/project/[id]/render.tsx"), "utf8");

    equal(source.includes("사진 보관함에 저장할까요?"), true);
    equal(source.includes('text: "취소"'), true);
    equal(source.includes('text: "저장"'), true);
  });
});
