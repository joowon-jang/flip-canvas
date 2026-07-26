import type {
  EncodeGifOptions,
  EncodeGifResult,
  EncodeMp4Options,
  EncodeMp4Result,
} from './VideoEncoder.types';

const VideoEncoderModule = {
  addListener() {
    return { remove() {} };
  },

  async encodeMp4(_options: EncodeMp4Options): Promise<EncodeMp4Result> {
    throw new Error('MP4 encoding is only available on iOS and Android.');
  },

  async encodeGif(_options: EncodeGifOptions): Promise<EncodeGifResult> {
    throw new Error('GIF encoding is only available on iOS and Android.');
  },
};

export default VideoEncoderModule;
