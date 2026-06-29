package com.glikocontrol.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

public class GlucoseTileService extends TileService {

    @Override
    public void onStartListening() {
        super.onStartListening();
        updateTile();
    }

    @Override
    public void onClick() {
        super.onClick();
        // Kliknięcie kafelka otwiera główną aktywność aplikacji
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivityAndCollapse(intent);
    }

    private void updateTile() {
        Tile tile = getQsTile();
        if (tile == null) return;

        SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        
        // Odczyt danych zapisanych w SharedPreferences
        String glucose = prefs.getString("widget_glucose", "---");
        String arrow = prefs.getString("widget_arrow", "");
        String delta = prefs.getString("widget_delta", "---");
        String time = prefs.getString("widget_time", "Brak danych");
        
        // Zbudowanie tekstu kafelka
        String label = glucose + " " + arrow;
        String subtitle = delta + " mg/dL (" + time + ")";

        tile.setLabel(label);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            tile.setSubtitle(subtitle);
        }
        
        // Ustawienie stanu kafelka (aktywny/nieaktywny)
        if ("---".equals(glucose) || glucose.isEmpty()) {
            tile.setState(Tile.STATE_INACTIVE);
        } else {
            tile.setState(Tile.STATE_ACTIVE);
        }

        tile.updateTile();
    }
}
