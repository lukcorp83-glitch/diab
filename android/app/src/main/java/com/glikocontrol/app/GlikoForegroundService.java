package com.glikocontrol.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;

import androidx.core.app.NotificationCompat;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;

public class GlikoForegroundService extends Service implements SensorEventListener {

    private static final String CHANNEL_ID = "gliko_foreground_service_v3";
    private static final int FOREGROUND_ID = 999;
    private Handler handler;
    private Runnable runnable;
    private SensorManager sensorManager;
    private Sensor stepCounterSensor;
    private Sensor stepDetectorSensor;

    public static WebView headlessWebView;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();

        // Inicjalizacja sensora kroków w tle dla ciągłego zliczania
        try {
            sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
            if (sensorManager != null) {
                stepCounterSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
                stepDetectorSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR);
                if (stepCounterSensor != null) {
                    sensorManager.registerListener(this, stepCounterSensor, SensorManager.SENSOR_DELAY_NORMAL);
                } else if (stepDetectorSensor != null) {
                    sensorManager.registerListener(this, stepDetectorSensor, SensorManager.SENSOR_DELAY_NORMAL);
                }
            }
        } catch (Exception e) {
            android.util.Log.e("GlikoForegroundService", "Błąd rejestracji sensora kroków", e);
        }

        // Dynamiczna rejestracja XDripBroadcastReceiver w serwisie tła
        try {
            android.content.IntentFilter xdripFilter = new android.content.IntentFilter();
            xdripFilter.addAction(XDripBroadcastReceiver.XDRIP_ACTION_BG_ESTIMATE);
            xdripFilter.addAction(XDripBroadcastReceiver.NS_ACTION_DBACCESS);
            xdripFilter.addAction(XDripBroadcastReceiver.NS_ACTION_NEW_TREATMENT);
            androidx.core.content.ContextCompat.registerReceiver(
                this,
                new XDripBroadcastReceiver(),
                xdripFilter,
                androidx.core.content.ContextCompat.RECEIVER_EXPORTED
            );
            android.util.Log.i("GlikoForegroundService", "Zarejestrowano XDripBroadcastReceiver w GlikoForegroundService");
        } catch (Exception e) {
            android.util.Log.e("GlikoForegroundService", "Błąd rejestracji dynamicznej XDripBroadcastReceiver w tle", e);
        }
        
        // Inicjalizacja Headless WebView na głównym wątku UI
        handler = new Handler(Looper.getMainLooper());
        handler.post(new Runnable() {
            @Override
            public void run() {
                try {
                    headlessWebView = new WebView(GlikoForegroundService.this);
                    headlessWebView.getSettings().setJavaScriptEnabled(true);
                    headlessWebView.getSettings().setDomStorageEnabled(true);
                    
                    // Dodanie mostu do odbierania powiadomień z TFJS
                    headlessWebView.addJavascriptInterface(new Object() {
                        @JavascriptInterface
                        public void onPredictionResult(String predictionJson) {
                            android.util.Log.i("GlikoSenseML", "Wynik z Headless WebView: " + predictionJson);
                            try {
                                org.json.JSONObject result = new org.json.JSONObject(predictionJson);
                                boolean riskOfHypo = result.optBoolean("riskOfHypo", false);
                                int predicted = result.optInt("predictedNextHour", 100);
                                int currentBg = result.optInt("currentBg", 100);
                                
                                if (riskOfHypo && currentBg > 50) {
                                    // Spadek jest wykryty przez ML! Generujemy natywny alarm w tle!
                                    android.util.Log.w("GlikoSenseML", "RYZYKO HIPO WYKRYTE PRZEZ SIEC NEURONOWA! Przewidywane: " + predicted);
                                    
                                    android.app.NotificationManager notificationManager = (android.app.NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                                    
                                    String alarmChannelId = "gliko_ml_alarms";
                                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                                        android.app.NotificationChannel channel = new android.app.NotificationChannel(alarmChannelId, "Inteligentne Alarmy (GlikoSense)", android.app.NotificationManager.IMPORTANCE_HIGH);
                                        channel.setDescription("Alarmy generowane przez sztuczną inteligencję o nadchodzących spadkach.");
                                        // Dzwiek alarmu z assetów
                                        channel.setSound(android.provider.Settings.System.DEFAULT_ALARM_ALERT_URI, new android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_ALARM).setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
                                        channel.setBypassDnd(true);
                                        notificationManager.createNotificationChannel(channel);
                                    }
                                    
                                    android.content.Intent intent = new android.content.Intent(GlikoForegroundService.this, MainActivity.class);
                                    android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(GlikoForegroundService.this, 0, intent, android.app.PendingIntent.FLAG_IMMUTABLE);
                                    
                                    androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(GlikoForegroundService.this, alarmChannelId)
                                            .setSmallIcon(R.drawable.ic_stat_name)
                                            .setContentTitle("GlikoSense: Ryzyko spadku cukru!")
                                            .setContentText("Sieć neuronowa przewiduje spadek do " + predicted + " mg/dL. Reaguj!")
                                            .setPriority(androidx.core.app.NotificationCompat.PRIORITY_MAX)
                                            .setCategory(androidx.core.app.NotificationCompat.CATEGORY_ALARM)
                                            .setFullScreenIntent(pendingIntent, true)
                                            .setAutoCancel(true);
                                            
                                    notificationManager.notify(779, builder.build());
                                }
                            } catch (Exception e) {
                                android.util.Log.e("GlikoSenseML", "Błąd analizy JSONa z wynikiem", e);
                            }
                        }
                        
                        @JavascriptInterface
                        public String getSavedModel() {
                            try {
                                java.io.File backupFile = new java.io.File(getFilesDir(), "glikosense_model_backup.json");
                                if (backupFile.exists()) {
                                    java.io.FileInputStream fis = new java.io.FileInputStream(backupFile);
                                    java.io.InputStreamReader isr = new java.io.InputStreamReader(fis, "UTF-8");
                                    java.io.BufferedReader bufferedReader = new java.io.BufferedReader(isr);
                                    StringBuilder sb = new StringBuilder();
                                    String line;
                                    while ((line = bufferedReader.readLine()) != null) {
                                        sb.append(line);
                                    }
                                    return sb.toString();
                                }
                            } catch (Exception e) {
                                android.util.Log.e("GlikoSenseML", "Blad odczytu modelu", e);
                            }
                            return "{}"; // Pusty JSON gdy brak
                        }
                    }, "MLBridge");
                    
                    headlessWebView.setWebViewClient(new WebViewClient() {
                        @Override
                        public void onPageFinished(WebView view, String url) {
                            android.util.Log.i("GlikoSenseML", "Headless WebView załadowane: " + url);
                        }
                    });
                    
                    // Ładowanie strony ML z assetów Capacitora
                    headlessWebView.loadUrl("file:///android_asset/public/ml_runner.html");
                } catch (Exception e) {
                    android.util.Log.e("GlikoSenseML", "Blad tworzenia WebView", e);
                }
            }
        });
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                notificationIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        android.content.SharedPreferences prefs = getSharedPreferences("GlikoWidgetPrefs", Context.MODE_PRIVATE);
        String glucose = prefs.getString("widget_glucose", null);
        
        Notification notification;
        
        if (glucose != null && !glucose.equals("---") && !glucose.isEmpty()) {
            String arrow = prefs.getString("widget_arrow", "");
            String deltaStr = prefs.getString("widget_delta", "");
            String time = prefs.getString("widget_time", "") + " (wznowiono)";
            
            int color = android.graphics.Color.parseColor("#10B981"); // Default green
            try {
                int bgVal = Integer.parseInt(glucose);
                if (bgVal > 180) color = android.graphics.Color.parseColor("#F59E0B");
                else if (bgVal < 70) color = android.graphics.Color.parseColor("#EF4444");
            } catch (Exception ignored) {}
            
            android.widget.RemoteViews notifViews = new android.widget.RemoteViews(getPackageName(), R.layout.notification_glucose);
            notifViews.setTextViewText(R.id.notif_glucose_val, glucose);
            notifViews.setTextColor(R.id.notif_glucose_val, color);
            notifViews.setTextViewText(R.id.notif_glucose_arrow, arrow);
            notifViews.setTextColor(R.id.notif_glucose_arrow, color);
            notifViews.setTextViewText(R.id.notif_glucose_delta, deltaStr);
            notifViews.setTextViewText(R.id.notif_glucose_time, time);
            
            android.widget.RemoteViews expandedViews = new android.widget.RemoteViews(getPackageName(), R.layout.notification_glucose_expanded);
            expandedViews.setTextViewText(R.id.notif_glucose_val, glucose);
            expandedViews.setTextColor(R.id.notif_glucose_val, color);
            expandedViews.setTextViewText(R.id.notif_glucose_arrow, arrow);
            expandedViews.setTextColor(R.id.notif_glucose_arrow, color);
            expandedViews.setTextViewText(R.id.notif_glucose_delta, deltaStr);
            expandedViews.setTextViewText(R.id.notif_glucose_time, time);
            
            notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_stat_name)
                    .setCustomContentView(notifViews)
                    .setCustomBigContentView(expandedViews)
                    .setOngoing(true)
                    .setContentIntent(pendingIntent)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .build();
        } else {
            notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setContentTitle("GlikoControl")
                    .setContentText("Monitorowanie w tle...")
                    .setSmallIcon(R.drawable.ic_stat_name)
                    .setContentIntent(pendingIntent)
                    .setOngoing(true)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .build();
        }

        try {
            startForeground(FOREGROUND_ID, notification);
            if (!prefs.getBoolean("apk_system_notifications_enabled", true)) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    stopForeground(STOP_FOREGROUND_REMOVE);
                } else {
                    stopForeground(true);
                }
            }
        } catch (Exception e) {
            android.util.Log.e("GlikoForegroundService", "Blad startForeground: " + e.getMessage());
        }

        // Rozpoczęcie pętli pobierającej dane co 5 minut (300 000 ms)
        if (handler == null) {
            handler = new Handler(Looper.getMainLooper());
        }
        if (runnable == null) {
            runnable = new Runnable() {
                @Override
                public void run() {
                    android.util.Log.i("GlikoForeground", "Pętla Foreground Service wybudzona. Odpalam NightscoutFetcher...");
                    NightscoutFetcher.fetchAndUpdate(GlikoForegroundService.this, null, null);
                    checkAppUpdateInBackground();
                    if (handler != null) {
                        handler.postDelayed(this, 300000);
                    }
                }
            };
            handler.post(runnable);
        }

        return START_STICKY; // Pancerny serwis - system spróbuje go zrestartować, gdy zabraknie mu pamięci
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        StepCounterPlugin.handleSensorEvent(this, event);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (handler != null && runnable != null) {
            handler.removeCallbacks(runnable);
        }
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        // Zwracamy null, ponieważ nie wspieramy bindowania (bound service)
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Gliko Foreground Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            serviceChannel.setDescription("Gwarantuje, że alarmy i pobieranie danych nie usną w nocy.");
            serviceChannel.setShowBadge(false);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                // Delete old duplicate channels left behind from previous versions
                manager.deleteNotificationChannel("gliko_foreground_service_v1");
                manager.deleteNotificationChannel("gliko_foreground_service_v2");
                manager.deleteNotificationChannel("gliko_foreground_service");
                manager.deleteNotificationChannel("glucose_alerts");
                manager.deleteNotificationChannel("glucose_alerts_v2");
                manager.deleteNotificationChannel("glucose_alerts_v3");
                manager.deleteNotificationChannel("glucose_alerts_v4");
                
                manager.createNotificationChannel(serviceChannel);

                // Kanał powiadomień o aktualizacjach aplikacji i przypomnieniach
                NotificationChannel updateChannel = new NotificationChannel(
                        "glikocontrol_reminders_v1",
                        "Przypomnienia i Aktualizacje GlikoControl",
                        NotificationManager.IMPORTANCE_HIGH
                );
                updateChannel.setDescription("Powiadomienia o nowych wersjach aplikacji oraz wymianach osprzętu");
                updateChannel.enableVibration(true);
                manager.createNotificationChannel(updateChannel);
            }
        }
    }

    private void checkAppUpdateInBackground() {
        new Thread(() -> {
            try {
                android.content.SharedPreferences prefs = getSharedPreferences("GlikoPrefs", Context.MODE_PRIVATE);
                long now = System.currentTimeMillis();
                long lastCheck = prefs.getLong("last_app_update_check_ts", 0);
                // Sprawdzaj dostępność nowej wersji co 2 godziny w tle
                if (now - lastCheck < 2 * 60 * 60 * 1000) {
                    return;
                }
                prefs.edit().putLong("last_app_update_check_ts", now).apply();

                boolean isBeta = prefs.getBoolean("betaProgramEnabled", false);
                String channel = prefs.getString("app_channel", "");
                if ("beta".equalsIgnoreCase(channel)) {
                    isBeta = true;
                }

                String[] urlsToTry = isBeta ? new String[]{
                    "https://github.com/lukcorp83-glitch/diab/releases/download/aktualizacja-beta/beta.json",
                    "https://raw.githubusercontent.com/lukcorp83-glitch/diab/beta/version.json",
                    "https://glikocontrol.pl/version.json"
                } : new String[]{
                    "https://glikocontrol.pl/version.json",
                    "https://raw.githubusercontent.com/lukcorp83-glitch/diab/main/version.json",
                    "https://github.com/lukcorp83-glitch/diab/releases/download/aktualizacja/version.json"
                };

                String remoteVersion = null;
                for (String urlStr : urlsToTry) {
                    try {
                        java.net.URL url = new java.net.URL(urlStr + "?t=" + System.currentTimeMillis());
                        java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                        conn.setConnectTimeout(8000);
                        conn.setReadTimeout(8000);
                        conn.setRequestMethod("GET");
                        if (conn.getResponseCode() == 200) {
                            java.io.BufferedReader in = new java.io.BufferedReader(new java.io.InputStreamReader(conn.getInputStream()));
                            StringBuilder sb = new StringBuilder();
                            String line;
                            while ((line = in.readLine()) != null) {
                                sb.append(line);
                            }
                            in.close();
                            org.json.JSONObject obj = new org.json.JSONObject(sb.toString());
                            if (obj.has("version")) {
                                remoteVersion = obj.getString("version");
                                break;
                            }
                        }
                    } catch (Exception ignored) {}
                }

                if (remoteVersion == null || remoteVersion.isEmpty()) return;

                String currentVersion = getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
                if (isRemoteVersionNewer(remoteVersion, currentVersion)) {
                    String lastNotified = prefs.getString("last_notified_update_version", "");
                    if (!remoteVersion.equals(lastNotified)) {
                        prefs.edit().putString("last_notified_update_version", remoteVersion).apply();

                        Intent openIntent = new Intent(this, MainActivity.class);
                        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        PendingIntent pi = PendingIntent.getActivity(this, 888, openIntent,
                                (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) ? (PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE) : PendingIntent.FLAG_UPDATE_CURRENT);

                        String title = isBeta
                                ? "🚀 Nowa wersja Beta (" + remoteVersion + ")"
                                : "✨ Dostępna nowa wersja GlikoControl (" + remoteVersion + ")";
                        String text = "Dostępna jest nowa wersja. Dotknij, aby otworzyć aplikację i zainstalować.";

                        NotificationCompat.Builder b = new NotificationCompat.Builder(this, "glikocontrol_reminders_v1")
                                .setSmallIcon(R.drawable.ic_stat_name)
                                .setContentTitle(title)
                                .setContentText(text)
                                .setContentIntent(pi)
                                .setAutoCancel(true)
                                .setPriority(NotificationCompat.PRIORITY_HIGH);

                        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                        if (nm != null) {
                            nm.notify(888, b.build());
                            android.util.Log.i("GlikoForegroundService", "Wysłano powiadomienie Android o nowej wersji: " + remoteVersion);
                        }
                    }
                }
            } catch (Exception e) {
                android.util.Log.w("GlikoForegroundService", "Błąd sprawdzania aktualizacji w tle: " + e.getMessage());
            }
        }).start();
    }

    private boolean isRemoteVersionNewer(String remote, String current) {
        if (remote == null || current == null) return false;
        try {
            String[] rParts = remote.replaceAll("^v", "").split("\\.");
            String[] cParts = current.replaceAll("^v", "").split("\\.");
            int maxLen = Math.max(rParts.length, cParts.length);
            for (int i = 0; i < maxLen; i++) {
                String rClean = i < rParts.length ? rParts[i].replaceAll("\\D+", "") : "0";
                String cClean = i < cParts.length ? cParts[i].replaceAll("\\D+", "") : "0";
                int rNum = rClean.isEmpty() ? 0 : Integer.parseInt(rClean);
                int cNum = cClean.isEmpty() ? 0 : Integer.parseInt(cClean);
                if (rNum > cNum) return true;
                if (rNum < cNum) return false;
            }
        } catch (Exception ignored) {}
        return false;
    }
}
