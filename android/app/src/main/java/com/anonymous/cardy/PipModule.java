package com.anonymous.cardy;

import android.content.Intent;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import android.app.Activity;
import android.os.Build;
import android.util.Rational;
import android.app.PictureInPictureParams;
import android.content.Intent;
import com.facebook.react.bridge.Callback;
import android.util.Log;


public class PipModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

    public PipModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @Override
    public String getName() {
        return "PipModule";
    }

    @ReactMethod
    public void openPip(String videoPath) {
        Activity activity = getCurrentActivity();
        if (activity != null) {
            Intent intent = new Intent(activity, PipCardActivity.class);
            intent.putExtra("videoPath", videoPath);
            activity.startActivity(intent);
        }
    }

    @ReactMethod
    public void enterPipMode(String imageUri, String cardId) {
        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            Log.e("PipModule", "❌ Current activity is null, cannot start PiP.");
            return;
        }
    
        // Only Android O (API 26) and above support PiP
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                // ✅ Create intent for PipCardActivity
                Intent intent = new Intent(currentActivity, PipCardActivity.class);
                intent.putExtra("IMAGE_URI", imageUri);
                intent.putExtra("CARD_ID", cardId);
    
                // Important flags when starting from React context
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
    
                // ✅ Start the PiP activity
                currentActivity.startActivity(intent);

                Log.i("PipModule", "🎬 Launched PipCardActivity with image: " + imageUri + ", cardId=" + cardId);
            } catch (Exception e) {
                Log.e("PipModule", "💥 Failed to start PiP activity", e);
            }
        } else {
            Log.w("PipModule", "⚠️ PiP not supported on this Android version");
        }
    }
}