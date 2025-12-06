// ios/YourApp/Modules/RNPipModuleBridge.m

// Bridge file to expose Swift methods to React Native (Objective-C runtime)
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PipModule, NSObject)

RCT_EXTERN_METHOD(enterPipMode:(NSString *)imageUri cardId:(NSString *)cardId)

@end