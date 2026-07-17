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

import androidx.core.app.NotificationCompat;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;

public class GlikoForegroundService extends Service {

    private static final String CHANNEL_ID = "gliko_foreground_service_v3";
    private static final int FOREGROUND_ID = 999;
    private Handler handler;
    private Runnable runnable;

    public static WebView headlessWebView;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        
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
                                    
                                    String alarmChannelId = "gliko_ml_alarms_v2";
                                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                                        android.app.NotificationChannel channel = new android.app.NotificationChannel(alarmChannelId, "Inteligentne Alarmy (GlikoSense)", android.app.NotificationManager.IMPORTANCE_HIGH);
                                        channel.setDescription("Alarmy generowane przez sztuczną inteligencję o nadchodzących spadkach.");
                                        // Dzwiek alarmu z assetów
                                        android.net.Uri alarmSound = android.net.Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.status_clear);
                                        channel.setSound(alarmSound, new android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_ALARM).setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
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
                                            
                                    notificationManager.notify(777, builder.build());
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

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("GlikoControl")
                .setContentText("Pętla zamknięta i alarmy działają w tle")
                .setSmallIcon(R.drawable.ic_stat_name)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();

        startForeground(FOREGROUND_ID, notification);

        // Rozpoczęcie pętli pobierającej dane co 5 minut (300 000 ms)
        if (handler == null) {
            handler = new Handler(Looper.getMainLooper());
            runnable = new Runnable() {
                @Override
                public void run() {
                    android.util.Log.i("GlikoForeground", "Pętla Foreground Service wybudzona. Odpalam NightscoutFetcher...");
                    NightscoutFetcher.fetchAndUpdate(GlikoForegroundService.this, null, null);
                    handler.postDelayed(this, 300000);
                }
            };
            handler.post(runnable);
        }

        return START_STICKY; // Pancerny serwis - system spróbuje go zrestartować, gdy zabraknie mu pamięci
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (handler != null && runnable != null) {
            handler.removeCallbacks(runnable);
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
                manager.deleteNotificationChannel("glucose_alerts_v7");
                manager.deleteNotificationChannel("glucose_alerts_v8");
                manager.deleteNotificationChannel("glucose_alerts_v9");
                manager.deleteNotificationChannel("glucose_alerts_v10");
                
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }
}
