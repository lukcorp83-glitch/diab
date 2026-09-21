package com.glikocontrol.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

public class XDripBroadcastReceiver extends BroadcastReceiver {

    private static final String TAG = "XDripBroadcastReceiver";

    // Broadcast actions from xDrip+
    public static final String XDRIP_ACTION_BG_ESTIMATE = "com.eveningoutpost.dexdrip.BgEstimate";
    public static final String NS_ACTION_DBACCESS = "info.nightscout.client.DBACCESS";
    public static final String NS_ACTION_NEW_TREATMENT = "info.nightscout.client.NEW_TREATMENT";

    // Internal app actions
    public static final String ACTION_TREATMENT_RECEIVED = "com.glikocontrol.app.TREATMENT_RECEIVED";

    // Deduplication memory guards
    private static long lastHandledTime = 0;
    private static int lastHandledGlucose = -1;
    private static String lastTreatmentKey = "";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();

        // 1. OBSŁUGA GLIKEMII (BgEstimate)
        if (XDRIP_ACTION_BG_ESTIMATE.equals(action)) {
            handleBgEstimate(context, intent);
            return;
        }

        // 2. OBSŁUGA ZABIEGÓW (DBACCESS - Treatments)
        if (NS_ACTION_DBACCESS.equals(action)) {
            handleDbAccess(context, intent);
            return;
        }

        // 3. OBSŁUGA ZABIEGÓW (NEW_TREATMENT)
        if (NS_ACTION_NEW_TREATMENT.equals(action)) {
            handleNewTreatment(context, intent);
            return;
        }
    }

    private void handleBgEstimate(Context context, Intent intent) {
        try {
            Bundle bundle = intent.getExtras();
            if (bundle == null) return;

            // Extract glucose value from standard xDrip Extras keys
            double bg = -1.0;
            if (bundle.containsKey("com.eveningoutpost.dexdrip.Extras.BgEstimate")) {
                bg = bundle.getDouble("com.eveningoutpost.dexdrip.Extras.BgEstimate", -1.0);
            } else if (bundle.containsKey("raw")) {
                bg = bundle.getDouble("raw", -1.0);
            } else if (bundle.containsKey("sgv")) {
                bg = bundle.getDouble("sgv", -1.0);
            }

            int glucoseValue = (int) Math.round(bg);
            if (glucoseValue < 30 || glucoseValue > 500) {
                Log.w(TAG, "Invalid glucose value received from xDrip: " + bg);
                return;
            }

            // Extract timestamp
            long time = bundle.getLong("com.eveningoutpost.dexdrip.Extras.Time", System.currentTimeMillis());
            if (time <= 0) {
                time = System.currentTimeMillis();
            }

            // Deduplication guard in memory
            if (glucoseValue == lastHandledGlucose && Math.abs(time - lastHandledTime) < 30000) {
                Log.d(TAG, "Skipping duplicate broadcast event for glucose " + glucoseValue);
                return;
            }
            lastHandledGlucose = glucoseValue;
            lastHandledTime = time;

            // Extract slope / trend direction
            String slopeName = bundle.getString("com.eveningoutpost.dexdrip.Extras.BgSlopeName", "Flat");
            double delta = bundle.getDouble("com.eveningoutpost.dexdrip.Extras.Delta", 0.0);

            // Optional sensor battery (Dexcom / MiaoMiao / Bubble)
            int sensorBattery = -1;
            if (bundle.containsKey("com.eveningoutpost.dexdrip.Extras.SensorBattery")) {
                sensorBattery = bundle.getInt("com.eveningoutpost.dexdrip.Extras.SensorBattery", -1);
            }

            Log.i(TAG, "Received xDrip broadcast! Glucose: " + glucoseValue + " mg/dL, Trend: " + slopeName + ", Delta: " + delta);

            // 1. Update SharedPreferences for Android Widgets
            try {
                SharedPreferences prefs = context.getSharedPreferences("GlikoWidgetPrefs", Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();

                String oldGlucoseStr = prefs.getString("widget_glucose", "");
                int calculatedDelta = 0;
                String deltaStr = "---";
                if (delta != 0.0) {
                    calculatedDelta = (int) Math.round(delta);
                    deltaStr = (calculatedDelta > 0 ? "+" : "") + calculatedDelta;
                } else if (!oldGlucoseStr.isEmpty() && !oldGlucoseStr.equals("---")) {
                    try {
                        int oldGlucose = Integer.parseInt(oldGlucoseStr);
                        calculatedDelta = glucoseValue - oldGlucose;
                        deltaStr = (calculatedDelta > 0 ? "+" : "") + calculatedDelta;
                    } catch (Exception ignored) {}
                }

                SimpleDateFormat sdf = new SimpleDateFormat("HH:mm", Locale.getDefault());
                String formattedTime = sdf.format(new Date(time));

                editor.putString("widget_glucose", String.valueOf(glucoseValue));
                editor.putString("widget_time", formattedTime);
                if (!deltaStr.equals("---")) {
                    editor.putString("widget_delta", deltaStr);
                }
                if (sensorBattery > 0) {
                    editor.putInt("widget_sensor_battery", sensorBattery);
                }

                // Map xDrip slopeName to arrow symbols
                String arrow = "→";
                if (slopeName != null) {
                    switch (slopeName) {
                        case "DoubleUp":
                            arrow = "⇈";
                            break;
                        case "SingleUp":
                            arrow = "↑";
                            break;
                        case "FortyFiveUp":
                            arrow = "↗";
                            break;
                        case "FortyFiveDown":
                            arrow = "↘";
                            break;
                        case "SingleDown":
                            arrow = "↓";
                            break;
                        case "DoubleDown":
                            arrow = "⇊";
                            break;
                        case "Flat":
                        default:
                            arrow = "→";
                            break;
                    }
                }
                editor.putString("widget_arrow", arrow);

                // Save to glucose_history for immediate UI pickup
                String history = prefs.getString("glucose_history", "");
                String newEntry = glucoseValue + ":" + time + ":com.eveningoutpost.dexdrip";

                List<String> historyList = new ArrayList<>();
                if (!history.isEmpty()) {
                    historyList.addAll(Arrays.asList(history.split("\\|")));
                }

                boolean shouldAdd = true;
                if (!historyList.isEmpty()) {
                    String lastEntry = historyList.get(historyList.size() - 1);
                    String[] parts = lastEntry.split(":");
                    if (parts.length >= 2) {
                        try {
                            int lastVal = Integer.parseInt(parts[0]);
                            long lastTime = Long.parseLong(parts[1]);
                            if (lastVal == glucoseValue && Math.abs(time - lastTime) < 30 * 1000) {
                                shouldAdd = false; // Deduplicate
                            }
                        } catch (Exception ignored) {}
                    }
                }

                if (shouldAdd) {
                    historyList.add(newEntry);
                    while (historyList.size() > 100) {
                        historyList.remove(0);
                    }
                    editor.putString("glucose_history", android.text.TextUtils.join("|", historyList));
                }

                editor.apply();

                // 2. Trigger updates for Android widgets
                Intent widgetUpdate1 = new Intent(context, GlucoseWidget.class);
                widgetUpdate1.setAction("com.glikocontrol.app.ACTION_AUTO_UPDATE");
                context.sendBroadcast(widgetUpdate1);

                Intent widgetUpdate2 = new Intent(context, GlucoseFlowerWidget.class);
                widgetUpdate2.setAction("com.glikocontrol.app.ACTION_AUTO_UPDATE");
                context.sendBroadcast(widgetUpdate2);

                Intent widgetUpdate3 = new Intent(context, GlucosePillWidget.class);
                widgetUpdate3.setAction("com.glikocontrol.app.ACTION_AUTO_UPDATE");
                context.sendBroadcast(widgetUpdate3);

            } catch (Exception e) {
                Log.e(TAG, "Failed updating SharedPreferences from xDrip broadcast", e);
            }

            // 3. Broadcast to GlikoControl Capacitor Bridge (NotificationBridgePlugin)
            Intent localBroadcast = new Intent(GlucoseNotificationListener.ACTION_GLUCOSE_RECEIVED);
            localBroadcast.setPackage(context.getPackageName());
            localBroadcast.putExtra("glucose", glucoseValue);
            localBroadcast.putExtra("iob", -1f);
            localBroadcast.putExtra("package", "com.eveningoutpost.dexdrip");
            localBroadcast.putExtra("trend", slopeName);
            localBroadcast.putExtra("delta", delta);
            localBroadcast.putExtra("timestamp", time);
            context.sendBroadcast(localBroadcast);

        } catch (Exception e) {
            Log.e(TAG, "Error processing xDrip broadcast intent", e);
        }
    }

    private void handleDbAccess(Context context, Intent intent) {
        try {
            Bundle bundle = intent.getExtras();
            if (bundle == null) return;

            String dbAction = bundle.getString("action");
            String collection = bundle.getString("collection");
            if (!"dbAdd".equals(dbAction) || !"treatments".equals(collection)) {
                return;
            }

            String dataStr = bundle.getString("data");
            if (dataStr == null || dataStr.isEmpty()) return;

            JSONObject json = new JSONObject(dataStr);
            double insulin = json.optDouble("insulin", 0.0);
            double carbs = json.optDouble("carbs", 0.0);
            String eventType = json.optString("eventType", "");
            String notes = json.optString("notes", "");
            String createdAt = json.optString("created_at", "");

            long time = System.currentTimeMillis();
            if (!createdAt.isEmpty()) {
                try {
                    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                    sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                    Date d = sdf.parse(createdAt);
                    if (d != null) time = d.getTime();
                } catch (Exception e) {
                    try {
                        SimpleDateFormat sdf2 = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
                        sdf2.setTimeZone(TimeZone.getTimeZone("UTC"));
                        Date d2 = sdf2.parse(createdAt);
                        if (d2 != null) time = d2.getTime();
                    } catch (Exception ignored) {}
                }
            }

            broadcastTreatment(context, insulin, carbs, eventType, notes, time);

        } catch (Exception e) {
            Log.e(TAG, "Error handling DBACCESS treatments from xDrip", e);
        }
    }

    private void handleNewTreatment(Context context, Intent intent) {
        try {
            Bundle bundle = intent.getExtras();
            if (bundle == null) return;

            double insulin = bundle.getDouble("insulin", 0.0);
            double carbs = bundle.getDouble("carbs", 0.0);
            String eventType = bundle.getString("eventType", "");
            String notes = bundle.getString("notes", "");
            long time = bundle.getLong("timestamp", System.currentTimeMillis());

            if (insulin == 0.0 && carbs == 0.0 && bundle.containsKey("treatment")) {
                String treatmentStr = bundle.getString("treatment");
                if (treatmentStr != null && !treatmentStr.isEmpty()) {
                    try {
                        JSONObject json = new JSONObject(treatmentStr);
                        insulin = json.optDouble("insulin", 0.0);
                        carbs = json.optDouble("carbs", 0.0);
                        if (eventType.isEmpty()) eventType = json.optString("eventType", "");
                        if (notes.isEmpty()) notes = json.optString("notes", "");
                    } catch (Exception ignored) {}
                }
            }

            broadcastTreatment(context, insulin, carbs, eventType, notes, time);

        } catch (Exception e) {
            Log.e(TAG, "Error handling NEW_TREATMENT from xDrip", e);
        }
    }

    private void broadcastTreatment(Context context, double insulin, double carbs, String eventType, String notes, long time) {
        if (insulin <= 0 && carbs <= 0 && (notes == null || notes.isEmpty())) {
            return;
        }

        // Deduplication key
        String dedupKey = insulin + ":" + carbs + ":" + (time / 60000);
        if (dedupKey.equals(lastTreatmentKey)) {
            Log.d(TAG, "Duplicate treatment broadcast ignored: " + dedupKey);
            return;
        }
        lastTreatmentKey = dedupKey;

        Log.i(TAG, "Received xDrip treatment! Insulin: " + insulin + " U, Carbs: " + carbs + " g, Event: " + eventType);

        // Store into SharedPreferences treatment_history
        try {
            SharedPreferences prefs = context.getSharedPreferences("GlikoWidgetPrefs", Context.MODE_PRIVATE);
            String hist = prefs.getString("treatment_history", "");
            String sanitizedEvent = eventType != null ? eventType.replace(";", " ").replace("|", " ") : "";
            String sanitizedNotes = notes != null ? notes.replace(";", " ").replace("|", " ") : "";
            String entry = insulin + ";" + carbs + ";" + time + ";" + sanitizedEvent + ";" + sanitizedNotes;

            if (!hist.isEmpty()) {
                hist = hist + "|" + entry;
            } else {
                hist = entry;
            }
            prefs.edit().putString("treatment_history", hist).apply();
        } catch (Exception e) {
            Log.e(TAG, "Error saving treatment to SharedPreferences", e);
        }

        // Send local broadcast to NotificationBridgePlugin
        Intent localBroadcast = new Intent(ACTION_TREATMENT_RECEIVED);
        localBroadcast.setPackage(context.getPackageName());
        localBroadcast.putExtra("insulin", insulin);
        localBroadcast.putExtra("carbs", carbs);
        localBroadcast.putExtra("eventType", eventType);
        localBroadcast.putExtra("notes", notes);
        localBroadcast.putExtra("timestamp", time);
        context.sendBroadcast(localBroadcast);
    }
}