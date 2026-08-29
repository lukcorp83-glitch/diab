package com.glikocontrol.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.provider.Settings;
import android.content.ComponentName;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NotificationBridge")
public class NotificationBridgePlugin extends Plugin {

    private BroadcastReceiver receiver;

    @Override
    public void load() {
        super.load();
        
        // Listen to broadcasts from GlucoseNotificationListener
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (GlucoseNotificationListener.ACTION_GLUCOSE_RECEIVED.equals(intent.getAction())) {
                    int glucose = intent.getIntExtra("glucose", -1);
                    float iob = intent.getFloatExtra("iob", -1);
                    String pkg = intent.getStringExtra("package");

                    JSObject ret = new JSObject();
                    ret.put("glucose", glucose);
                    ret.put("iob", iob);
                    ret.put("package", pkg);
                    
                    notifyListeners("glucoseNotificationReceived", ret);
                } else if (GlucoseNotificationListener.ACTION_NOTIFICATION_DEBUG.equals(intent.getAction())) {
                    String pkg = intent.getStringExtra("package");
                    String title = intent.getStringExtra("title");
                    String text = intent.getStringExtra("text");

                    JSObject ret = new JSObject();
                    ret.put("package", pkg);
                    ret.put("title", title);
                    ret.put("text", text);
                    
                    notifyListeners("notificationDebug", ret);
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(GlucoseNotificationListener.ACTION_GLUCOSE_RECEIVED);
        filter.addAction(GlucoseNotificationListener.ACTION_NOTIFICATION_DEBUG);

        // We use ContextCompat.registerReceiver to ensure compatibility across all Android versions
        androidx.core.content.ContextCompat.registerReceiver(getContext(), receiver, filter, androidx.core.content.ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (receiver != null) {
            getContext().unregisterReceiver(receiver);
        }
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        boolean isEnabled = NotificationManagerCompat.getEnabledListenerPackages(getContext())
                .contains(getContext().getPackageName());
                
        JSObject ret = new JSObject();
        ret.put("granted", isEnabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        
        call.resolve();
    }

    @PluginMethod
    public void requestActiveNotifications(PluginCall call) {
        Intent intent = new Intent(GlucoseNotificationListener.ACTION_REQUEST_ACTIVE);
        intent.setPackage(getContext().getPackageName());
        getContext().sendBroadcast(intent);
        call.resolve();
    }

    @PluginMethod
    public void getGlucoseHistory(PluginCall call) {
        android.content.SharedPreferences prefs = getContext().getSharedPreferences("GlikoWidgetPrefs", Context.MODE_PRIVATE);
        String history = prefs.getString("glucose_history", "");
        
        JSObject ret = new JSObject();
        ret.put("history", history);
        
        // Clear history after sending it to avoid processing the same values again later
        prefs.edit().putString("glucose_history", "").apply();
        
        call.resolve(ret);
    }

    @PluginMethod
    public void updateForegroundNotification(PluginCall call) {
        String title = call.getString("title", "GlikoControl");
        String text = call.getString("text", "GlikoSense działa w tle");

        Intent notificationIntent = new Intent(getContext(), MainActivity.class);
        android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(
                getContext(),
                0,
                notificationIntent,
                android.app.PendingIntent.FLAG_IMMUTABLE | android.app.PendingIntent.FLAG_UPDATE_CURRENT
        );

        android.app.NotificationManager notificationManager = (android.app.NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) {
            call.resolve();
            return;
        }

        android.content.SharedPreferences prefs = getContext().getSharedPreferences("GlikoWidgetPrefs", Context.MODE_PRIVATE);
        String glucose = prefs.getString("widget_glucose", null);
        
        if (glucose != null && !glucose.equals("---") && !glucose.isEmpty() && (text.contains("Pętla zamknięta") || text.contains("GlikoSense"))) {
            String arrow = prefs.getString("widget_arrow", "");
            String deltaStr = prefs.getString("widget_delta", "");
            String time = prefs.getString("widget_time", "") + " (wznowiono)";
            
            int color = android.graphics.Color.parseColor("#10B981"); // Default green
            try {
                int bgVal = Integer.parseInt(glucose);
                if (bgVal > 180) color = android.graphics.Color.parseColor("#F59E0B");
                else if (bgVal < 70) color = android.graphics.Color.parseColor("#EF4444");
            } catch (Exception ignored) {}
            
            android.widget.RemoteViews notifViews = new android.widget.RemoteViews(getContext().getPackageName(), R.layout.notification_glucose);
            notifViews.setTextViewText(R.id.notif_glucose_val, glucose);
            notifViews.setTextColor(R.id.notif_glucose_val, color);
            notifViews.setTextViewText(R.id.notif_glucose_arrow, arrow);
            notifViews.setTextColor(R.id.notif_glucose_arrow, color);
            notifViews.setTextViewText(R.id.notif_glucose_delta, deltaStr);
            notifViews.setTextViewText(R.id.notif_glucose_time, time);
            
            android.widget.RemoteViews expandedViews = new android.widget.RemoteViews(getContext().getPackageName(), R.layout.notification_glucose_expanded);
            expandedViews.setTextViewText(R.id.notif_glucose_val, glucose);
            expandedViews.setTextColor(R.id.notif_glucose_val, color);
            expandedViews.setTextViewText(R.id.notif_glucose_arrow, arrow);
            expandedViews.setTextColor(R.id.notif_glucose_arrow, color);
            expandedViews.setTextViewText(R.id.notif_glucose_delta, deltaStr);
            expandedViews.setTextViewText(R.id.notif_glucose_time, time);
            
            androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(getContext(), "gliko_foreground_service_v3")
                    .setSmallIcon(R.drawable.ic_stat_name)
                    .setCustomContentView(notifViews)
                    .setCustomBigContentView(expandedViews)
                    .setOngoing(true)
                    .setContentIntent(pendingIntent)
                    .setPriority(androidx.core.app.NotificationCompat.PRIORITY_LOW);

            notificationManager.notify(999, builder.build());
        } else {
            androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(getContext(), "gliko_foreground_service_v3")
                    .setContentTitle(title)
                    .setContentText(text)
                    .setSmallIcon(R.drawable.ic_stat_name)
                    .setContentIntent(pendingIntent)
                    .setOngoing(true)
                    .setPriority(androidx.core.app.NotificationCompat.PRIORITY_LOW);

            notificationManager.notify(999, builder.build());
        }
        
        call.resolve();
    }

    private void createMealTimerChannel() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            android.app.NotificationManager notificationManager = (android.app.NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                android.app.NotificationChannel channel = new android.app.NotificationChannel(
                        "gliko_meal_timer_v1",
                        "Odliczanie do posiłku (Timer)",
                        android.app.NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Wyświetla biegnący stoper odliczający czas do posiłku na pasku stanu i ekranie blokady");
                channel.setShowBadge(true);
                channel.enableVibration(true);
                channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    @PluginMethod
    public void startLiveTimer(PluginCall call) {
        long targetTime = 0;
        try {
            Long targetObj = call.getLong("targetTime");
            if (targetObj != null && targetObj > 0) {
                targetTime = targetObj;
            } else {
                Double targetDouble = call.getDouble("targetTime");
                if (targetDouble != null && targetDouble > 0) {
                    targetTime = targetDouble.longValue();
                }
            }
        } catch (Exception e) {
            targetTime = System.currentTimeMillis() + 15 * 60 * 1000L;
        }

        if (targetTime <= 0) {
            targetTime = System.currentTimeMillis() + 15 * 60 * 1000L;
        }

        String title = call.getString("title", "Czas do posiłku 🍽️");
        String text = call.getString("text", "Odliczanie przedposiłkowe w toku...");
        int notificationId = call.getInt("id", 777);

        createMealTimerChannel();

        android.app.NotificationManager notificationManager = (android.app.NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) {
            call.resolve();
            return;
        }

        Intent appIntent = new Intent(getContext(), MainActivity.class);
        appIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(
                getContext(),
                notificationId,
                appIntent,
                android.app.PendingIntent.FLAG_IMMUTABLE | android.app.PendingIntent.FLAG_UPDATE_CURRENT
        );

        long remainingMs = targetTime - System.currentTimeMillis();
        int remainingMinutes = (int) Math.max(1, Math.ceil(remainingMs / 60000.0));
        String pillText = remainingMinutes + " min";
        android.graphics.Bitmap pillIcon = NightscoutFetcher.createPillBadgeBitmap(getContext(), pillText, remainingMs <= 0);

        androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(getContext(), "gliko_meal_timer_v1")
                .setSmallIcon(R.drawable.ic_stat_name)
                .setContentTitle(title)
                .setContentText(text)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setWhen(targetTime)
                .setShowWhen(true)
                .setOngoing(true)
                .setAutoCancel(false)
                .setOnlyAlertOnce(true)
                .setContentIntent(pendingIntent)
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                .setCategory(androidx.core.app.NotificationCompat.CATEGORY_ALARM)
                .setVisibility(androidx.core.app.NotificationCompat.VISIBILITY_PUBLIC);

        if (pillIcon != null) {
            builder.setLargeIcon(pillIcon);
        }

        notificationManager.notify(notificationId, builder.build());
        call.resolve();
    }

    @PluginMethod
    public void stopLiveTimer(PluginCall call) {
        int notificationId = call.getInt("id", 777);
        android.app.NotificationManager notificationManager = (android.app.NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.cancel(notificationId);
        }
        call.resolve();
    }

    @PluginMethod
    public void syncAlertPreferences(PluginCall call) {
        try {
            android.content.SharedPreferences prefs = getContext().getSharedPreferences("GlikoWidgetPrefs", Context.MODE_PRIVATE);
            android.content.SharedPreferences.Editor editor = prefs.edit();

            if (call.hasOption("hypoEnabled")) {
                editor.putBoolean("widget_hypo_alerts_enabled", call.getBoolean("hypoEnabled", true));
            }
            if (call.hasOption("hyperEnabled")) {
                editor.putBoolean("widget_hyper_alerts_enabled", call.getBoolean("hyperEnabled", true));
            }
            if (call.hasOption("targetMin")) {
                editor.putString("widget_target_min", String.valueOf(call.getInt("targetMin", 70)));
            }
            if (call.hasOption("targetMax")) {
                editor.putString("widget_target_max", String.valueOf(call.getInt("targetMax", 180)));
            }
            editor.apply();
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void triggerNativeGlucoseAlert(PluginCall call) {
        try {
            String title = call.getString("title", "Alert Glikemii");
            String body = call.getString("body", "Sprawdź poziom cukru");
            boolean isHigh = call.getBoolean("isHigh", false);
            int value = call.getInt("value", 0);

            android.app.NotificationManager manager = (android.app.NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    android.app.NotificationChannel alertChannel = new android.app.NotificationChannel(
                            "glucose_alerts_v2",
                            "Alerty Glikemii",
                            android.app.NotificationManager.IMPORTANCE_HIGH
                    );
                    alertChannel.setDescription("Głośne alarmy wysokiego i niskiego poziomu cukru z unikalnym dźwiękiem");

                    android.net.Uri alarmSound = android.net.Uri.parse("android.resource://" + getContext().getPackageName() + "/" + R.raw.critical_alarm);
                    android.media.AudioAttributes audioAttributes = new android.media.AudioAttributes.Builder()
                            .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                            .build();
                    alertChannel.setSound(alarmSound, audioAttributes);
                    alertChannel.enableVibration(true);
                    alertChannel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500});
                    manager.createNotificationChannel(alertChannel);
                }

                Intent intentDefault = new Intent(getContext(), MainActivity.class);
                android.app.PendingIntent pendingIntentDefault = android.app.PendingIntent.getActivity(
                        getContext(),
                        200 + (int)(System.currentTimeMillis() % 10000),
                        intentDefault,
                        android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
                );

                androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(getContext(), "glucose_alerts_v2")
                        .setSmallIcon(R.drawable.ic_stat_name)
                        .setContentTitle(title)
                        .setContentText(body)
                        .setStyle(new androidx.core.app.NotificationCompat.BigTextStyle().bigText(body))
                        .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                        .setCategory(androidx.core.app.NotificationCompat.CATEGORY_ALARM)
                        .setAutoCancel(true)
                        .setOnlyAlertOnce(false)
                        .setSound(android.net.Uri.parse("android.resource://" + getContext().getPackageName() + "/" + R.raw.critical_alarm))
                        .setVibrate(new long[]{0, 500, 200, 500, 200, 500})
                        .setContentIntent(pendingIntentDefault);

                manager.notify(2, builder.build());
            }
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }
}
