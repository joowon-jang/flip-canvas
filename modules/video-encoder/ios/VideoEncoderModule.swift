import AVFoundation
import ExpoModulesCore
import ImageIO
import UIKit
import UniformTypeIdentifiers

public class VideoEncoderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VideoEncoder")
    Events("onProgress")

    AsyncFunction("encodeMp4") { (options: EncodeOptions, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          promise.resolve(try self.encode(options))
        } catch {
          promise.reject(error)
        }
      }
    }

    AsyncFunction("encodeGif") { (options: EncodeGifOptions, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          promise.resolve(try self.encodeGif(options))
        } catch {
          promise.reject(error)
        }
      }
    }
  }

  private func encode(_ options: EncodeOptions) throws -> [String: Any] {
    guard !options.frameUris.isEmpty else {
      throw VideoEncoderError.noFrames
    }
    guard options.width > 0, options.height > 0, options.fps > 0, options.bitrate > 0 else {
      throw VideoEncoderError.invalidOptions
    }

    let outputUrl = fileUrl(options.outputPath)
    try? FileManager.default.removeItem(at: outputUrl)
    try FileManager.default.createDirectory(
      at: outputUrl.deletingLastPathComponent(),
      withIntermediateDirectories: true,
      attributes: nil
    )

    let writer = try AVAssetWriter(outputURL: outputUrl, fileType: .mp4)
    let input = AVAssetWriterInput(
      mediaType: .video,
      outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: options.width,
        AVVideoHeightKey: options.height,
        AVVideoCompressionPropertiesKey: [
          AVVideoAverageBitRateKey: options.bitrate,
          AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
        ]
      ]
    )
    input.expectsMediaDataInRealTime = false
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
      assetWriterInput: input,
      sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: options.width,
        kCVPixelBufferHeightKey as String: options.height
      ]
    )
    guard writer.canAdd(input) else {
      throw VideoEncoderError.writerSetup
    }
    writer.add(input)
    guard writer.startWriting() else {
      throw writer.error ?? VideoEncoderError.writerSetup
    }
    writer.startSession(atSourceTime: .zero)

    for (index, uri) in options.frameUris.enumerated() {
      while !input.isReadyForMoreMediaData {
        Thread.sleep(forTimeInterval: 0.005)
      }
      guard
        let image = UIImage(contentsOfFile: fileUrl(uri).path),
        let pixelBuffer = makePixelBuffer(
          image: image,
          width: options.width,
          height: options.height,
          pool: adaptor.pixelBufferPool
        )
      else {
        throw VideoEncoderError.frameRead(uri)
      }
      let presentationTime = CMTime(value: CMTimeValue(index), timescale: CMTimeScale(options.fps))
      guard adaptor.append(pixelBuffer, withPresentationTime: presentationTime) else {
        throw writer.error ?? VideoEncoderError.appendFrame
      }
      sendEvent("onProgress", ["progress": Double(index + 1) / Double(options.frameUris.count)])
    }

    input.markAsFinished()
    let semaphore = DispatchSemaphore(value: 0)
    writer.finishWriting {
      semaphore.signal()
    }
    semaphore.wait()
    guard writer.status == .completed else {
      throw writer.error ?? VideoEncoderError.finishWriting
    }

    return [
      "uri": outputUrl.absoluteString,
      "durationMs": Double(options.frameUris.count) / Double(options.fps) * 1000
    ]
  }

  private func makePixelBuffer(
    image: UIImage,
    width: Int,
    height: Int,
    pool: CVPixelBufferPool?
  ) -> CVPixelBuffer? {
    var optionalBuffer: CVPixelBuffer?
    let status: CVReturn
    if let pool {
      status = CVPixelBufferPoolCreatePixelBuffer(nil, pool, &optionalBuffer)
    } else {
      status = CVPixelBufferCreate(
        nil,
        width,
        height,
        kCVPixelFormatType_32BGRA,
        [
          kCVPixelBufferCGImageCompatibilityKey: true,
          kCVPixelBufferCGBitmapContextCompatibilityKey: true
        ] as CFDictionary,
        &optionalBuffer
      )
    }
    guard status == kCVReturnSuccess, let buffer = optionalBuffer, let cgImage = image.cgImage else {
      return nil
    }

    CVPixelBufferLockBaseAddress(buffer, [])
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
    guard
      let context = CGContext(
        data: CVPixelBufferGetBaseAddress(buffer),
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
      )
    else {
      return nil
    }

    context.setFillColor(UIColor.white.cgColor)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.translateBy(x: 0, y: CGFloat(height))
    context.scaleBy(x: 1, y: -1)
    let scale = max(CGFloat(width) / CGFloat(cgImage.width), CGFloat(height) / CGFloat(cgImage.height))
    let drawWidth = CGFloat(cgImage.width) * scale
    let drawHeight = CGFloat(cgImage.height) * scale
    context.draw(
      cgImage,
      in: CGRect(
        x: (CGFloat(width) - drawWidth) / 2,
        y: (CGFloat(height) - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight
      )
    )
    return buffer
  }

  private func encodeGif(_ options: EncodeGifOptions) throws -> [String: Any] {
    guard !options.frameUris.isEmpty else {
      throw VideoEncoderError.noFrames
    }
    guard options.width > 0, options.height > 0, options.fps > 0 else {
      throw VideoEncoderError.invalidOptions
    }

    let outputUrl = fileUrl(options.outputPath)
    try? FileManager.default.removeItem(at: outputUrl)
    try FileManager.default.createDirectory(
      at: outputUrl.deletingLastPathComponent(),
      withIntermediateDirectories: true,
      attributes: nil
    )

    guard let destination = CGImageDestinationCreateWithURL(
      outputUrl as CFURL,
      UTType.gif.identifier as CFString,
      options.frameUris.count,
      nil
    ) else {
      throw VideoEncoderError.gifSetup
    }
    CGImageDestinationSetProperties(
      destination,
      [
        kCGImagePropertyGIFDictionary: [
          kCGImagePropertyGIFLoopCount: 0
        ]
      ] as CFDictionary
    )

    for (index, uri) in options.frameUris.enumerated() {
      guard
        let image = UIImage(contentsOfFile: fileUrl(uri).path),
        let cgImage = makeCgImage(image: image, width: options.width, height: options.height)
      else {
        throw VideoEncoderError.frameRead(uri)
      }
      let delay = gifFrameDelay(index: index, fps: options.fps)
      CGImageDestinationAddImage(
        destination,
        cgImage,
        [
          kCGImagePropertyGIFDictionary: [
            kCGImagePropertyGIFDelayTime: delay,
            kCGImagePropertyGIFUnclampedDelayTime: delay
          ]
        ] as CFDictionary
      )
      sendEvent("onProgress", ["progress": Double(index + 1) / Double(options.frameUris.count)])
    }

    guard CGImageDestinationFinalize(destination) else {
      throw VideoEncoderError.gifFinalize
    }
    return [
      "uri": outputUrl.absoluteString,
      "durationMs": round(Double(options.frameUris.count) * 100 / Double(options.fps)) * 10
    ]
  }

  private func makeCgImage(image: UIImage, width: Int, height: Int) -> CGImage? {
    guard
      let source = image.cgImage,
      let context = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width * 4,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
      )
    else {
      return nil
    }

    context.setFillColor(UIColor.white.cgColor)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.interpolationQuality = .high
    let scale = max(CGFloat(width) / CGFloat(source.width), CGFloat(height) / CGFloat(source.height))
    let drawWidth = CGFloat(source.width) * scale
    let drawHeight = CGFloat(source.height) * scale
    context.draw(
      source,
      in: CGRect(
        x: (CGFloat(width) - drawWidth) / 2,
        y: (CGFloat(height) - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight
      )
    )
    return context.makeImage()
  }

  private func gifFrameDelay(index: Int, fps: Int) -> Double {
    let previous = round(Double(index) * 100 / Double(fps))
    let next = round(Double(index + 1) * 100 / Double(fps))
    return max(1, next - previous) / 100
  }

  private func fileUrl(_ value: String) -> URL {
    if let url = URL(string: value), url.isFileURL {
      return url
    }
    return URL(fileURLWithPath: value)
  }
}

private struct EncodeGifOptions: Record {
  @Field var frameUris: [String] = []
  @Field var outputPath: String = ""
  @Field var width: Int = 720
  @Field var height: Int = 720
  @Field var fps: Int = 12
}

private struct EncodeOptions: Record {
  @Field var frameUris: [String] = []
  @Field var outputPath: String = ""
  @Field var width: Int = 720
  @Field var height: Int = 720
  @Field var fps: Int = 12
  @Field var bitrate: Int = 4_000_000
}

private enum VideoEncoderError: LocalizedError {
  case noFrames
  case invalidOptions
  case writerSetup
  case frameRead(String)
  case appendFrame
  case finishWriting
  case gifSetup
  case gifFinalize

  var errorDescription: String? {
    switch self {
    case .noFrames:
      return "No frame images were provided."
    case .invalidOptions:
      return "Video encoding options are invalid."
    case .writerSetup:
      return "Could not initialize the video writer."
    case .frameRead(let uri):
      return "Could not read frame image: \(uri)"
    case .appendFrame:
      return "Could not append a video frame."
    case .finishWriting:
      return "Could not finish the MP4 file."
    case .gifSetup:
      return "Could not initialize the GIF writer."
    case .gifFinalize:
      return "Could not finish the GIF file."
    }
  }
}
