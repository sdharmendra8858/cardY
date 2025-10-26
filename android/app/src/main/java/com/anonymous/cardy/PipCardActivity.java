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

public class PipCardActivity extends AppCompatActivity {
    private ImageView imageView;

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        if (!isInPictureInPictureMode) {
            // PiP closed or expanded back to full-screen – navigate to CardDetails and finish
            Intent original = getIntent();
            String imageUriString = original.getStringExtra("IMAGE_URI");
            String cardId = original.getStringExtra("CARD_ID");

            // Delete the temporary image file if it's a file:// uri
            try {
                if (imageUriString != null && imageUriString.startsWith("file://")) {
                    Uri uri = Uri.parse(imageUriString);
                    getContentResolver().delete(uri, null, null);
                }
            } catch (Exception ignored) {}

            try {
                Intent back = new Intent(this, MainActivity.class);
                back.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                if (cardId != null) {
                    back.putExtra("route", "card-details");
                    back.putExtra("cardId", cardId);
                }
                startActivity(back);
            } catch (Exception ignored) {}

            finish();
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

                    // ✅ Enter Picture-in-Picture mode once image is loaded
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        PictureInPictureParams params = new PictureInPictureParams.Builder()
                                .setAspectRatio(new Rational(bitmap.getWidth(), bitmap.getHeight()))
                                .build();
                        enterPictureInPictureMode(params);
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
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            Rational aspectRatio = new Rational(16, 9);
            PictureInPictureParams params = new PictureInPictureParams.Builder()
                    .setAspectRatio(aspectRatio)
                    .build();
            enterPictureInPictureMode(params);
        }
    }
}