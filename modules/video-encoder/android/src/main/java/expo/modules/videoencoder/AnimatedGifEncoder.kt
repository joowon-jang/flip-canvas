package expo.modules.videoencoder

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream
import java.nio.charset.StandardCharsets
import java.util.Arrays
import kotlin.math.roundToInt

internal class AnimatedGifEncoder(
  private val outputFile: File,
  private val width: Int,
  private val height: Int,
  private val fps: Int
) {
  fun encode(frameFiles: List<File>, onProgress: (Double) -> Unit) {
    BufferedOutputStream(FileOutputStream(outputFile)).use { output ->
      writeHeader(output)
      frameFiles.forEachIndexed { index, frameFile ->
        val bitmap = BitmapFactory.decodeFile(frameFile.absolutePath)
          ?: error("Could not read frame image: ${frameFile.absolutePath}")
        val scaled = if (bitmap.width == width && bitmap.height == height) {
          bitmap
        } else {
          Bitmap.createScaledBitmap(bitmap, width, height, true)
        }
        try {
          writeFrame(output, scaled, frameDelay(index))
        } finally {
          if (scaled !== bitmap) scaled.recycle()
          bitmap.recycle()
        }
        onProgress((index + 1).toDouble() / frameFiles.size)
      }
      output.write(GIF_TRAILER)
    }
  }

  private fun writeHeader(output: OutputStream) {
    output.write("GIF89a".toByteArray(StandardCharsets.US_ASCII))
    output.writeShort(width)
    output.writeShort(height)
    output.write(0xf7)
    output.write(0)
    output.write(0)
    for (index in 0 until PALETTE_SIZE) {
      output.write(((index shr 5) and 0x07) * 255 / 7)
      output.write(((index shr 2) and 0x07) * 255 / 7)
      output.write((index and 0x03) * 255 / 3)
    }
    output.write(byteArrayOf(
      0x21, 0xff.toByte(), 0x0b,
      0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
      0x03, 0x01, 0x00, 0x00, 0x00
    ))
  }

  private fun writeFrame(output: OutputStream, bitmap: Bitmap, delayCentiseconds: Int) {
    output.write(0x21)
    output.write(0xf9)
    output.write(0x04)
    output.write(0)
    output.writeShort(delayCentiseconds)
    output.write(0)
    output.write(0)

    output.write(0x2c)
    output.writeShort(0)
    output.writeShort(0)
    output.writeShort(width)
    output.writeShort(height)
    output.write(0)

    val pixels = IntArray(width * height)
    bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
    val colorIndexes = ByteArray(pixels.size)
    pixels.forEachIndexed { index, color ->
      val alpha = color ushr 24
      val red = blendWithWhite(color shr 16 and 0xff, alpha)
      val green = blendWithWhite(color shr 8 and 0xff, alpha)
      val blue = blendWithWhite(color and 0xff, alpha)
      colorIndexes[index] = (
        ((red * 7 + 127) / 255 shl 5) or
          ((green * 7 + 127) / 255 shl 2) or
          ((blue * 3 + 127) / 255)
        ).toByte()
    }
    writeLzwImageData(output, colorIndexes)
  }

  private fun frameDelay(index: Int): Int {
    val previous = (index * 100.0 / fps).roundToInt()
    val next = ((index + 1) * 100.0 / fps).roundToInt()
    return (next - previous).coerceAtLeast(1)
  }

  private fun blendWithWhite(channel: Int, alpha: Int): Int =
    (channel * alpha + 255 * (255 - alpha)) / 255

  private fun writeLzwImageData(output: OutputStream, indexes: ByteArray) {
    output.write(MIN_CODE_SIZE)
    val blocks = GifSubBlockWriter(output)
    val bits = LsbBitWriter(blocks)
    val dictionary = IntArray(MAX_CODE shl 8) { -1 }
    val clearCode = 1 shl MIN_CODE_SIZE
    val endCode = clearCode + 1
    var nextCode = endCode + 1
    var codeSize = MIN_CODE_SIZE + 1

    bits.write(clearCode, codeSize)
    var prefix = indexes[0].toInt() and 0xff
    for (index in 1 until indexes.size) {
      val suffix = indexes[index].toInt() and 0xff
      val key = (prefix shl 8) or suffix
      val existing = dictionary[key]
      if (existing >= 0) {
        prefix = existing
        continue
      }

      bits.write(prefix, codeSize)
      if (nextCode == 1 shl codeSize && codeSize < MAX_CODE_SIZE) {
        codeSize += 1
      }
      if (nextCode < MAX_CODE) {
        dictionary[key] = nextCode
        nextCode += 1
      } else {
        bits.write(clearCode, codeSize)
        Arrays.fill(dictionary, -1)
        nextCode = endCode + 1
        codeSize = MIN_CODE_SIZE + 1
      }
      prefix = suffix
    }
    bits.write(prefix, codeSize)
    bits.write(endCode, codeSize)
    bits.finish()
  }

  private class LsbBitWriter(private val blocks: GifSubBlockWriter) {
    private var value = 0
    private var bitCount = 0

    fun write(code: Int, size: Int) {
      value = value or (code shl bitCount)
      bitCount += size
      while (bitCount >= 8) {
        blocks.write(value and 0xff)
        value = value ushr 8
        bitCount -= 8
      }
    }

    fun finish() {
      if (bitCount > 0) {
        blocks.write(value and 0xff)
      }
      blocks.finish()
    }
  }

  private class GifSubBlockWriter(private val output: OutputStream) {
    private val buffer = ByteArray(255)
    private var size = 0

    fun write(value: Int) {
      buffer[size] = value.toByte()
      size += 1
      if (size == buffer.size) {
        flush()
      }
    }

    fun finish() {
      flush()
      output.write(0)
    }

    private fun flush() {
      if (size == 0) return
      output.write(size)
      output.write(buffer, 0, size)
      size = 0
    }
  }

  private fun OutputStream.writeShort(value: Int) {
    write(value and 0xff)
    write(value shr 8 and 0xff)
  }

  private companion object {
    const val PALETTE_SIZE = 256
    const val MIN_CODE_SIZE = 8
    const val MAX_CODE_SIZE = 12
    const val MAX_CODE = 1 shl MAX_CODE_SIZE
    const val GIF_TRAILER = 0x3b
  }
}
