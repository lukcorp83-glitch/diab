package com.glikocontrol.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.os.Build;
import androidx.core.content.ContextCompat;

@CapacitorPlugin(name = "WidgetUpdater")
public class WidgetUpdaterPlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        try {
            String url = call.getString("url");
            String secret = call.getString("secret");
            String targetMin = call.getString("targetMin");
            String targetMax = call.getString("targetMax");

            SharedPreferences prefs = getContext().getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            if (url != null) {
                editor.putString("widget_ns_url", url);
            }
            if (secret != null) {
                editor.putString("widget_ns_secret", secret);
            }
            if (targetMin != null) {
                editor.putString("widget_target_min", targetMin);
            }
            if (targetMax != null) {
                editor.putString("widget_target_max", targetMax);
            }
            editor.apply();

            // Uruchomienie natychmiastowego pobierania danych z Nightscout w tle
            NightscoutFetcher.fetchAndUpdate(getContext(), null, null);

            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to update widget preferences", e);
        }
    }

    @PluginMethod
    public void getDebugInfo(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            ret.put("lastSyncTime", prefs.getString("widget_last_sync_time", "Brak"));
            ret.put("lastSyncStatus", prefs.getString("widget_last_sync_status", "UNKNOWN"));
            ret.put("lastSyncError", prefs.getString("widget_last_sync_error", ""));
            ret.put("lastSyncCode", prefs.getInt("widget_last_sync_code", 0));
            ret.put("lastUrlUsed", prefs.getString("widget_last_sync_url_used", ""));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get debug info", e);
        }
    }

    @PluginMethod
    public void pushData(PluginCall call) {
        try {
            String glucose = call.getString("glucose", "---");
            String arrow = call.getString("arrow", "");
            String deltaStr = call.getString("delta", "---");
            String time = call.getString("time", "Brak danych");

            SharedPreferences prefs = getContext().getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            editor.putString("widget_glucose", glucose);
            editor.putString("widget_arrow", arrow);
            editor.putString("widget_delta", deltaStr);
            editor.putString("widget_time", time);
            editor.apply();

            // Odświeżamy widżety od razu - jeśli ns_url jest pusty, użyją zapisanych wyżej danych!
            NightscoutFetcher.fetchAndUpdate(getContext(), null, null);

            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to push data to widgets", e);
        }
    }

    @PluginMethod
    public void getMaterialYouColors(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                Context context = getContext();
                int primaryLight = ContextCompat.getColor(context, android.R.color.system_accent1_500);
                int primaryDark = ContextCompat.getColor(context, android.R.color.system_accent1_300);
                int primaryLighter = ContextCompat.getColor(context, android.R.color.system_accent1_100);
                int primaryDarker = ContextCompat.getColor(context, android.R.color.system_accent1_900);
                
                ret.put("supported", true);
                ret.put("primary500", String.format("#%06X", (0xFFFFFF & primaryLight)));
                ret.put("primary400", String.format("#%06X", (0xFFFFFF & primaryDark)));
                ret.put("primary100", String.format("#%06X", (0xFFFFFF & primaryLighter)));
                ret.put("primary900", String.format("#%06X", (0xFFFFFF & primaryDarker)));
                call.resolve(ret);
                return;
            } catch (Exception e) {
                // fallback if missing
            }
        }
        ret.put("supported", false);
        call.resolve(ret);
    }
}
