import { NativeModule, requireNativeModule } from 'expo';

import type {
  EncodeGifOptions,
  EncodeGifResult,
  EncodeMp4Options,
  EncodeMp4Result,
  VideoEncoderModuleEvents,
} from './VideoEncoder.types';

declare class VideoEncoderModule extends NativeModule<VideoEncoderModuleEvents> {
  encodeMp4(options: EncodeMp4Options): Promise<EncodeMp4Result>;
  encodeGif(options: EncodeGifOptions): Promise<EncodeGifResult>;
}

export default requireNativeModule<VideoEncoderModule>('VideoEncoder');
