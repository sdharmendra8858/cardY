package com.anonymous.cardy;

import android.app.PictureInPictureParams;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import org.json.JSONObject;
import android.content.Intent;
import android.content.res.Configuration;
import android.view.View;
import android.util.Log;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.widget.ImageView;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import java.io.InputStream;
import java.io.FileNotFoundException;
import androidx.annotation.Nullable;
import androidx.lifecycle.Lifecycle;

public class PipCardActivity extends AppCompatActivity {
    private ImageView imageView;
    private boolean wasInPip = false;
    private boolean pipExitCallbackReceived = false;
    private boolean hasNavigated = false;
    private Rational pipAspectRatio = null;
    private boolean pipRequested = false;

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        Log.d("PipCardActivity", "onPictureInPictureModeChanged: isInPiP=" + isInPictureInPictureMode);
        if (isInPictureInPictureMode) {
            wasInPip = true;
            pipExitCallbackReceived = false;
            Log.d("PipCardActivity", "PiP event: ENTER");
        } else {
            // Exiting PiP: use Lifecycle state to classify expand vs close
            Lifecycle.State lifecycleState = getLifecycle().getCurrentState();
            boolean isExpanded = lifecycleState.isAtLeast(Lifecycle.State.STARTED);

            Intent original = getIntent();
            String cardId = original.getStringExtra("CARD_ID");

            if (isExpanded) {
                Log.d("PipCardActivity", "PiP event: EXPAND to full-screen → redirecting");
                pipExitCallbackReceived = true;
                if (!hasNavigated) {
                    try {
                        Intent back = new Intent(this, MainActivity.class);
                        back.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                        if (cardId != null) {
                            back.putExtra("route", "card-details");
                            back.putExtra("cardId", cardId);
                        }
                        startActivity(back);
                        hasNavigated = true;
                        finish();
                    } catch (Exception ignored) {}
                }
            } else {
                Log.d("PipCardActivity", "PiP event: CLOSE (X pressed)");
                // Ensure the PiP activity fully closes to avoid stuck transition states
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        finishAndRemoveTask();
                    } else {
                        finish();
                    }
                } catch (Exception ignored) {}
            }
        }
    }

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        imageView = new ImageView(this);
        imageView.setScaleType(ImageView.ScaleType.CENTER_CROP);
        setContentView(imageView);

        Intent intent = getIntent();
        String imageUriString = intent.getStringExtra("IMAGE_URI");
        String cardId = intent.getStringExtra("CARD_ID");

        if (imageUriString != null) {
            Uri imageUri = Uri.parse(imageUriString);
            Log.d("PipCardActivity", "🖼 Received image: " + imageUriString);

            try {
                InputStream inputStream = getContentResolver().openInputStream(imageUri);
                Bitmap bitmap = BitmapFactory.decodeStream(inputStream);
                if (bitmap != null) {
                    imageView.setImageBitmap(bitmap);
                    pipAspectRatio = new Rational(bitmap.getWidth(), bitmap.getHeight());

                    // ✅ Enter Picture-in-Picture mode once image is loaded
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        PictureInPictureParams params = new PictureInPictureParams.Builder()
                                .setAspectRatio(pipAspectRatio)
                                .build();
                        if (!isInPictureInPictureMode()) {
                            enterPictureInPictureMode(params);
                            pipRequested = true;
                        }
                        try { moveTaskToBack(true); } catch (Exception ignored) {}
                    }
                } else {
                    Log.e("PipCardActivity", "❌ Failed to decode bitmap from URI: " + imageUriString);
                }
            } catch (FileNotFoundException e) {
                Log.e("PipCardActivity", "💥 Image file not found: " + imageUriString, e);
            } catch (Exception e) {
                Log.e("PipCardActivity", "💥 Failed to load image for PiP", e);
            }
        } else {
            Log.w("PipCardActivity", "⚠️ No IMAGE_URI found in intent extras.");
        }
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        Log.d("PipCardActivity", "onUserLeaveHint: attempting to enter PiP");
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O && !isInPictureInPictureMode() && !pipRequested) {
            Rational aspectRatio = pipAspectRatio != null ? pipAspectRatio : new Rational(16, 9);
            PictureInPictureParams params = new PictureInPictureParams.Builder()
                    .setAspectRatio(aspectRatio)
                    .build();
            Log.d("PipCardActivity", "Entering PiP with aspect ratio: " + aspectRatio.getNumerator() + ":" + aspectRatio.getDenominator());
            enterPictureInPictureMode(params);
            pipRequested = true;
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        boolean inPip = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                inPip = isInPictureInPictureMode();
            } catch (Exception ignored) {}
        }
        Log.d("PipCardActivity", "onStop: finishing=" + isFinishing() + ", inPiP=" + inPip);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (wasInPip && !pipExitCallbackReceived) {
            Log.d("PipCardActivity", "PiP event: CLOSE (PiP window dismissed)");
        }
        // Best-effort cleanup of temporary image file if provided via file:// URI
        try {
            Intent original = getIntent();
            String imageUriString = original != null ? original.getStringExtra("IMAGE_URI") : null;
            if (imageUriString != null && imageUriString.startsWith("file://")) {
                Uri uri = Uri.parse(imageUriString);
                getContentResolver().delete(uri, null, null);
            }
        } catch (Exception ignored) {}
        Log.d("PipCardActivity", "onDestroy: finishing=" + isFinishing());
    }
}