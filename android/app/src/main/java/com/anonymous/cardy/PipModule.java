package com.anonymous.cardy;

import android.content.Intent;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

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
    public void openPip(String cardJson) {
        System.out.println(cardJson);
        Intent intent = new Intent(reactContext, PipCardActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.putExtra("card", cardJson);
        reactContext.startActivity(intent);
    }
}