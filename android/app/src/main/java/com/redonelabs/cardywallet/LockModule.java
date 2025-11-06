package com.redonelabs.cardywallet;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class LockModule extends ReactContextBaseJavaModule implements ActivityEventListener {

    private static final int LOCK_REQUEST_CODE = 1001;
    private Promise lockPromise;

    public LockModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(this);
    }

    @NonNull
    @Override
    public String getName() {
        return "LockModule";
    }

    @ReactMethod
    public void authenticateUser(Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No active activity found");
            return;
        }

        KeyguardManager keyguardManager = (KeyguardManager) activity.getSystemService(Context.KEYGUARD_SERVICE);
        if (keyguardManager == null) {
            promise.reject("NO_KEYGUARD", "KeyguardManager not available");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            if (keyguardManager.isKeyguardSecure()) {
                Intent intent = keyguardManager.createConfirmDeviceCredentialIntent(
                        "Unlock Cardy", "Authenticate to continue");
                if (intent != null) {
                    lockPromise = promise;
                    activity.startActivityForResult(intent, LOCK_REQUEST_CODE);
                } else {
                    promise.reject("NO_INTENT", "Unable to show lock screen");
                }
            } else {
                promise.resolve(true); // no lock setup
            }
        } else {
            promise.reject("UNSUPPORTED", "Device not supported");
        }
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, @Nullable Intent data) {
        if (requestCode == LOCK_REQUEST_CODE && lockPromise != null) {
            if (resultCode == Activity.RESULT_OK) {
                lockPromise.resolve(true);
            } else {
                lockPromise.resolve(false);
            }
            lockPromise = null;
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
    }
}