package com.glikocontrol.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Handler;
import android.os.Looper;
import android.service.dreams.DreamService;
import android.view.View;
import android.widget.TextView;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Random;

public class GlikoBedsideDreamService extends DreamService {

    private TextView clockText;
    private TextView dateText;
    private TextView glucoseText;
    private TextView arrowText;
    private TextView deltaText;
    private TextView infoText;
    private View contentBox;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Random random = new Random();
    private Runnable updateRunnable;
    private int shiftCounter = 0;

    @Override
    public void onAttachedToWindow() {
        super.onAttachedToWindow();
        // Dotknięcie ekranu natychmiast wygasza i odblokowuje/budzi telefon
        setInteractive(false);
        setFullscreen(true);
        // Przyciemniony ekran dla ochrony oczu w nocy
        setScreenBright(false);
        setContentView(R.layout.bedside_dream_layout);

        clockText = findViewById(R.id.dream_clock);
        dateText = findViewById(R.id.dream_date);
        glucoseText = findViewById(R.id.dream_glucose);
        arrowText = findViewById(R.id.dream_arrow);
        deltaText = findViewById(R.id.dream_delta);
        infoText = findViewById(R.id.dream_info);
        contentBox = findViewById(R.id.dream_content_box);
    }

    @Override
    public void onDreamingStarted() {
        super.onDreamingStarted();

        updateRunnable = new Runnable() {
            @Override
            public void run() {
                updateClockAndData();
                shiftCounter++;
                // Co 60 sekund wykonujemy przesunięcie pikseli (pixel-shift) dla ochrony matrycy OLED
                if (shiftCounter >= 60) {
                    shiftCounter = 0;
                    applyPixelShift();
                }
                handler.postDelayed(this, 1000);
            }
        };

        // Pierwsza natychmiastowa aktualizacja
        updateClockAndData();
        applyPixelShift();
        handler.postDelayed(updateRunnable, 1000);
    }

    @Override
    public void onDreamingStopped() {
        if (updateRunnable != null) {
            handler.removeCallbacks(updateRunnable);
            updateRunnable = null;
        }
        super.onDreamingStopped();
    }

    @Override
    public void onDetachedFromWindow() {
        if (updateRunnable != null) {
            handler.removeCallbacks(updateRunnable);
            updateRunnable = null;
        }
        super.onDetachedFromWindow();
    }

    private void updateClockAndData() {
        try {
            Date now = new Date();
            SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
            SimpleDateFormat dateFormat = new SimpleDateFormat("EEE, d MMM", Locale.getDefault());

            if (clockText != null) {
                clockText.setText(timeFormat.format(now));
            }
            if (dateText != null) {
                dateText.setText(dateFormat.format(now));
            }

            // Odczyt danych telemetrycznych z SharedPreferences widżetów
            SharedPreferences prefs = getSharedPreferences("GlikoWidgetPrefs", Context.MODE_PRIVATE);
            String glucose = prefs.getString("widget_glucose", "---");
            String arrow = prefs.getString("widget_arrow", "");
            String delta = prefs.getString("widget_delta", "---");
            String time = prefs.getString("widget_time", "Brak danych");
            String iob = prefs.getString("widget_iob", "");

            int targetMin = 70;
            int targetMax = 180;
            try {
                targetMin = Integer.parseInt(prefs.getString("widget_target_min", "70"));
                targetMax = Integer.parseInt(prefs.getString("widget_target_max", "180"));
            } catch (Exception ignored) {}

            int glucoseVal = -1;
            try {
                glucoseVal = Integer.parseInt(glucose.trim());
            } catch (Exception ignored) {}

            int textColor = Color.parseColor("#FBBF24"); // Ciepły bursztyn OLED (domyślny)
            if (glucoseVal > 0) {
                if (glucoseVal < targetMin) {
                    textColor = Color.parseColor("#F43F5E"); // Delikatna czerwień / hipoglikemia
                } else if (glucoseVal > targetMax) {
                    textColor = Color.parseColor("#FB923C"); // Pomarańcz / hiperglikemia
                }
            }

            if (glucoseText != null) {
                glucoseText.setText(glucose);
                glucoseText.setTextColor(textColor);
            }
            if (arrowText != null) {
                arrowText.setText(arrow);
                arrowText.setTextColor(textColor);
            }
            if (deltaText != null) {
                if ("---".equals(delta) || delta.isEmpty()) {
                    deltaText.setText("");
                } else {
                    deltaText.setText(delta.startsWith("+") || delta.startsWith("-") ? delta + " mg/dL" : "+" + delta + " mg/dL");
                }
            }
            if (infoText != null) {
                StringBuilder info = new StringBuilder(time);
                if (iob != null && !iob.isEmpty() && !"0".equals(iob) && !"0.0".equals(iob)) {
                    info.append(" • IOB: ").append(iob).append("U");
                }
                infoText.setText(info.toString());
            }
        } catch (Exception ignored) {}
    }

    private void applyPixelShift() {
        if (contentBox == null) return;
        try {
            float density = getResources().getDisplayMetrics().density;
            // Losowe przesunięcie w zakresie od -10dp do +10dp
            float dx = (random.nextInt(21) - 10) * density;
            float dy = (random.nextInt(21) - 10) * density;
            contentBox.setTranslationX(dx);
            contentBox.setTranslationY(dy);
        } catch (Exception ignored) {}
    }
}
