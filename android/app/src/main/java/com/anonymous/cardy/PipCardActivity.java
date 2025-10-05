package com.anonymous.cardy;

import android.app.PictureInPictureParams;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.widget.TextView;
import android.widget.Button;
import androidx.appcompat.app.AppCompatActivity;
import org.json.JSONObject;

public class PipCardActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pip_card);

        String cardJson = getIntent().getStringExtra("card");

        // Find views
        TextView cardHolderText = findViewById(R.id.cardHolderText);
        TextView cardNumberText = findViewById(R.id.cardNumberText);
        Button actionButton = findViewById(R.id.actionButton);

        // Populate card info immediately
        try {
            JSONObject card = new JSONObject(cardJson);
            cardHolderText.setText("Card Holder: " + card.getString("cardHolder"));
            cardNumberText.setText("Card Number: " + card.getString("cardNumber"));
        } catch (Exception e) {
            e.printStackTrace();
        }

        actionButton.setOnClickListener(v -> {
            // Optional PiP action
            System.out.println("Button clicked in PiP mode");
        });

        // Enter PiP immediately
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Rational aspectRatio = new Rational(16, 9);
            PictureInPictureParams params = new PictureInPictureParams.Builder()
                    .setAspectRatio(aspectRatio)
                    .build();
            enterPictureInPictureMode(params);
        }
    }
}