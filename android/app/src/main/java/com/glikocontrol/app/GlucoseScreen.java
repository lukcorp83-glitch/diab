package com.glikocontrol.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.CarColor;
import androidx.car.app.model.CarIcon;
import androidx.car.app.model.MessageTemplate;
import androidx.car.app.model.Pane;
import androidx.car.app.model.PaneTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import androidx.core.graphics.drawable.IconCompat;

import androidx.lifecycle.DefaultLifecycleObserver;
import androidx.lifecycle.LifecycleOwner;

public class GlucoseScreen extends Screen {

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable refreshRunnable = new Runnable() {
        @Override
        public void run() {
            invalidate(); // Triggers onGetTemplate to refresh data
            handler.postDelayed(this, 30000); // 30 seconds
        }
    };

    public GlucoseScreen(@NonNull CarContext carContext) {
        super(carContext);
        getLifecycle().addObserver(new DefaultLifecycleObserver() {
            @Override
            public void onStart(@NonNull LifecycleOwner owner) {
                handler.post(refreshRunnable);
            }

            @Override
            public void onStop(@NonNull LifecycleOwner owner) {
                handler.removeCallbacks(refreshRunnable);
            }
        });
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        SharedPreferences prefs = getCarContext().getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String glucose = prefs.getString("widget_glucose", "---");
        String arrow = prefs.getString("widget_arrow", "");
        String delta = prefs.getString("widget_delta", "---");
        String time = prefs.getString("widget_time", "Brak");

        Row mainRow = new Row.Builder()
                .setTitle("Cukier: " + glucose + " " + arrow)
                .addText("Zmiana: " + delta + " mg/dL")
                .addText("Ostatni odczyt: " + time)
                .build();

        Pane pane = new Pane.Builder()
                .addRow(mainRow)
                .build();

        return new PaneTemplate.Builder(pane)
                .setHeaderAction(Action.APP_ICON)
                .setTitle("GlikoControl")
                .build();
    }
}
