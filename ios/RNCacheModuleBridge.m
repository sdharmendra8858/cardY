// ios/RNCacheModuleBridge.m

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CacheModule, NSObject)

RCT_EXTERN_METHOD(clearAppCache:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
