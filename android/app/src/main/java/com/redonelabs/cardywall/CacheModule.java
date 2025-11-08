package com.redonelabs.cardywall;

import android.content.Context;
import android.util.Log;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import java.io.File;

public class CacheModule extends ReactContextBaseJavaModule {
    private static final String TAG = "CacheModule";
    private final ReactApplicationContext reactContext;

    public CacheModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "CacheModule";
    }

    @ReactMethod
    public void clearAppCache(Promise promise) {
        try {
            Context context = reactContext.getApplicationContext();
            File cacheDir = context.getCacheDir();
            File externalCacheDir = context.getExternalCacheDir();

            clearDirectory(cacheDir);

            if (externalCacheDir != null) {
                clearDirectory(externalCacheDir);
            }

            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error clearing cache", e);
            promise.reject("CACHE_ERROR", e);
        }
    }

    private void clearDirectory(File dir) {
        if (dir == null || !dir.exists())
            return;
        File[] children = dir.listFiles();
        if (children == null)
            return;
        for (File child : children) {
            if (child.isDirectory()) {
                clearDirectory(child);
            }
            child.delete();
        }
    }
}