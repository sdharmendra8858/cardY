//
//  RNPipModule.swift
//  CardyWall
//
//  Offscreen AVPlayerLayer PiP implementation with image-normalization and a DEV-only suspend hack.
//  - Produces a single-frame mp4 with white background
//  - Creates an offscreen container view + AVPlayerLayer and starts PiP from that layer
//  - Keeps PiP paused by default
//  - Fixes image orientation (prevents upside-down)
//  - Optionally suspends app in DEBUG only (private API) to mimic Android auto-minimize behavior
//

import Foundation
import UIKit
import AVKit
import AVFoundation
import React

@objc(PipModule)
public class PipModule: NSObject, RCTBridgeModule, AVPictureInPictureControllerDelegate {

    // MARK: - RCT module boilerplate
    @objc public static func moduleName() -> String! { return "PipModule" }
    @objc public static func requiresMainQueueSetup() -> Bool { return true }

    // MARK: - State
    private var pipController: AVPictureInPictureController?
    private var currentPlayer: AVPlayer?
    private var pipContainerView: UIView?
    private var tempVideoUrl: URL?
    private var pendingCardId: String?

    // MARK: - Entry from JS
    // NativeModules.PipModule.enterPipMode(imageUri, cardId)
    @objc
    public func enterPipMode(_ imageUri: String, cardId: String) {
        NSLog("📱 [PipModule] enterPipMode called: %@", imageUri)
        self.pendingCardId = cardId

        DispatchQueue.global(qos: .userInitiated).async {
            // Robust URL handling: accept file:// and plain file paths
            var fileUrl: URL?
            if imageUri.hasPrefix("file://"), let u = URL(string: imageUri) {
                fileUrl = u
            } else {
                fileUrl = URL(fileURLWithPath: imageUri)
            }

            guard let imageFileUrl = fileUrl, FileManager.default.fileExists(atPath: imageFileUrl.path) else {
                NSLog("❌ [PipModule] image not found at path: %@", imageUri)
                return
            }

            guard let videoUrl = self.createSingleFrameMp4(imageFileUrl: imageFileUrl) else {
                NSLog("❌ [PipModule] createSingleFrameMp4 failed")
                return
            }

            self.tempVideoUrl = videoUrl

            DispatchQueue.main.async {
                self.startOffscreenPlayerPiP(videoUrl: videoUrl)
            }
        }
    }

    // MARK: - Create single-frame MP4 (white background) - normalizes orientation
    private func createSingleFrameMp4(imageFileUrl: URL) -> URL? {
        guard let data = try? Data(contentsOf: imageFileUrl),
              let uiImage = UIImage(data: data) else {
            NSLog("❌ [PipModule] unable to load image data")
            return nil
        }

        // Normalize orientation (fix upside-down / rotated images)
        let normalizedImage = uiImage.normalizedImage()
        guard let cgImage = normalizedImage.cgImage else {
            NSLog("❌ [PipModule] normalizedImage.cgImage missing")
            return nil
        }

        let outputSize = CGSize(width: 1280, height: 720)
        let filename = UUID().uuidString + ".mp4"
        let fileUrl = FileManager.default.temporaryDirectory.appendingPathComponent(filename)

        try? FileManager.default.removeItem(at: fileUrl)

        guard let writer = try? AVAssetWriter(outputURL: fileUrl, fileType: .mp4) else {
            NSLog("❌ [PipModule] AVAssetWriter creation failed")
            return nil
        }

        let settings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: Int(outputSize.width),
            AVVideoHeightKey: Int(outputSize.height)
        ]
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
        input.expectsMediaDataInRealTime = false

        let sourceAttrs: [String: Any] = [
            kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32ARGB),
            kCVPixelBufferWidthKey as String: Int(outputSize.width),
            kCVPixelBufferHeightKey as String: Int(outputSize.height)
        ]

        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: sourceAttrs)

        guard writer.canAdd(input) else {
            NSLog("❌ [PipModule] cannot add input to writer")
            return nil
        }
        writer.add(input)

        writer.startWriting()
        writer.startSession(atSourceTime: CMTime.zero)

        var pixelBuffer: CVPixelBuffer?
        let attrs = [
            kCVPixelBufferCGImageCompatibilityKey as String: true,
            kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
        ] as CFDictionary

        let status = CVPixelBufferCreate(kCFAllocatorDefault,
                                         Int(outputSize.width),
                                         Int(outputSize.height),
                                         kCVPixelFormatType_32ARGB,
                                         attrs,
                                         &pixelBuffer)
        guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
            NSLog("❌ [PipModule] CVPixelBufferCreate failed: \(status)")
            return nil
        }

        CVPixelBufferLockBaseAddress(buffer, [])
        if let base = CVPixelBufferGetBaseAddress(buffer) {
            let colorSpace = CGColorSpaceCreateDeviceRGB()
            let bytesPerRow = CVPixelBufferGetBytesPerRow(buffer)
            if let ctx = CGContext(data: base,
                                   width: Int(outputSize.width),
                                   height: Int(outputSize.height),
                                   bitsPerComponent: 8,
                                   bytesPerRow: bytesPerRow,
                                   space: colorSpace,
                                   bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue) {
                // No flip needed - drawing directly into CVPixelBuffer context
                // ctx.translateBy(x: 0, y: outputSize.height)
                // ctx.scaleBy(x: 1.0, y: -1.0)

                // Fill background white to avoid purple/transparent edges
                ctx.setFillColor(UIColor.white.cgColor)
                ctx.fill(CGRect(x: 0, y: 0, width: outputSize.width, height: outputSize.height))

                // Draw image center-cropped to cover the frame
                let imgW = CGFloat(cgImage.width)
                let imgH = CGFloat(cgImage.height)
                let imgAspect = imgW / imgH
                let targetAspect = outputSize.width / outputSize.height
                var drawRect = CGRect(x: 0, y: 0, width: outputSize.width, height: outputSize.height)

                if imgAspect > targetAspect {
                    let scale = outputSize.height / imgH
                    let drawW = imgW * scale
                    drawRect.origin.x = -(drawW - outputSize.width) / 2.0
                    drawRect.size.width = drawW
                } else {
                    let scale = outputSize.width / imgW
                    let drawH = imgH * scale
                    drawRect.origin.y = -(drawH - outputSize.height) / 2.0
                    drawRect.size.height = drawH
                }

                ctx.draw(cgImage, in: drawRect)
            }
        }
        CVPixelBufferUnlockBaseAddress(buffer, [])

        // Append a single frame (time 0)
        while !input.isReadyForMoreMediaData { usleep(1000) }
        let frameTime = CMTime(value: 0, timescale: 100)
        if !adaptor.append(buffer, withPresentationTime: frameTime) {
            NSLog("❌ [PipModule] adaptor.append failed")
        }

        input.markAsFinished()
        let sem = DispatchSemaphore(value: 0)
        writer.finishWriting {
            sem.signal()
        }
        _ = sem.wait(timeout: DispatchTime.now() + .seconds(3))

        if writer.status == .completed {
            NSLog("✅ [PipModule] created mp4 at %@", fileUrl.path)
            return fileUrl
        } else {
            NSLog("❌ [PipModule] writer failed: %@", String(describing: writer.error))
            return nil
        }
    }

    // MARK: - Start PiP using offscreen AVPlayerLayer (avoids black fullscreen)
    private func startOffscreenPlayerPiP(videoUrl: URL) {
        DispatchQueue.main.async {
            NSLog("📱 [PipModule] startOffscreenPlayerPiP with %@", videoUrl.path)

            guard AVPictureInPictureController.isPictureInPictureSupported() else {
                NSLog("❌ [PipModule] PiP not supported on this device")
                return
            }

            // Prepare player
            let player = AVPlayer(url: videoUrl)
            player.isMuted = true
            player.actionAtItemEnd = .pause
            self.currentPlayer = player

            // Player layer
            let playerLayer = AVPlayerLayer(player: player)
            playerLayer.videoGravity = .resizeAspectFill

            // Find key window (iOS13+ safe)
            var keyWindow: UIWindow?
            if #available(iOS 13.0, *) {
                keyWindow = UIApplication.shared.connectedScenes
                    .compactMap { $0 as? UIWindowScene }
                    .flatMap { $0.windows }
                    .first { $0.isKeyWindow }
            } else {
                keyWindow = UIApplication.shared.keyWindow
            }
            guard let keyWindowUnwrapped = keyWindow else {
                NSLog("❌ [PipModule] no key window found")
                return
            }

            // Create small non-zero offscreen container; must have alpha > 0 so system can snapshot. Keep it offscreen to avoid UI interference.
            let size = CGSize(width: 320, height: 180)
            let container = UIView(frame: CGRect(x: -1000, y: -1000, width: size.width, height: size.height))
            container.backgroundColor = .clear
            container.alpha = 0.01 // >0 so snapshot is available
            container.isHidden = false
            container.isUserInteractionEnabled = false

            // Keep strong ref
            self.pipContainerView = container

            keyWindowUnwrapped.addSubview(container)
            container.layer.addSublayer(playerLayer)
            playerLayer.frame = container.bounds

            container.setNeedsLayout()
            container.layoutIfNeeded()

            // Create PiP controller from playerLayer
            if #available(iOS 14.0, *) {
                self.pipController = AVPictureInPictureController(playerLayer: playerLayer)
            } else {
                self.pipController = AVPictureInPictureController(playerLayer: playerLayer)
            }
            self.pipController?.delegate = self
            
            // HACK: Try to hide controls by setting requiresLinearPlayback to true
            self.pipController?.requiresLinearPlayback = true
            
            // HACK: Use KVC to set private/hidden property 'controlsStyle' to 1 (which often corresponds to minimal/hidden controls)
            self.pipController?.setValue(1, forKey: "controlsStyle")
            
            // Also try to disable external playback controls on the player
            player.allowsExternalPlayback = false

            // Activate audio session (helps PiP readiness)
            do {
                try AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback, options: .mixWithOthers)
                try AVAudioSession.sharedInstance().setActive(true)
            } catch {
                NSLog("⚠️ [PipModule] audio session error: %@", error.localizedDescription)
            }

            // Play briefly so system gets a frame; then pause to keep PiP paused by default
            player.play()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.06) {
                player.pause()

                guard let pip = self.pipController else {
                    NSLog("❌ [PipModule] pipController missing")
                    return
                }

                NSLog("📱 [PipModule] pip.isPictureInPicturePossible = \(pip.isPictureInPicturePossible)")
                if pip.isPictureInPicturePossible {
                    pip.startPictureInPicture()
                    NSLog("✅ [PipModule] started PiP (offscreen-layer)")

                    // DEV: Attempt to send app to background automatically to mimic Android (private API).
                    // This is ONLY executed in DEBUG builds. DO NOT enable for release/App Store.
                    #if DEBUG
                    self.suspendAppDevIfNeeded()
                    #endif

                } else {
                    // Retry a couple times if needed
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                        if pip.isPictureInPicturePossible {
                            pip.startPictureInPicture()
                            NSLog("✅ [PipModule] started PiP (retry)")
                            #if DEBUG
                            self.suspendAppDevIfNeeded()
                            #endif
                        } else {
                            NSLog("❌ [PipModule] PiP not possible even after retry")
                        }
                    }
                }
            }
        }
    }

    // MARK: - DEV-only suspend hack (private API) — runs only in DEBUG builds
    private func suspendAppDevIfNeeded() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) {
            NSLog("⚠️ [PipModule] DEV only: attempting UIApplication.suspend() to simulate auto-minimize")
            let sel = NSSelectorFromString("suspend")
            if UIApplication.shared.responds(to: sel) {
                UIApplication.shared.perform(sel)
            } else {
                NSLog("⚠️ [PipModule] UIApplication.suspend() not available on this runtime")
            }
        }
    }

    // MARK: - AVPictureInPictureControllerDelegate
    public func pictureInPictureControllerDidStartPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        NSLog("✅ [PipModule] pictureInPictureControllerDidStartPictureInPicture")
    }

    public func pictureInPictureControllerDidStopPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        NSLog("ℹ️ [PipModule] pictureInPictureControllerDidStopPictureInPicture - cleaning")
        cleanup()
    }

    // Called when user taps PiP to restore/expand. We notify RN and attempt deep-link to card screen.
    public func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController,
                                           restoreUserInterfaceForPictureInPictureStopWithCompletionHandler completionHandler: @escaping (Bool) -> Void) {
        NSLog("📱 [PipModule] restoreUserInterfaceForPictureInPictureStopWithCompletionHandler called")

        if let cardId = pendingCardId {
            NotificationCenter.default.post(name: Notification.Name("PipModuleDidRequestRestore"), object: nil, userInfo: ["cardId": cardId])

            if let encoded = cardId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
               let url = URL(string: "cardywall://card-details/\(encoded)"),
               UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url, options: [:], completionHandler: { success in
                    NSLog("📱 [PipModule] attempted openURL cardywall:// result: \(success)")
                })
            }
        }

        // Delay completion handler slightly to let app start navigating
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            completionHandler(true)
        }

        // Delay cleanup significantly to keep player layer visible during transition
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
            self.cleanup()
        }
    }

    public func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController, failedToStartPictureInPictureWithError error: Error) {
        NSLog("❌ [PipModule] failedToStart PiP: %@", error.localizedDescription)
        cleanup()
    }

    // MARK: - Cleanup
    private func cleanup() {
        DispatchQueue.main.async {
            if let player = self.currentPlayer {
                player.pause()
            }
            self.currentPlayer = nil

            if let container = self.pipContainerView {
                container.removeFromSuperview()
                self.pipContainerView = nil
            }

            self.pipController = nil

            if let u = self.tempVideoUrl {
                try? FileManager.default.removeItem(at: u)
                self.tempVideoUrl = nil
            }

            self.pendingCardId = nil
        }
    }

    deinit {
        cleanup()
    }
}

// MARK: - UIImage helpers
private extension UIImage {
    // Renders the image into a new UIImage with orientation .up (fixes upside-down / rotated images)
    func normalizedImage() -> UIImage {
        if self.imageOrientation == .up {
            return self
        }

        UIGraphicsBeginImageContextWithOptions(self.size, false, self.scale)
        self.draw(in: CGRect(origin: .zero, size: self.size))
        let normalized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        return normalized ?? self
    }
}