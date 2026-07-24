package expo.modules.videoencoder

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.MediaMuxer
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.nio.ByteBuffer

class VideoEncoderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VideoEncoder")
    Events("onProgress")

    AsyncFunction("encodeMp4") { options: EncodeOptions ->
      encode(options)
    }

    AsyncFunction("encodeGif") { options: EncodeGifOptions ->
      encodeGif(options)
    }
  }

  private fun encode(options: EncodeOptions): Map<String, Any> {
    require(options.frameUris.isNotEmpty()) { "No frame images were provided." }
    require(options.width > 0 && options.height > 0 && options.fps > 0 && options.bitrate > 0) {
      "Video encoding options are invalid."
    }
    require(options.width % 2 == 0 && options.height % 2 == 0) {
      "Video dimensions must be even."
    }

    val outputFile = fileFromUri(options.outputPath)
    outputFile.parentFile?.mkdirs()
    if (outputFile.exists()) {
      outputFile.delete()
    }

    val format = MediaFormat.createVideoFormat(
      MediaFormat.MIMETYPE_VIDEO_AVC,
      options.width,
      options.height
    ).apply {
      setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible)
      setInteger(MediaFormat.KEY_BIT_RATE, options.bitrate)
      setInteger(MediaFormat.KEY_FRAME_RATE, options.fps)
      setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1)
    }
    val codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC)
    val muxer = MediaMuxer(outputFile.absolutePath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    var muxerStarted = false
    var trackIndex = -1

    try {
      codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
      codec.start()
      val bufferInfo = MediaCodec.BufferInfo()

      options.frameUris.forEachIndexed { index, uri ->
        val bitmap = BitmapFactory.decodeFile(fileFromUri(uri).absolutePath)
          ?: error("Could not read frame image: $uri")
        val scaled = if (bitmap.width == options.width && bitmap.height == options.height) {
          bitmap
        } else {
          Bitmap.createScaledBitmap(bitmap, options.width, options.height, true)
        }
        val bytes = bitmapToI420(scaled, options.width, options.height)
        if (scaled !== bitmap) scaled.recycle()
        bitmap.recycle()

        queueInput(codec, bytes, index.toLong() * 1_000_000L / options.fps, false)
        val drain = drainOutput(codec, muxer, bufferInfo, muxerStarted, trackIndex, false)
        muxerStarted = drain.first
        trackIndex = drain.second
        sendEvent("onProgress", mapOf("progress" to (index + 1).toDouble() / options.frameUris.size))
      }

      queueInput(
        codec,
        ByteArray(0),
        options.frameUris.size.toLong() * 1_000_000L / options.fps,
        true
      )
      var endOfStream = false
      while (!endOfStream) {
        val drain = drainOutput(codec, muxer, bufferInfo, muxerStarted, trackIndex, true)
        muxerStarted = drain.first
        trackIndex = drain.second
        endOfStream = drain.third
      }
    } finally {
      codec.stop()
      codec.release()
      if (muxerStarted) {
        muxer.stop()
      }
      muxer.release()
    }

    return mapOf(
      "uri" to Uri.fromFile(outputFile).toString(),
      "durationMs" to options.frameUris.size.toDouble() / options.fps * 1000.0
    )
  }

  private fun queueInput(
    codec: MediaCodec,
    bytes: ByteArray,
    presentationTimeUs: Long,
    endOfStream: Boolean
  ) {
    while (true) {
      val index = codec.dequeueInputBuffer(10_000)
      if (index < 0) continue
      val buffer = codec.getInputBuffer(index)
        ?: error("Encoder input buffer is unavailable.")
      buffer.clear()
      buffer.put(bytes)
      codec.queueInputBuffer(
        index,
        0,
        bytes.size,
        presentationTimeUs,
        if (endOfStream) MediaCodec.BUFFER_FLAG_END_OF_STREAM else 0
      )
      return
    }
  }

  private fun drainOutput(
    codec: MediaCodec,
    muxer: MediaMuxer,
    info: MediaCodec.BufferInfo,
    started: Boolean,
    currentTrack: Int,
    waitForEnd: Boolean
  ): Triple<Boolean, Int, Boolean> {
    var muxerStarted = started
    var trackIndex = currentTrack

    while (true) {
      val outputIndex = codec.dequeueOutputBuffer(info, if (waitForEnd) 10_000 else 0)
      when {
        outputIndex == MediaCodec.INFO_TRY_AGAIN_LATER ->
          return Triple(muxerStarted, trackIndex, false)

        outputIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
          check(!muxerStarted) { "Encoder output format changed twice." }
          trackIndex = muxer.addTrack(codec.outputFormat)
          muxer.start()
          muxerStarted = true
        }

        outputIndex >= 0 -> {
          val outputBuffer: ByteBuffer = codec.getOutputBuffer(outputIndex)
            ?: error("Encoder output buffer is unavailable.")
          if ((info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0) {
            info.size = 0
          }
          if (info.size > 0) {
            check(muxerStarted) { "Muxer has not started." }
            outputBuffer.position(info.offset)
            outputBuffer.limit(info.offset + info.size)
            muxer.writeSampleData(trackIndex, outputBuffer, info)
          }
          val endOfStream = (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0
          codec.releaseOutputBuffer(outputIndex, false)
          if (endOfStream) {
            return Triple(muxerStarted, trackIndex, true)
          }
        }
      }
    }
  }

  private fun bitmapToI420(bitmap: Bitmap, width: Int, height: Int): ByteArray {
    val pixels = IntArray(width * height)
    bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
    val output = ByteArray(width * height * 3 / 2)
    val ySize = width * height
    val uvWidth = width / 2

    for (y in 0 until height) {
      for (x in 0 until width) {
        val color = pixels[y * width + x]
        val red = color shr 16 and 0xff
        val green = color shr 8 and 0xff
        val blue = color and 0xff
        output[y * width + x] =
          clamp((77 * red + 150 * green + 29 * blue) shr 8).toByte()
        if (x % 2 == 0 && y % 2 == 0) {
          val uvIndex = (y / 2) * uvWidth + x / 2
          output[ySize + uvIndex] =
            clamp(((-43 * red - 85 * green + 128 * blue) shr 8) + 128).toByte()
          output[ySize + ySize / 4 + uvIndex] =
            clamp(((128 * red - 107 * green - 21 * blue) shr 8) + 128).toByte()
        }
      }
    }
    return output
  }

  private fun clamp(value: Int): Int = value.coerceIn(0, 255)

  private fun encodeGif(options: EncodeGifOptions): Map<String, Any> {
    require(options.frameUris.isNotEmpty()) { "No frame images were provided." }
    require(options.width > 0 && options.height > 0 && options.fps > 0) {
      "GIF encoding options are invalid."
    }

    val outputFile = fileFromUri(options.outputPath)
    outputFile.parentFile?.mkdirs()
    if (outputFile.exists()) {
      outputFile.delete()
    }
    AnimatedGifEncoder(outputFile, options.width, options.height, options.fps).encode(
      options.frameUris.map(::fileFromUri)
    ) { progress ->
      sendEvent("onProgress", mapOf("progress" to progress))
    }

    return mapOf(
      "uri" to Uri.fromFile(outputFile).toString(),
      "durationMs" to kotlin.math.round(options.frameUris.size * 100.0 / options.fps) * 10.0
    )
  }

  private fun fileFromUri(value: String): File {
    val uri = Uri.parse(value)
    return if (uri.scheme == "file") File(requireNotNull(uri.path)) else File(value)
  }
}

class EncodeOptions : Record {
  @Field
  var frameUris: List<String> = emptyList()

  @Field
  var outputPath: String = ""

  @Field
  var width: Int = 720

  @Field
  var height: Int = 720

  @Field
  var fps: Int = 12

  @Field
  var bitrate: Int = 4_000_000
}

class EncodeGifOptions : Record {
  @Field
  var frameUris: List<String> = emptyList()

  @Field
  var outputPath: String = ""

  @Field
  var width: Int = 720

  @Field
  var height: Int = 720

  @Field
  var fps: Int = 12
}
