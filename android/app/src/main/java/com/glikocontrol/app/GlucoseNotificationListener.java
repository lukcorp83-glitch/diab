package com.glikocontrol.app;

import android.app.Notification;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class GlucoseNotificationListener extends NotificationListenerService {

    private static final String TAG = "GlucoseNotifListener";
    public static final String ACTION_GLUCOSE_RECEIVED = "com.glikocontrol.app.GLUCOSE_RECEIVED";
    public static final String ACTION_NOTIFICATION_DEBUG = "com.glikocontrol.app.NOTIFICATION_DEBUG";
    public static final String ACTION_REQUEST_ACTIVE = "com.glikocontrol.app.REQUEST_ACTIVE";

    private BroadcastReceiver requestReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (ACTION_REQUEST_ACTIVE.equals(intent.getAction())) {
                try {
                    StatusBarNotification[] active = getActiveNotifications();
                    if (active != null && active.length > 0) {
                        // Sort by post time descending
                        java.util.Arrays.sort(active, new java.util.Comparator<StatusBarNotification>() {
                            @Override
                            public int compare(StatusBarNotification a, StatusBarNotification b) {
                                return Long.compare(b.getPostTime(), a.getPostTime());
                            }
                        });
                        
                        java.util.HashSet<String> processedPackages = new java.util.HashSet<>();
                        for (StatusBarNotification sbn : active) {
                            String pkg = sbn.getPackageName();
                            if (pkg != null && !processedPackages.contains(pkg)) {
                                processedPackages.add(pkg);
                                // Tylko powiadomienia nie dające się "zwinąć" (trwałe - ongoing) lub najnowsze
                                // Wystarczy, że bierzemy najnowsze z danej paczki
                                onNotificationPosted(sbn);
                            }
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Failed to get active notifications", e);
                }
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        IntentFilter filter = new IntentFilter(ACTION_REQUEST_ACTIVE);
        androidx.core.content.ContextCompat.registerReceiver(this, requestReceiver, filter, androidx.core.content.ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            unregisterReceiver(requestReceiver);
        } catch (Exception e) {}
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;
        
        String packageName = sbn.getPackageName();
        
        // Check if it's Minimed Mobile or xDrip (we can filter by package or just parse everything if enabled)
        // Minimed packages often include "medtronic" or "minimed". xDrip is "com.eveningoutpost.dexdrip".
        // To be safe and broad, we will try to parse if we find "mg/dl" in the title.
        
        Notification notification = sbn.getNotification();
        if (notification == null || notification.extras == null) return;

        Bundle extras = notification.extras;
        String title = extras.getString(Notification.EXTRA_TITLE, "");
        String text = extras.getString(Notification.EXTRA_TEXT, "");
        
        CharSequence tickerText = notification.tickerText;
        CharSequence bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        CharSequence subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT);
        CharSequence titleBig = extras.getCharSequence(Notification.EXTRA_TITLE_BIG);
        
        if (title == null) title = "";
        if (text == null) text = "";

        StringBuilder sb = new StringBuilder();
        sb.append(title).append(" ").append(text).append(" ");
        if (tickerText != null) sb.append(tickerText).append(" ");
        if (bigText != null) sb.append(bigText).append(" ");
        if (subText != null) sb.append(subText).append(" ");
        if (titleBig != null) sb.append(titleBig).append(" ");
        
        String combined = sb.toString().replace("\n", " ");
        
        // Debug Broadcast (Always broadcast to see what we received)
        Intent debugIntent = new Intent(ACTION_NOTIFICATION_DEBUG);
        debugIntent.putExtra("package", packageName);
        debugIntent.putExtra("title", title);
        debugIntent.putExtra("text", text);
        sendBroadcast(debugIntent);

        // --- CRITICAL FIX: Prevent Infinite Loop & Spam ---
        if (packageName != null && packageName.equals(getApplicationContext().getPackageName())) {
            return; // NEVER process our own notifications!
        }

        boolean isKnownCGM = false;
        if (packageName != null) {
            String pkg = packageName.toLowerCase();
            if (pkg.contains("medtronic") || pkg.contains("minimed") || 
                pkg.contains("eveningoutpost") || pkg.contains("dexdrip") || 
                pkg.contains("juggluco") || pkg.contains("libre")) {
                isKnownCGM = true;
            }
        }

        String lowerCombined = combined.toLowerCase();
        if (!isKnownCGM && !lowerCombined.contains("mg/dl") && !lowerCombined.contains("mmol/l")) {
            return; // Ignore random notifications like WhatsApp, System, etc.
        }

        int glucoseValue = -1;
        float iobValue = -1;

        // Extract Glucose - First try to find a number explicitly followed by mg/dl or mmol/L
        Pattern explicitPattern = Pattern.compile("(\\d+[,.]\\d+|\\d+)\\s*(mg/dl|mmol/l)", Pattern.CASE_INSENSITIVE);
        Matcher explicitMatcher = explicitPattern.matcher(combined);
        
        boolean found = false;
        while (explicitMatcher.find()) {
            try {
                String valStr = explicitMatcher.group(1).replace(",", ".");
                float val = Float.parseFloat(valStr);
                String unit = explicitMatcher.group(2).toLowerCase();
                
                if (unit.contains("mmol") && val >= 2.0f && val <= 25.0f) {
                    glucoseValue = Math.round(val * 18.0f);
                    found = true;
                    break;
                } else if (unit.contains("mg") && val >= 30.0f && val <= 400.0f) {
                    glucoseValue = Math.round(val);
                    found = true;
                    break;
                }
            } catch (Exception e) {}
        }
        
        // If not found explicitly with unit, but it's a known CGM app, look for standalone numbers 
        // that make sense as glucose, avoiding common time formats (e.g. 12:30 -> don't match 12 or 30).
        if (!found && isKnownCGM) {
            // Remove time patterns like "12:30" or "23:59" so they don't get matched
            String sanitized = combined.replaceAll("\\b\\d{1,2}:\\d{2}\\b", " ");
            
            // Now look for any integer between 30 and 400
            Pattern standalonePattern = Pattern.compile("\\b(\\d{2,3})\\b");
            Matcher standaloneMatcher = standalonePattern.matcher(sanitized);
            
            while (standaloneMatcher.find()) {
                try {
                    int val = Integer.parseInt(standaloneMatcher.group(1));
                    if (val >= 30 && val <= 400) {
                        glucoseValue = val;
                        break;
                    }
                } catch (Exception e) {}
            }
        }

        // Extract IOB (Insulina aktywna)
        // Matches "0,000 j", "0.000 j", "1,5 j", "2 j"
        Pattern iobPattern = Pattern.compile("aktywna\\s+(\\d+[,.]\\d+|\\d+)\\s*j", Pattern.CASE_INSENSITIVE);
        Matcher iobMatcher = iobPattern.matcher(combined);
        if (iobMatcher.find()) {
            try {
                String iobStr = iobMatcher.group(1).replace(",", ".");
                iobValue = Float.parseFloat(iobStr);
            } catch (Exception e) {
                Log.e(TAG, "Failed to parse IOB", e);
            }
        }

        if (glucoseValue > 0) {
            Log.i(TAG, "Found glucose: " + glucoseValue + " and IOB: " + iobValue + " from " + packageName);
            // Broadcast to our Capacitor App
            Intent intent = new Intent(ACTION_GLUCOSE_RECEIVED);
            intent.setPackage(getPackageName());
            intent.putExtra("glucose", glucoseValue);
            intent.putExtra("iob", iobValue);
            intent.putExtra("package", packageName);
            sendBroadcast(intent);
            
            // Update Widgets directly via SharedPreferences
            try {
                android.content.SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                
                String oldGlucoseStr = prefs.getString("widget_glucose", "");
                int delta = 0;
                String deltaStr = "---";
                if (!oldGlucoseStr.isEmpty() && !oldGlucoseStr.equals("---")) {
                    try {
                        int oldGlucose = Integer.parseInt(oldGlucoseStr);
                        delta = glucoseValue - oldGlucose;
                        deltaStr = (delta > 0 ? "+" : "") + delta;
                    } catch(Exception e) {}
                }

                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault());
                String time = sdf.format(new java.util.Date());
                
                android.content.SharedPreferences.Editor editor = prefs.edit();
                editor.putString("widget_glucose", String.valueOf(glucoseValue));
                editor.putString("widget_time", time);
                if (!deltaStr.equals("---")) {
                    editor.putString("widget_delta", deltaStr);
                }
                // Arrow extraction could be implemented here if needed, or we rely on delta
                if (delta > 5) editor.putString("widget_arrow", "↑");
                else if (delta < -5) editor.putString("widget_arrow", "↓");
                else editor.putString("widget_arrow", "→");
                
                // SAVE HISTORY FOR REACT APP TO FETCH ON STARTUP
                String history = prefs.getString("glucose_history", "");
                long now = System.currentTimeMillis();
                String newEntry = glucoseValue + ":" + now + ":" + (packageName != null ? packageName : "unknown");
                
                java.util.List<String> historyList = new java.util.ArrayList<>();
                if (!history.isEmpty()) {
                    historyList.addAll(java.util.Arrays.asList(history.split("\\|")));
                }
                
                // Only add if the last entry's glucose is different or it's been more than 3 minutes
                boolean shouldAdd = true;
                if (!historyList.isEmpty()) {
                    String lastEntry = historyList.get(historyList.size() - 1);
                    String[] parts = lastEntry.split(":");
                    if (parts.length >= 2) {
                        try {
                            int lastVal = Integer.parseInt(parts[0]);
                            long lastTime = Long.parseLong(parts[1]);
                            if (lastVal == glucoseValue && (now - lastTime) < 3 * 60 * 1000) {
                                shouldAdd = false; // Deduplicate
                            }
                        } catch (Exception e) {}
                    }
                }
                
                if (shouldAdd) {
                    historyList.add(newEntry);
                    // Keep last 100 values to be safe
                    while(historyList.size() > 100) {
                        historyList.remove(0);
                    }
                    String newHistory = android.text.TextUtils.join("|", historyList);
                    editor.putString("glucose_history", newHistory);
                }
                
                editor.apply();
                
                // Trigger widget update
                Intent updateIntent = new Intent(this, GlucoseWidget.class);
                updateIntent.setAction("com.glikocontrol.app.ACTION_AUTO_UPDATE");
                sendBroadcast(updateIntent);
                
            } catch(Exception e) {
                Log.e(TAG, "Failed to update widgets from NotificationListener", e);
            }
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // Do nothing
    }
}
