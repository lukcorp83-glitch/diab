package com.glikocontrol.app;

import android.os.Bundle;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.glikocontrol.app.WidgetUpdaterPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetUpdaterPlugin.class);
        registerPlugin(AndroidHapticPlugin.class);
        registerPlugin(NotificationBridgePlugin.class);
        super.onCreate(savedInstanceState);
        
        // Wymuszenie zapytania o uprawnienia przy uruchomieniu aplikacji
        java.util.List<String> permissions = new java.util.ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.CAMERA);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.RECORD_AUDIO);
        }
        if (android.os.Build.VERSION.SDK_INT >= 33) { // Android 13 (Tiramisu)
            if (ContextCompat.checkSelfPermission(this, "android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                permissions.add("android.permission.POST_NOTIFICATIONS");
            }
        }
        if (!permissions.isEmpty()) {
            ActivityCompat.requestPermissions(this, permissions.toArray(new String[0]), 100);
        }

        // Tworzenie głośnego kanału powiadomień dla alertów glikemii (typ ALARM z unikalnym dźwiękiem)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            android.app.NotificationManager manager = (android.app.NotificationManager) getSystemService(android.content.Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                // Usuwanie starego kanału o niskim/domyślnym dźwięku
                try {
                    manager.deleteNotificationChannel("glucose_alerts");
                } catch (Exception e) {
                    android.util.Log.e("GlikoControl", "Błąd usuwania starego kanału powiadomień", e);
                }

                android.app.NotificationChannel alertChannel = new android.app.NotificationChannel(
                        "glucose_alerts_v2",
                        "Alerty Glikemii",
                        android.app.NotificationManager.IMPORTANCE_HIGH
                );
                alertChannel.setDescription("Głośne alarmy wysokiego i niskiego poziomu cukru z unikalnym dźwiękiem");

                android.net.Uri alarmSound = android.net.Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.critical_alarm);
                android.media.AudioAttributes audioAttributes = new android.media.AudioAttributes.Builder()
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                        .build();
                alertChannel.setSound(alarmSound, audioAttributes);
                alertChannel.enableVibration(true);
                alertChannel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500});

                manager.createNotificationChannel(alertChannel);
            }
        }

        // Uruchomienie Pancernego Foreground Service
        Intent serviceIntent = new Intent(this, GlikoForegroundService.class);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            ContextCompat.startForegroundService(this, serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        final WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.getSettings().setJavaScriptEnabled(true);
            webView.addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void saveModelToDevice(String modelJson) {
                    try {
                        java.io.File file = new java.io.File(MainActivity.this.getFilesDir(), "glikosense_model_backup.json");
                        java.io.FileOutputStream fos = new java.io.FileOutputStream(file);
                        fos.write(modelJson.getBytes("UTF-8"));
                        fos.close();
                        android.util.Log.d("GlikoSenseAPK", "Kopia zapasowa modelu pomyslnie zapisana na telefonie!");
                    } catch (Exception e) {
                        android.util.Log.e("GlikoSenseAPK", "Blad zapisu kopii roboczej modelu na telefonie", e);
                    }
                }

                @android.webkit.JavascriptInterface
                public void triggerRestoreCheck() {
                    webView.post(new Runnable() {
                        @Override
                        public void run() {
                            checkAndRestoreModel(webView);
                        }
                    });
                }

                @android.webkit.JavascriptInterface
                public String getStartupAction() {
                    Intent intent = getIntent();
                    if (intent != null && intent.getData() != null) {
                        String dataStr = intent.getData().toString();
                        if (dataStr.contains("action=")) {
                            String[] parts = dataStr.split("action=");
                            if (parts.length > 1) {
                                String action = parts[1];
                                intent.setData(null);
                                return action;
                            }
                        }
                    }
                    return "";
                }
            }, "AndroidBackupBridge");

            // Wstrzykujemy skrypty bezpiecznie - bez nadpisywania webViewClient (co psuje Capacitor)
            String jsListenerInstaller = 
                "window.addEventListener('glikosense_model_trained', function(e) {\n" +
                "    if (window.AndroidBackupBridge && e.detail) {\n" +
                "        var modelStr = typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail);\n" +
                "        window.AndroidBackupBridge.saveModelToDevice(modelStr);\n" +
                "    }\n" +
                "});\n" +
                "// Opóźnienie by React zdążył ustawić window.glikosenseHasModel\n" +
                "setTimeout(function() { if(window.AndroidBackupBridge) window.AndroidBackupBridge.triggerRestoreCheck(); }, 3000);\n";
            webView.evaluateJavascript(jsListenerInstaller, null);
        }
    }

    private void checkAndRestoreModel(final WebView webView) {
        java.io.File backupFile = new java.io.File(getFilesDir(), "glikosense_model_backup.json");
        if (!backupFile.exists()) return;

        try {
            java.io.FileInputStream fis = new java.io.FileInputStream(backupFile);
            java.io.InputStreamReader isr = new java.io.InputStreamReader(fis, "UTF-8");
            java.io.BufferedReader bufferedReader = new java.io.BufferedReader(isr);
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = bufferedReader.readLine()) != null) {
                sb.append(line);
            }
            final String rawJson = sb.toString();

            webView.evaluateJavascript("typeof window.glikosenseHasModel === 'function' ? window.glikosenseHasModel() : false", new android.webkit.ValueCallback<String>() {
                @Override
                public void onReceiveValue(String hasModelResult) {
                    boolean hasModel = "true".equals(hasModelResult);
                    if (!hasModel) {
                        android.util.Log.d("GlikoSenseAPK", "Wykryto pusta baze IndexedDB. Odtwarzam model z telefonu...");
                        // Uciekanie znakow dla poprawnego sparsowania JS
                        final String escapedJson = rawJson.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "").replace("\r", "");
                        
                        webView.post(new Runnable() {
                            @Override
                            public void run() {
                                webView.evaluateJavascript("typeof window.glikosenseImportModel === 'function' ? window.glikosenseImportModel('" + escapedJson + "') : false", new android.webkit.ValueCallback<String>() {
                                    @Override
                                    public void onReceiveValue(String importResult) {
                                        if ("true".equals(importResult)) {
                                            android.util.Log.d("GlikoSenseAPK", "Model pomyslnie przywrocony do pamieci WebView!");
                                        } else {
                                            android.util.Log.e("GlikoSenseAPK", "Blad podczas wczytywania modelu do bazy WebView.");
                                        }
                                    }
                                });
                            }
                        });
                    } else {
                        android.util.Log.d("GlikoSenseAPK", "Model obecny w IndexedDB. Przywracanie pominięte.");
                    }
                }
            });
        } catch (Exception e) {
            android.util.Log.e("GlikoSenseAPK", "Blad podczas przywracania z pliku", e);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleShortcutIntent(intent);
    }

    private void handleShortcutIntent(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        String dataStr = intent.getData().toString();
        if (dataStr.contains("action=")) {
            String[] parts = dataStr.split("action=");
            if (parts.length > 1) {
                final String action = parts[1];
                final WebView webView = getBridge().getWebView();
                if (webView != null) {
                    webView.post(new Runnable() {
                        @Override
                        public void run() {
                            webView.evaluateJavascript(
                                "window.dispatchEvent(new CustomEvent('native_shortcut_action', { detail: '" + action + "' }));",
                                null
                            );
                        }
                    });
                }
            }
        }
    }
}
