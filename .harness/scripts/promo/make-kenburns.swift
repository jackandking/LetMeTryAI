#!/usr/bin/env swift
/**
 * 男人宝 ④ 宣传视频素材生成器：把一张竖版静图做成缓慢推镜（Ken Burns）竖版 mp4。
 *
 * 为什么需要它：publish.mjs 只能发已有 mp4。以前只有一条 r888-change-kenburns.mp4，
 * 于是每次「隔天自动发」都在重复发同一张图。飞轮每出一张新图，就用本脚本产一条新片，
 * 登记到 promo-video.config.json 并停掉旧素材，才能真的轮换起来。
 *
 * 编译（比解释执行快很多）：
 *   swiftc -O .harness/scripts/promo/make-kenburns.swift -o /tmp/make-kenburns
 * 用法：
 *   /tmp/make-kenburns <input.png> <output.mp4> [duration=6] [fps=30]
 *
 * 固定输出 1080x1920 / H.264 / 无音轨，与历史发布成功的 r888 规格一致。
 * 纯本地 CoreGraphics + AVFoundation，不联网、不写生产库。
 */
import Foundation
import AVFoundation
import CoreVideo
import CoreGraphics
import ImageIO

let args = CommandLine.arguments
guard args.count >= 3 else {
    fputs("usage: make-kenburns <input.png> <output.mp4> [duration=6] [fps=30]\n", stderr)
    exit(2)
}
let inputPath = args[1]
let outputPath = args[2]
let duration = args.count >= 4 ? (Double(args[3]) ?? 6.0) : 6.0
let fps: Int32 = args.count >= 5 ? (Int32(args[4]) ?? 30) : 30
let W = 1080
let H = 1920

guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: inputPath) as CFURL, nil),
      let cg = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fputs("ERROR: 读不到输入图片 \(inputPath)\n", stderr)
    exit(1)
}

let outURL = URL(fileURLWithPath: outputPath)
try? FileManager.default.removeItem(at: outURL)

let writer: AVAssetWriter
do {
    writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
} catch {
    fputs("ERROR: 创建 writer 失败 \(error)\n", stderr)
    exit(1)
}

let videoSettings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: W,
    AVVideoHeightKey: H,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 4_000_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    ],
]
let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
writerInput.expectsMediaDataInRealTime = false
let pixelAttrs: [String: Any] = [
    kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA),
    kCVPixelBufferWidthKey as String: W,
    kCVPixelBufferHeightKey as String: H,
]
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: writerInput, sourcePixelBufferAttributes: pixelAttrs)
guard writer.canAdd(writerInput) else {
    fputs("ERROR: 无法添加 video input\n", stderr); exit(1)
}
writer.add(writerInput)
guard writer.startWriting() else {
    fputs("ERROR: startWriting 失败 \(writer.error?.localizedDescription ?? "")\n", stderr); exit(1)
}
writer.startSession(atSourceTime: .zero)

let totalFrames = max(Int(duration * Double(fps)), 1)
let srcW = CGFloat(cg.width)
let srcH = CGFloat(cg.height)
let baseScale = max(CGFloat(W) / srcW, CGFloat(H) / srcH)  // cover 裁切，不留黑边
let colorSpace = CGColorSpaceCreateDeviceRGB()
let bitmapInfo = CGImageAlphaInfo.premultipliedFirst.rawValue
    | CGBitmapInfo.byteOrder32Little.rawValue

for i in 0..<totalFrames {
    while !writerInput.isReadyForMoreMediaData { usleep(2000) }
    var pixelBuffer: CVPixelBuffer?
    guard let pool = adaptor.pixelBufferPool,
          CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pixelBuffer) == kCVReturnSuccess,
          let pb = pixelBuffer else {
        fputs("ERROR: 分配 pixelBuffer 失败 at frame \(i)\n", stderr); exit(1)
    }

    CVPixelBufferLockBaseAddress(pb, [])
    defer { CVPixelBufferUnlockBaseAddress(pb, []) }
    guard let base = CVPixelBufferGetBaseAddress(pb),
          let ctx = CGContext(data: base, width: W, height: H,
                              bitsPerComponent: 8,
                              bytesPerRow: CVPixelBufferGetBytesPerRow(pb),
                              space: colorSpace, bitmapInfo: bitmapInfo) else {
        fputs("ERROR: 创建 CGContext 失败\n", stderr); exit(1)
    }
    // 注意：CVPixelBuffer 本身按左上原点被视频管线读取，不要再做 y 轴翻转，
    // 否则成片会上下颠倒（2026-11-10 首版踩过：水印跑到右上角且倒置）。
    ctx.interpolationQuality = .high
    ctx.setFillColor(CGColor(red: 0.06, green: 0.07, blue: 0.09, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: CGFloat(W), height: CGFloat(H)))

    let p = CGFloat(i) / CGFloat(max(totalFrames - 1, 1))
    let ease = p * p * (3 - 2 * p)               // smoothstep，起止都慢
    let zoom = 1.0 + 0.10 * ease                 // 缓推 10%
    let s = baseScale * zoom
    let dw = srcW * s
    let dh = srcH * s
    let panY = -0.015 * CGFloat(H) * ease        // 极轻微上移，避免死板
    let dx = (CGFloat(W) - dw) / 2
    let dy = (CGFloat(H) - dh) / 2 + panY
    ctx.draw(cg, in: CGRect(x: dx, y: dy, width: dw, height: dh))

    let pts = CMTime(value: Int64(i), timescale: fps)
    if !adaptor.append(pb, withPresentationTime: pts) {
        fputs("ERROR: append 失败 at frame \(i): \(writer.error?.localizedDescription ?? "")\n", stderr)
        exit(1)
    }
    if i % 60 == 0 { print("frame \(i)/\(totalFrames)") }
}

writerInput.markAsFinished()
let sem = DispatchSemaphore(value: 0)
writer.finishWriting { sem.signal() }
_ = sem.wait(timeout: .now() + 120)
guard writer.status == .completed else {
    fputs("ERROR: finishWriting 失败 status=\(writer.status.rawValue) \(writer.error?.localizedDescription ?? "")\n", stderr)
    exit(1)
}
let size = (try? FileManager.default.attributesOfItem(atPath: outputPath)[.size] as? NSNumber)??.intValue ?? 0
print("OK \(outputPath) frames=\(totalFrames) duration=\(duration)s \(W)x\(H) \(size/1024/1024)MB")
