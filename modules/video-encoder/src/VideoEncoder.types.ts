export type VideoEncoderModuleEvents = {
  onProgress: (params: VideoEncoderProgressEvent) => void;
};

export type VideoEncoderProgressEvent = {
  progress: number;
};

export type EncodeMp4Options = {
  frameUris: string[];
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
};

export type EncodeGifOptions = {
  frameUris: string[];
  outputPath: string;
  width: number;
  height: number;
  fps: number;
};

export type EncodeResult = {
  uri: string;
  durationMs: number;
};

export type EncodeMp4Result = EncodeResult;
export type EncodeGifResult = EncodeResult;
