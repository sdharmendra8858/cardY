//
//  RNPipModule.swift
//  CardyWall
//
//  Updated: uses static KVO context to avoid Swift exclusive-access crash.
//

import Foundation
import UIKit
import AVKit
import AVFoundation
import React

@objc(PipModule)
public class PipModule: NSObject, RCTBridgeModule, AVPictureInPictureControllerDelegate {

    // MARK: - Properties
    var pipController: AVPictureInPictureController?
    var playerLayer: AVPlayerLayer?
    var player: AVPlayer?
    var pipContainerView: UIView?
    private var observedPlayerItem: AVPlayerItem?

    // Use a static variable for KVO context (avoids Swift exclusive-access issues)
    private static var playerItemContext = 0
    private static var playerRateContext = 0

    // MARK: - RCTBridgeModule
    public static func moduleName() -> String! {
        return "PipModule"
    }

    @objc
    public static func requiresMainQueueSetup() -> Bool {
        return true
    }

    // MARK: - Public entry
    @objc
    func enterPipMode(_ imageUri: String, cardId: String) {
        NSLog("📱 [PipModule] enterPipMode called with URI: %@", imageUri)

        // Robust URL parsing for local files and URLs
        var url: URL?
        if imageUri.hasPrefix("file://") {
            let path = imageUri.replacingOccurrences(of: "file://", with: "")
            url = URL(fileURLWithPath: path)
        } else if let u = URL(string: imageUri), u.scheme != nil {
            url = u
        } else {
            url = URL(fileURLWithPath: imageUri)
        }

        guard let fileUrl = url else {
            NSLog("❌ [PipModule] Invalid URL after parsing: %@", imageUri)
            return
        }

        DispatchQueue.global(qos: .userInitiated).async {
            do {
                NSLog("📱 [PipModule] Loading image data from: %@", fileUrl.path)

                let fileManager = FileManager.default
                if !fileManager.fileExists(atPath: fileUrl.path) {
                    NSLog("❌ [PipModule] File does not exist at path: %@", fileUrl.path)
                    return
                }

                if !fileManager.isReadableFile(atPath: fileUrl.path) {
                    NSLog("❌ [PipModule] File is not readable at path: %@", fileUrl.path)
                    return
                }

                NSLog("✅ [PipModule] File exists and is readable")
                let data = try Data(contentsOf: fileUrl)
                NSLog("✅ [PipModule] Loaded %ld bytes of image data", data.count)

                guard let image = UIImage(data: data) else {
                    NSLog("❌ [PipModule] Failed to create UIImage from data")
                    return
                }
                NSLog("✅ [PipModule] Image loaded successfully. Size: %.0fx%.0f", image.size.width, image.size.height)
                NSLog("📱 [PipModule] Creating video...")

                self.createVideoFromImage(image: image) { videoUrl in
                    guard let videoUrl = videoUrl else {
                        NSLog("❌ [PipModule] Failed to create video")
                        return
                    }
                    NSLog("✅ [PipModule] Video created at: %@", videoUrl.path)

                    DispatchQueue.main.async {
                        self.startPip(videoUrl: videoUrl)
                    }
                }
            } catch {
                NSLog("❌ [PipModule] Error loading image: %@", error.localizedDescription)
            }
        }
    }

    // MARK: - PiP Start
    func startPip(videoUrl: URL) {
        NSLog("📱 [PipModule] startPip called with video: %@", videoUrl.path)

        guard AVPictureInPictureController.isPictureInPictureSupported() else {
            NSLog("❌ [PipModule] PiP not supported on this device")
            return
        }
        NSLog("✅ [PipModule] PiP is supported")

        // Setup player and layer
        NSLog("📱 [PipModule] Setting up player...")
        let asset = AVAsset(url: videoUrl)
        let playerItem = AVPlayerItem(asset: asset)
        self.player = AVPlayer(playerItem: playerItem)
        self.player?.actionAtItemEnd = .pause
        self.player?.isMuted = true
        self.player?.volume = 0.0
        
        // Disable all external playback controls
        self.player?.allowsExternalPlayback = false
        self.player?.preventsDisplaySleepDuringVideoPlayback = false

        self.playerLayer = AVPlayerLayer(player: self.player)
        self.playerLayer?.videoGravity = .resizeAspectFill
        NSLog("✅ [PipModule] Player configured")

        // Find key window in iOS13+ safe manner
        NSLog("📱 [PipModule] Finding key window...")
        var keyWindow: UIWindow? = nil
        if #available(iOS 13.0, *) {
            keyWindow = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap { $0.windows }
                .first { $0.isKeyWindow }
        } else {
            keyWindow = UIApplication.shared.keyWindow
        }

        guard let keyWindowUnwrapped = keyWindow else {
            NSLog("❌ [PipModule] No key window found")
            return
        }
        NSLog("✅ [PipModule] Key window found")

        // Create container view with a real non-zero size
        NSLog("📱 [PipModule] Creating PiP container view (320x180)...")
        let size = CGSize(width: 320, height: 180)
        let pipView = UIView(frame: CGRect(x: 0, y: 0, width: size.width, height: size.height))
        pipView.backgroundColor = .clear
        pipView.alpha = 0.01
        pipView.isUserInteractionEnabled = false

        // keep a strong ref
        self.pipContainerView = pipView

        keyWindowUnwrapped.addSubview(pipView)
        pipView.setNeedsLayout()
        pipView.layoutIfNeeded()

        // Add player layer after layout
        if let playerLayer = self.playerLayer {
            pipView.layer.addSublayer(playerLayer)
            playerLayer.frame = pipView.bounds
        }

        NSLog("✅ [PipModule] PiP view created and added to window (bounds: \(pipView.bounds))")

        // Initialize PiP controller
        NSLog("📱 [PipModule] Initializing AVPictureInPictureController...")
        if let playerLayer = self.playerLayer {
            self.pipController = AVPictureInPictureController(playerLayer: playerLayer)
            self.pipController?.delegate = self
            
            // Disable playback controls in PiP window
            self.pipController?.requiresLinearPlayback = true
            
            NSLog("✅ [PipModule] PiP controller initialized (controls disabled)")
        } else {
            NSLog("❌ [PipModule] playerLayer missing")
            return
        }

        // Audio session
        NSLog("📱 [PipModule] Setting up audio session...")
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback, options: .mixWithOthers)
            try AVAudioSession.sharedInstance().setActive(true)
            NSLog("✅ [PipModule] Audio session configured")
        } catch {
            NSLog("❌ [PipModule] Failed to set audio session: %@", error.localizedDescription)
        }

        // Observe readiness of player item
        NSLog("📱 [PipModule] Adding KVO observer for playerItem.status")

        // Ensure addObserver and assignment happen on main thread to avoid races
        if Thread.isMainThread {
            self.observedPlayerItem = playerItem
            playerItem.addObserver(self, forKeyPath: "status", options: [.initial, .new], context: &Self.playerItemContext)
            // Observe player rate to prevent playback
            self.player?.addObserver(self, forKeyPath: "rate", options: [.new], context: &Self.playerRateContext)
        } else {
            DispatchQueue.main.sync {
                self.observedPlayerItem = playerItem
                playerItem.addObserver(self, forKeyPath: "status", options: [.initial, .new], context: &Self.playerItemContext)
                // Observe player rate to prevent playback
                self.player?.addObserver(self, forKeyPath: "rate", options: [.new], context: &Self.playerRateContext)
            }
        }

        self.player?.pause()
        self.player?.seek(to: CMTime.zero)
        NSLog("📱 [PipModule] Player prepared and paused (ready for PiP)")
    }

    // MARK: - Video creation (image -> short mp4)
    func createVideoFromImage(image: UIImage, completion: @escaping (URL?) -> Void) {
        let outputSize = CGSize(width: 1280, height: 720)
        let settings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: outputSize.width,
            AVVideoHeightKey: outputSize.height
        ]

        let filename = UUID().uuidString + ".mp4"
        let fileUrl = FileManager.default.temporaryDirectory.appendingPathComponent(filename)

        if FileManager.default.fileExists(atPath: fileUrl.path) {
            try? FileManager.default.removeItem(at: fileUrl)
        }

        guard let assetWriter = try? AVAssetWriter(outputURL: fileUrl, fileType: .mp4) else {
            completion(nil)
            return
        }

        let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: writerInput, sourcePixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32ARGB),
            kCVPixelBufferWidthKey as String: outputSize.width,
            kCVPixelBufferHeightKey as String: outputSize.height
        ])

        assetWriter.add(writerInput)
        assetWriter.startWriting()
        assetWriter.startSession(atSourceTime: .zero)

        let buffer = self.pixelBuffer(from: image, size: outputSize)

        writerInput.requestMediaDataWhenReady(on: DispatchQueue(label: "videoGeneration")) {
            if let buffer = buffer {
                // Write ~1 second (30 frames)
                for i in 0...30 {
                    let time = CMTime(value: CMTimeValue(i), timescale: 30)
                    while !writerInput.isReadyForMoreMediaData {}
                    _ = adaptor.append(buffer, withPresentationTime: time)
                }
            }

            writerInput.markAsFinished()
            assetWriter.finishWriting {
                completion(fileUrl)
            }
        }
    }

    // MARK: - Pixel buffer helper
    func pixelBuffer(from image: UIImage, size: CGSize) -> CVPixelBuffer? {
        let attrs: [String: Any] = [
            kCVPixelBufferCGImageCompatibilityKey as String: true,
            kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
        ]

        var pixelBuffer: CVPixelBuffer?
        let status = CVPixelBufferCreate(kCFAllocatorDefault, Int(size.width), Int(size.height), kCVPixelFormatType_32ARGB, attrs as CFDictionary, &pixelBuffer)

        guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
            return nil
        }

        CVPixelBufferLockBaseAddress(buffer, [])
        let data = CVPixelBufferGetBaseAddress(buffer)

        let rgbColorSpace = CGColorSpaceCreateDeviceRGB()
        guard let context = CGContext(data: data, width: Int(size.width), height: Int(size.height), bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: rgbColorSpace, bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue) else {
            CVPixelBufferUnlockBaseAddress(buffer, [])
            return nil
        }

        context.translateBy(x: 0, y: size.height)
        context.scaleBy(x: 1.0, y: -1.0)

        UIGraphicsPushContext(context)
        image.draw(in: CGRect(x: 0, y: 0, width: size.width, height: size.height))
        UIGraphicsPopContext()

        CVPixelBufferUnlockBaseAddress(buffer, [])

        return buffer
    }

    // MARK: - AVPictureInPictureControllerDelegate
    public func pictureInPictureControllerDidStartPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        NSLog("✅ [PipModule] pictureInPictureControllerDidStartPictureInPicture")
    }

    public func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController, failedToStartPictureInPictureWithError error: Error) {
        NSLog("❌ [PipModule] failedToStart PiP: %@", error.localizedDescription)
    }

    public func pictureInPictureControllerDidStopPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
        NSLog("ℹ️ [PipModule] pictureInPictureControllerDidStopPictureInPicture - cleaning up")
        cleanupAfterStop()
    }

    // MARK: - Observe player item status (KVO)
    public override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        // Handle player rate changes to prevent playback
        if context == &Self.playerRateContext {
            if keyPath == "rate", let player = object as? AVPlayer {
                if player.rate > 0 {
                    NSLog("⚠️ [PipModule] Player tried to play, forcing pause")
                    player.pause()
                }
            }
            return
        }
        
        // Only handle our context pointer
        guard context == &Self.playerItemContext else {
            super.observeValue(forKeyPath: keyPath, of: object, change: change, context: context)
            return
        }

        if keyPath == "status", let playerItem = object as? AVPlayerItem {
            switch playerItem.status {
            case .readyToPlay:
                NSLog("📱 [PipModule] playerItem.readyToPlay. Checking PiP possibility...")
                DispatchQueue.main.async {
                    if let pipController = self.pipController {
                        NSLog("📱 [PipModule] pipController.isPictureInPicturePossible = \(pipController.isPictureInPicturePossible)")
                        if pipController.isPictureInPicturePossible {
                            NSLog("✅ [PipModule] Starting PiP now")
                            pipController.startPictureInPicture()
                        } else {
                            NSLog("⚠️ [PipModule] PiP not possible immediately; will re-check after layout")
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                if pipController.isPictureInPicturePossible {
                                    NSLog("✅ [PipModule] (delayed) Starting PiP now")
                                    pipController.startPictureInPicture()
                                } else {
                                    NSLog("❌ [PipModule] (delayed) PiP still not possible")
                                }
                            }
                        }
                    } else {
                        NSLog("❌ [PipModule] pipController missing when readyToPlay")
                    }
                }
            case .failed:
                NSLog("❌ [PipModule] playerItem failed: %@", String(describing: playerItem.error?.localizedDescription))
            default:
                NSLog("ℹ️ [PipModule] playerItem status: \(playerItem.status.rawValue)")
            }
        }
    }

    // MARK: - Cleanup
    private func cleanupAfterStop() {
        // Stop playback
        self.player?.pause()

        // Remove KVO observers safely on main thread
        if Thread.isMainThread {
            if let currentItem = self.observedPlayerItem {
                NSLog("📱 [PipModule] Removing KVO observer from playerItem")
                currentItem.removeObserver(self, forKeyPath: "status", context: &Self.playerItemContext)
                self.observedPlayerItem = nil
            }
            if let player = self.player {
                player.removeObserver(self, forKeyPath: "rate", context: &Self.playerRateContext)
            }
        } else {
            DispatchQueue.main.sync {
                if let currentItem = self.observedPlayerItem {
                    NSLog("📱 [PipModule] Removing KVO observer from playerItem")
                    currentItem.removeObserver(self, forKeyPath: "status", context: &Self.playerItemContext)
                    self.observedPlayerItem = nil
                }
                if let player = self.player {
                    player.removeObserver(self, forKeyPath: "rate", context: &Self.playerRateContext)
                }
            }
        }

        // Remove player layer and container
        self.playerLayer?.removeFromSuperlayer()
        self.pipContainerView?.removeFromSuperview()
        self.pipContainerView = nil

        // Null references
        self.player = nil
        self.playerLayer = nil
        self.pipController = nil

        // Deactivate audio session
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            NSLog("⚠️ [PipModule] error deactivating audio session: %@", error.localizedDescription)
        }
    }

    deinit {
        // Ensure KVO removed
        if let currentItem = self.observedPlayerItem {
            currentItem.removeObserver(self, forKeyPath: "status", context: &Self.playerItemContext)
            self.observedPlayerItem = nil
        }
        if let player = self.player {
            player.removeObserver(self, forKeyPath: "rate", context: &Self.playerRateContext)
        }
    }
}

