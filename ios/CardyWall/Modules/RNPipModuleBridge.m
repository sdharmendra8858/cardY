// ios/YourApp/Modules/RNPipModuleBridge.m

// Bridge file to expose Swift methods to React Native (Objective-C runtime)
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RNPipModule, NSObject)

RCT_EXTERN_METHOD(openURL:(NSString *)urlString resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(presentNativeScreen:(NSString *)title resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end