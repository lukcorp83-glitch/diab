package com.glikocontrol.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Bitmap;
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
        android.graphics.Bitmap statusIcon = NightscoutFetcher.createStatusBarTimerBitmap(getContext(), remainingMinutes, remainingMs <= 0);

        androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(getContext(), "gliko_meal_timer_v1")
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
                .setGroup("gliko_live_timer_standalone")
                .setGroupSummary(false)
                .setSortKey("0_live_timer")
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                .setCategory(androidx.core.app.NotificationCompat.CATEGORY_ALARM)
                .setVisibility(androidx.core.app.NotificationCompat.VISIBILITY_PUBLIC);

        if (statusIcon != null) {
            builder.setSmallIcon(androidx.core.graphics.drawable.IconCompat.createWithBitmap(statusIcon));
        } else {
            builder.setSmallIcon(R.drawable.ic_stat_name);
        }

        if (pillIcon != null) {
            builder.setLargeIcon(pillIcon);
        }

        notificationManager.notify(notificationId, builder.build());

        // Zaplanuj automatyczną aktualizację minut na górnej belce oraz powiadomienie gotowości do posiłku
        scheduleTimerCompletionStatic(getContext(), notificationId, targetTime, pendingIntent);

        call.resolve();
    }

    private static android.os.Handler timerHandler = null;
    private static Runnable timerCompletionRunnable = null;

    public static synchronized android.os.Handler getTimerHandler() {
        if (timerHandler == null) {
            timerHandler = new android.os.Handler(android.os.Looper.getMainLooper());
        }
        return timerHandler;
    }

    public static void scheduleTimerCompletionStatic(final Context context, final int notificationId, final long targetTime, final android.app.PendingIntent pendingIntent) {
        if (timerCompletionRunnable != null) {
            getTimerHandler().removeCallbacks(timerCompletionRunnable);
            timerCompletionRunnable = null;
        }

        if (context == null) return;
        final Context appContext = context.getApplicationContext();

        timerCompletionRunnable = new Runnable() {
            @Override
            public void run() {
                try {
                    android.app.NotificationManager nm = (android.app.NotificationManager) appContext.getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm == null) return;

                    long remainingMs = targetTime - System.currentTimeMillis();
                    if (remainingMs <= 500) {
                        androidx.core.app.NotificationCompat.Builder readyBuilder = new androidx.core.app.NotificationCompat.Builder(appContext, "gliko_meal_timer_v1")
                                .setContentTitle("Czas na posiłek! 🍽️")
                                .setContentText("Odliczanie zakończone. Możesz już zjeść posiłek!")
                                .setUsesChronometer(false)
                                .setShowWhen(false)
                                .setOngoing(false)
                                .setAutoCancel(true)
                                .setOnlyAlertOnce(false)
                                .setGroup("gliko_live_timer_standalone")
                                .setGroupSummary(false)
                                .setSortKey("0_live_timer")
                                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                                .setCategory(androidx.core.app.NotificationCompat.CATEGORY_ALARM)
                                .setVisibility(androidx.core.app.NotificationCompat.VISIBILITY_PUBLIC)
                                .setContentIntent(pendingIntent);

                        android.graphics.Bitmap doneStatusIcon = NightscoutFetcher.createStatusBarTimerBitmap(appContext, 0, true);
                        if (doneStatusIcon != null) {
                            readyBuilder.setSmallIcon(androidx.core.graphics.drawable.IconCompat.createWithBitmap(doneStatusIcon));
                        } else {
                            readyBuilder.setSmallIcon(R.drawable.ic_stat_name);
                        }

                        android.graphics.Bitmap doneIcon = NightscoutFetcher.createPillBadgeBitmap(appContext, "JEŚĆ!", true);
                        if (doneIcon != null) {
                            readyBuilder.setLargeIcon(doneIcon);
                        }

                        nm.notify(notificationId, readyBuilder.build());
                        timerCompletionRunnable = null;
                    } else {
                        int mins = (int) Math.max(1, Math.ceil(remainingMs / 60000.0));
                        androidx.core.app.NotificationCompat.Builder updateBuilder = new androidx.core.app.NotificationCompat.Builder(appContext, "gliko_meal_timer_v1")
                                .setContentTitle("Czas do posiłku 🍽️")
                                .setContentText("Odliczanie przedposiłkowe w toku...")
                                .setUsesChronometer(true)
                                .setChronometerCountDown(true)
                                .setWhen(targetTime)
                                .setShowWhen(true)
                                .setOngoing(true)
                                .setAutoCancel(false)
                                .setOnlyAlertOnce(true)
                                .setContentIntent(pendingIntent)
                                .setGroup("gliko_live_timer_standalone")
                                .setGroupSummary(false)
                                .setSortKey("0_live_timer")
                                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                                .setCategory(androidx.core.app.NotificationCompat.CATEGORY_ALARM)
                                .setVisibility(androidx.core.app.NotificationCompat.VISIBILITY_PUBLIC);

                        android.graphics.Bitmap statusIcon = NightscoutFetcher.createStatusBarTimerBitmap(appContext, mins, false);
                        if (statusIcon != null) {
                            updateBuilder.setSmallIcon(androidx.core.graphics.drawable.IconCompat.createWithBitmap(statusIcon));
                        } else {
                            updateBuilder.setSmallIcon(R.drawable.ic_stat_name);
                        }

                        android.graphics.Bitmap pillIcon = NightscoutFetcher.createPillBadgeBitmap(appContext, mins + " min", false);
                        if (pillIcon != null) {
                            updateBuilder.setLargeIcon(pillIcon);
                        }

                        nm.notify(notificationId, updateBuilder.build());

                        long msToNextMin = remainingMs % 60000L;
                        if (msToNextMin <= 0) msToNextMin = 60000L;
                        long nextTickMs = Math.min(msToNextMin + 200L, Math.min(remainingMs, 15000L));
                        if (nextTickMs <= 0) nextTickMs = 1000L;
                        getTimerHandler().postDelayed(this, nextTickMs);
                    }
                } catch (Exception ignored) {}
            }
        };

        long remainingMs = targetTime - System.currentTimeMillis();
        if (remainingMs <= 500) {
            getTimerHandler().post(timerCompletionRunnable);
        } else {
            long msToNextMin = remainingMs % 60000L;
            if (msToNextMin <= 0) msToNextMin = 60000L;
            long nextTickMs = Math.min(msToNextMin + 200L, Math.min(remainingMs, 15000L));
            if (nextTickMs <= 0) nextTickMs = 1000L;
            getTimerHandler().postDelayed(timerCompletionRunnable, nextTickMs);
        }
    }

    public static void stopLiveTimerStatic(Context context, int notificationId) {
        if (timerCompletionRunnable != null) {
            getTimerHandler().removeCallbacks(timerCompletionRunnable);
            timerCompletionRunnable = null;
        }
        if (context != null) {
            android.app.NotificationManager notificationManager = (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                notificationManager.cancel(notificationId);
            }
        }
    }

    @PluginMethod
    public void stopLiveTimer(PluginCall call) {
        int notificationId = call.getInt("id", 777);
        stopLiveTimerStatic(getContext(), notificationId);
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
                    try {
                        String[] oldChannels = {"glucose_alerts", "glucose_alerts_v2", "glucose_alerts_v10", "glucose_alerts_v11", "glucose_alerts_v12", "glucose_alerts_v13", "glucose_alerts_v14", "glucose_alerts_v15", "glucose_alerts_v16", "glucose_alerts_v17", "glucose_alerts_v20"};
                        for (String ch : oldChannels) {
                            manager.deleteNotificationChannel(ch);
                        }
                    } catch (Exception ignored) {}

                    android.app.NotificationChannel alertChannel = new android.app.NotificationChannel(
                            "gliko_glucose_alerts_v25",
                            "🚨 Alerty Glikemii (Hipo / Hiper)",
                            android.app.NotificationManager.IMPORTANCE_HIGH
                    );
                    alertChannel.setDescription("Głośne alarmy wysokiego i niskiego poziomu cukru z unikalnym dźwiękiem MP3");

                    android.net.Uri alarmSound = android.net.Uri.parse("android.resource://" + getContext().getPackageName() + "/" + R.raw.status_clear);
                    android.media.AudioAttributes audioAttributes = new android.media.AudioAttributes.Builder()
                            .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                            .build();
                    alertChannel.setSound(alarmSound, audioAttributes);
                    alertChannel.enableVibration(true);
                    alertChannel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500});
                    alertChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
                    alertChannel.setBypassDnd(true);
                    manager.createNotificationChannel(alertChannel);
                }

                Intent intentDefault = new Intent(getContext(), MainActivity.class);
                intentDefault.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                android.app.PendingIntent pendingIntentDefault = android.app.PendingIntent.getActivity(
                        getContext(),
                        200 + (int)(System.currentTimeMillis() % 10000),
                        intentDefault,
                        android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
                );

                android.net.Uri soundUri = android.net.Uri.parse("android.resource://" + getContext().getPackageName() + "/" + R.raw.status_clear);

                androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(getContext(), "gliko_glucose_alerts_v25")
                        .setSmallIcon(R.drawable.ic_stat_name)
                        .setContentTitle(title)
                        .setContentText(body)
                        .setStyle(new androidx.core.app.NotificationCompat.BigTextStyle().bigText(body))
                        .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                        .setCategory(androidx.core.app.NotificationCompat.CATEGORY_ALARM)
                        .setVisibility(androidx.core.app.NotificationCompat.VISIBILITY_PUBLIC)
                        .setAutoCancel(true)
                        .setOnlyAlertOnce(false)
                        .setSound(soundUri)
                        .setVibrate(new long[]{0, 500, 200, 500, 200, 500})
                        .setContentIntent(pendingIntentDefault);

                manager.notify(2, builder.build());
            }
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void getMaterialYouColors(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                Context context = getContext();
                int c50 = context.getColor(android.R.color.system_accent1_50);
                int c100 = context.getColor(android.R.color.system_accent1_100);
                int c200 = context.getColor(android.R.color.system_accent1_200);
                int c300 = context.getColor(android.R.color.system_accent1_300);
                int c400 = context.getColor(android.R.color.system_accent1_400);
                int c500 = context.getColor(android.R.color.system_accent1_500);
                int c600 = context.getColor(android.R.color.system_accent1_600);
                int c700 = context.getColor(android.R.color.system_accent1_700);
                int c800 = context.getColor(android.R.color.system_accent1_800);
                int c900 = context.getColor(android.R.color.system_accent1_900);
                int c950 = context.getColor(android.R.color.system_accent1_1000);

                ret.put("supported", true);
                ret.put("color50", String.format("#%06X", (0xFFFFFF & c50)));
                ret.put("color100", String.format("#%06X", (0xFFFFFF & c100)));
                ret.put("color200", String.format("#%06X", (0xFFFFFF & c200)));
                ret.put("color300", String.format("#%06X", (0xFFFFFF & c300)));
                ret.put("color400", String.format("#%06X", (0xFFFFFF & c400)));
                ret.put("color500", String.format("#%06X", (0xFFFFFF & c500)));
                ret.put("color600", String.format("#%06X", (0xFFFFFF & c600)));
                ret.put("color700", String.format("#%06X", (0xFFFFFF & c700)));
                ret.put("color800", String.format("#%06X", (0xFFFFFF & c800)));
                ret.put("color900", String.format("#%06X", (0xFFFFFF & c900)));
                ret.put("color950", String.format("#%06X", (0xFFFFFF & c950)));
            } else {
                ret.put("supported", false);
            }
        } catch (Exception e) {
            ret.put("supported", false);
        }
        call.resolve(ret);
    }
}
