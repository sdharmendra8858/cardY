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

public class PipCardActivity extends AppCompatActivity {
    private String cardJson;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pip_card);

        cardJson = getIntent().getStringExtra("card");

        Log.d("PipCardActivity", "onCreate: cardJson = " + cardJson);

        // Find views
        TextView cardHolderText = findViewById(R.id.cardHolderText);
        TextView cardNumberText = findViewById(R.id.cardNumberText);

        // Populate card info immediately
        try {
            JSONObject card = new JSONObject(cardJson);
            cardHolderText.setText("Card Holder: " + card.getString("cardHolder"));
            cardNumberText.setText("Card Number: " + card.getString("cardNumber"));
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Enter PiP immediately
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Rational aspectRatio = new Rational(16, 9);
            PictureInPictureParams params = new PictureInPictureParams.Builder()
                    .setAspectRatio(aspectRatio)
                    .setAutoEnterEnabled(true)
                    .build();
            enterPictureInPictureMode(params);

            moveTaskToBack(true);
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

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
    
        View pipLayout = findViewById(R.id.pipLayout);
        if (pipLayout == null) return;
    
        if (isInPictureInPictureMode) {
            pipLayout.setVisibility(View.VISIBLE);
        } else {
            pipLayout.setVisibility(View.GONE);
    
            String cardJson = getIntent().getStringExtra("card");
            String id = "";
    
            try {
                JSONObject card = new JSONObject(cardJson);
                id = card.optString("id", "");
            } catch (Exception e) {
                Log.e("PipCardActivity", "Error parsing card JSON", e);
            }
    
            Log.d("PipCardActivity", "PiP expanded. Opening card details for id=" + id);
    
            try {
                Intent intent = new Intent(this, MainActivity.class);
                intent.setAction(Intent.ACTION_VIEW);
                intent.setData(Uri.parse("cardy://card-details/" + id));
                startActivity(intent);
            } catch (Exception e) {
                Log.e("PipCardActivity", "Failed to open deep link", e);
            }
    
            // close this PiP activity to reset session
            finish();
        }
    }
}