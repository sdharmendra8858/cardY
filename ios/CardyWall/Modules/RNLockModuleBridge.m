// ios/YourApp/Modules/RNLockModuleBridge.m

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RNLockModule, NSObject)

RCT_EXTERN_METHOD(isDeviceSecure:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(authenticate:(NSString *)reason resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end