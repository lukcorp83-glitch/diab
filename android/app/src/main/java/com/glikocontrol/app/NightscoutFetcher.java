package com.glikocontrol.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.media.AudioAttributes;
import android.net.Uri;
import android.widget.RemoteViews;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import android.database.sqlite.SQLiteDatabase;
import android.database.Cursor;
import android.content.ContentValues;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class NightscoutFetcher {

    public static void scheduleNextUpdate(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, GlucoseWidget.class);
        intent.setAction("com.glikocontrol.app.ACTION_AUTO_UPDATE");

        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        
        long triggerAtMillis = System.currentTimeMillis() + 300000; // 5 minut
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
            }
        } else {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
        }
    }

    private static String getTrendArrow(String dir) {
        if (dir == null) return "";
        switch(dir) {
            case "DoubleUp": return "↑↑";
            case "SingleUp": return "↑";
            case "FortyFiveUp": return "↗";
            case "Flat": return "→";
            case "FortyFiveDown": return "↘";
            case "SingleDown": return "↓";
            case "DoubleDown": return "↓↓";
            default: return "";
        }
    }

    private static Bitmap drawChart(JSONArray entries, int targetMin, int targetMax) {
        int width = 800;
        int height = 200;
        try {
            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            
            int minSgv = 40;
            int maxSgv = 250;
            
            try {
                for (int i=0; i<entries.length(); i++) {
                    int sgv = entries.getJSONObject(i).getInt("sgv");
                    if (sgv < minSgv) minSgv = Math.max(20, sgv - 10);
                    if (sgv > maxSgv) maxSgv = sgv + 20;
                }
            } catch(Exception e){}
            
            float rangeY = maxSgv - minSgv;
            float stepX = (float) width / Math.max(1, entries.length() - 1);
            
            Paint rangePaint = new Paint();
            rangePaint.setColor(Color.parseColor("#2222C55E"));
            float topY = height - ((targetMax - minSgv) / rangeY * height);
            float bottomY = height - ((targetMin - minSgv) / rangeY * height);
            canvas.drawRect(0, topY, width, bottomY, rangePaint);

            android.graphics.LinearGradient gradient = new android.graphics.LinearGradient(
                0, 0, 0, height,
                Color.parseColor("#8838BDF8"), Color.parseColor("#0038BDF8"),
                android.graphics.Shader.TileMode.CLAMP
            );
            Paint fillPaint = new Paint();
            fillPaint.setAntiAlias(true);
            fillPaint.setStyle(Paint.Style.FILL);
            fillPaint.setShader(gradient);

            Paint linePaint = new Paint();
            linePaint.setAntiAlias(true);
            linePaint.setStrokeWidth(5f);
            linePaint.setStyle(Paint.Style.STROKE);
            linePaint.setColor(Color.parseColor("#38BDF8"));

            Paint dotPaint = new Paint();
            dotPaint.setAntiAlias(true);
            dotPaint.setStyle(Paint.Style.FILL);
            dotPaint.setColor(Color.parseColor("#FFFFFF"));
            
            Path path = new Path();
            Path fillPath = new Path();
            
            float[] ptsX = new float[entries.length()];
            float[] ptsY = new float[entries.length()];
            
            int c = 0;
            for (int i = entries.length() - 1; i >= 0; i--) {
                try {
                    int sgv = entries.getJSONObject(i).getInt("sgv");
                    ptsX[c] = (entries.length() - 1 - i) * stepX;
                    ptsY[c] = height - ((sgv - minSgv) / rangeY * height);
                    c++;
                } catch(Exception e){}
            }
            
            if (c > 0) {
                path.moveTo(ptsX[0], ptsY[0]);
                fillPath.moveTo(ptsX[0], height);
                fillPath.lineTo(ptsX[0], ptsY[0]);
                
                for (int i = 0; i < c - 1; i++) {
                    float x1 = ptsX[i];
                    float y1 = ptsY[i];
                    float x2 = ptsX[i+1];
                    float y2 = ptsY[i+1];
                    float cx = (x1 + x2) / 2f;
                    path.cubicTo(cx, y1, cx, y2, x2, y2);
                    fillPath.cubicTo(cx, y1, cx, y2, x2, y2);
                }
                
                fillPath.lineTo(ptsX[c-1], height);
                fillPath.close();
                
                canvas.drawPath(fillPath, fillPaint);
                canvas.drawPath(path, linePaint);
                
                for (int i = 0; i < c; i++) {
                    canvas.drawCircle(ptsX[i], ptsY[i], 4f, dotPaint);
                    canvas.drawCircle(ptsX[i], ptsY[i], 4f, linePaint);
                }
                
                if (c > 0) {
                    float lastX = ptsX[c-1];
                    float lastY = ptsY[c-1];
                    int lastSgv = 100;
                    try { lastSgv = entries.getJSONObject(0).getInt("sgv"); } catch(Exception ignored){}
                    int lastColor = Color.parseColor("#22C55E");
                    if (lastSgv < targetMin || lastSgv > targetMax + 40) lastColor = Color.parseColor("#EF4444");
                    else if (lastSgv > targetMax) lastColor = Color.parseColor("#F59E0B");
                    
                    Paint lastDotPaint = new Paint();
                    lastDotPaint.setAntiAlias(true);
                    lastDotPaint.setStyle(Paint.Style.FILL);
                    lastDotPaint.setColor(lastColor);
                    canvas.drawCircle(lastX, lastY, 10f, lastDotPaint);
                    
                    Paint strokePaint = new Paint();
                    strokePaint.setAntiAlias(true);
                    strokePaint.setStyle(Paint.Style.STROKE);
                    strokePaint.setStrokeWidth(3f);
                    strokePaint.setColor(Color.WHITE);
                    canvas.drawCircle(lastX, lastY, 10f, strokePaint);
                }
            }
            
            return bitmap;
        } catch (Exception e) {
            android.util.Log.e("GlikoControlWidget", "Błąd rysowania wykresu: " + e.getMessage(), e);
            return null;
        }
    }

    private static void checkAndTriggerAlert(Context context, int sgv, int targetMin, int targetMax, String entryId, long entryTime) {
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        
        // Zabezpieczenie na wypadek wyłączenia wszystkich powiadomień
        boolean hypoEnabled = prefs.getBoolean("widget_hypo_alerts_enabled", true);
        boolean hyperEnabled = prefs.getBoolean("widget_hyper_alerts_enabled", true);
        
        String currentViolation = null;
        if (sgv < targetMin && hypoEnabled) {
            currentViolation = "hypo";
        } else if (sgv > targetMax && hyperEnabled) {
            currentViolation = "hyper";
        }
        
        if (currentViolation == null) {
            // Cukier wrócił do normy - czyścimy śledzenie alertów
            SharedPreferences.Editor editor = prefs.edit();
            editor.remove("widget_last_alert_type");
            editor.remove("widget_last_alert_time");
            editor.apply();
            return;
        }
        
        String lastViolation = prefs.getString("widget_last_alert_type", null);
        long lastAlertTime = prefs.getLong("widget_last_alert_time", 0);
        long nowMs = System.currentTimeMillis();
        
        boolean shouldAlert = false;
        boolean isReminder = false;
        
        // Unikalny klucz dla pomiaru, by nie alarmować o tym samym odczycie wiele razy
        String notifiedKey = "widget_notified_" + (entryId != null && !entryId.isEmpty() ? entryId : String.valueOf(entryTime));
        boolean wasAlreadyNotified = prefs.getBoolean(notifiedKey, false);
        
        if (!wasAlreadyNotified) {
            if (currentViolation.equals(lastViolation)) {
                // To samo przekroczenie normy trwa. Przypominamy co 30 minut.
                double minutesSinceLastAlert = (double) (nowMs - lastAlertTime) / (60 * 1000);
                if (minutesSinceLastAlert >= 30) {
                    shouldAlert = true;
                    isReminder = true;
                }
            } else {
                // Nowe przekroczenie normy (lub zmiana hypo <-> hyper), alarmujemy natychmiast
                shouldAlert = true;
                isReminder = false;
            }
        }
        
        if (shouldAlert) {
            SharedPreferences.Editor editor = prefs.edit();
            editor.putBoolean(notifiedKey, true);
            editor.putString("widget_last_alert_type", currentViolation);
            editor.putLong("widget_last_alert_time", nowMs);
            editor.apply();
            
            String alertTitle;
            String alertBody;
            
            if (currentViolation.equals("hypo")) {
                if (isReminder) {
                    alertTitle = "⏳ PRZYPOMNIENIE: Cukier nadal niski (Hipoglikemia)!";
                    alertBody = "Twoja glikemia od ponad 30 minut utrzymuje się poniżej normy. Aktualny odczyt: " + sgv + " mg/dL. Zjedz szybko węglowodany proste!";
                } else {
                    alertTitle = "🚨 NISKI POZIOM CUKRU (Hipoglikemia)!";
                    alertBody = "Twoja glikemia wynosi " + sgv + " mg/dL, co jest poniżej bezpiecznej granicy " + targetMin + " mg/dL. Zjedz szybko węglowodany proste!";
                }
            } else {
                if (isReminder) {
                    alertTitle = "⏳ PRZYPOMNIENIE: Cukier nadal wysoki (Hiperglikemia)!";
                    alertBody = "Twoja glikemia od ponad 30 minut utrzymuje się powyżej normy. Aktualny odczyt: " + sgv + " mg/dL. Rozważ podanie korekty insuliną.";
                } else {
                    alertTitle = "⚠️ WYSOKI POZIOM CUKRU (Hiperglikemia)!";
                    alertBody = "Twoja glikemia wynosi " + sgv + " mg/dL, co przewyższa bezpieczną granicę " + targetMax + " mg/dL. Rozważ korektę insuliną.";
                }
            }
            
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                // Upewniamy się, że głośny kanał powiadomień istnieje i ma skonfigurowany dźwięk w systemie Android
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    NotificationChannel alertChannel = new NotificationChannel(
                            "glucose_alerts_v11",
                            "Alerty Glikemii",
                            NotificationManager.IMPORTANCE_HIGH
                    );
                    alertChannel.setDescription("Głośne alarmy wysokiego i niskiego poziomu cukru z unikalnym dźwiękiem");
                    
                    Uri alarmSound = Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.status_clear);
                    AudioAttributes audioAttributes = new AudioAttributes.Builder()
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .build();
                    alertChannel.setSound(alarmSound, audioAttributes);
                    alertChannel.enableVibration(true);
                    alertChannel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500});
                    
                    manager.createNotificationChannel(alertChannel);
                }
                
                Intent intentDefault = new Intent(context, MainActivity.class);
                PendingIntent pendingIntentDefault = PendingIntent.getActivity(
                        context, 
                        200 + (int)(System.currentTimeMillis() % 10000), 
                        intentDefault, 
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                
                NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "glucose_alerts_v11")
                        .setSmallIcon(R.drawable.ic_stat_name)
                        .setContentTitle(alertTitle)
                        .setContentText(alertBody)
                        .setStyle(new NotificationCompat.BigTextStyle().bigText(alertBody))
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setCategory(NotificationCompat.CATEGORY_ALARM)
                        .setAutoCancel(true)
                        .setOnlyAlertOnce(false)
                        .setSound(Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.status_clear))
                        .setVibrate(new long[]{0, 500, 200, 500, 200, 500})
                        .setContentIntent(pendingIntentDefault);
                
                // Używamy ID 2, by nie zastępować ciągłego powiadomienia (ciągłe ma ID 1)
                manager.notify(2, builder.build());
            }
        }
    }

    public static void fetchAndUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        new Thread(() -> {
            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String nsUrl = prefs.getString("widget_ns_url", "");
            String secret = prefs.getString("widget_ns_secret", "");
            
            int targetMin = 70;
            int targetMax = 140;
            try { targetMin = Integer.parseInt(prefs.getString("widget_target_min", "70")); } catch(Exception ignored) {}
            try { targetMax = Integer.parseInt(prefs.getString("widget_target_max", "140")); } catch(Exception ignored) {}

            String glucose = "---";
            String arrow = "";
            String deltaStr = "---";
            String time = "Brak danych";
            int color = Color.WHITE;
            Bitmap chartBitmap = null;

            // Zapisujemy URL do logów diagnostycznych na starcie synchronizacji
            SharedPreferences.Editor diagEditor = prefs.edit();
            diagEditor.putString("widget_last_sync_url_used", nsUrl != null ? nsUrl : "");
            diagEditor.apply();

            if (nsUrl != null && !nsUrl.isEmpty()) {
                String fetchUrl = nsUrl;
                try {
                    if (fetchUrl.endsWith("/")) fetchUrl = fetchUrl.substring(0, fetchUrl.length() - 1);
                    fetchUrl += "/api/v1/entries.json?count=36";
                    
                    if (secret != null && !secret.isEmpty() && secret.contains("-")) {
                        fetchUrl += "&token=" + secret;
                    }

                    URL url = new URL(fetchUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("GET");
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile)");
                    if (secret != null && !secret.isEmpty() && !secret.contains("-")) {
                        conn.setRequestProperty("api-secret", secret);
                    }
                    conn.setConnectTimeout(10000);
                    conn.setReadTimeout(10000);

                    int status = conn.getResponseCode();
                    if (status == HttpURLConnection.HTTP_MOVED_TEMP 
                        || status == HttpURLConnection.HTTP_MOVED_PERM 
                        || status == HttpURLConnection.HTTP_SEE_OTHER) {
                        String newUrl = conn.getHeaderField("Location");
                        conn = (HttpURLConnection) new URL(newUrl).openConnection();
                        conn.setRequestMethod("GET");
                        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile)");
                        if (secret != null && !secret.isEmpty() && !secret.contains("-")) {
                            conn.setRequestProperty("api-secret", secret);
                        }
                        conn.setConnectTimeout(10000);
                        conn.setReadTimeout(10000);
                        status = conn.getResponseCode();
                    }

                    if (status == 200) {
                        BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                        StringBuilder response = new StringBuilder();
                        String inputLine;
                        while ((inputLine = in.readLine()) != null) {
                            response.append(inputLine);
                        }
                        in.close();

                        JSONArray jsonArray = new JSONArray(response.toString());
                        if (jsonArray.length() > 0) {
                            JSONObject latest = jsonArray.getJSONObject(0);
                            if (latest.has("sgv")) {
                                int sgv = latest.getInt("sgv");
                                glucose = String.valueOf(sgv);
                                
                                String dir = latest.optString("direction", "");
                                arrow = getTrendArrow(dir);

                                if (sgv < targetMin) {
                                    color = Color.parseColor("#EF4444");
                                } else if (sgv <= targetMax) {
                                    color = Color.parseColor("#22C55E");
                                } else if (sgv <= targetMax + 40) {
                                    color = Color.parseColor("#F59E0B");
                                } else {
                                    color = Color.parseColor("#EF4444");
                                }

                                if (jsonArray.length() > 1) {
                                    JSONObject prev = jsonArray.getJSONObject(1);
                                    if (prev.has("sgv")) {
                                        int delta = sgv - prev.getInt("sgv");
                                        deltaStr = (delta > 0 ? "+" : "") + delta;
                                    }
                                }

                                long timestamp = latest.optLong("date", System.currentTimeMillis());
                                SimpleDateFormat sdf = new SimpleDateFormat("HH:mm", Locale.getDefault());
                                time = sdf.format(new Date(timestamp));
                                
                                // Sprawdzanie i generowanie alarmów w tle (niskiego/wysokiego cukru)
                                checkAndTriggerAlert(context, sgv, targetMin, targetMax, latest.optString("_id", ""), timestamp);
                                
                                // Zapisywanie najnowszych danych do SharedPreferences
                                SharedPreferences.Editor editor = prefs.edit();
                                editor.putString("widget_glucose", glucose);
                                editor.putString("widget_arrow", arrow);
                                editor.putString("widget_delta", deltaStr);
                                editor.putString("widget_time", time);
                                editor.putString("widget_last_sync_time", new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date()));
                                editor.putString("widget_last_sync_status", "SUCCESS");
                                editor.putString("widget_last_sync_error", "");
                                editor.putInt("widget_last_sync_code", status);
                                editor.putString("widget_last_sync_url_used", fetchUrl);
                                editor.apply();

                                // NATYWNY ZAPIS DO CAPACITOR SQLITE
                                try {
                                    java.io.File dbFile = context.getDatabasePath("glikocontrol_dbSQLite.db");
                                    if (dbFile.exists()) {
                                        SQLiteDatabase db = SQLiteDatabase.openDatabase(dbFile.getPath(), null, SQLiteDatabase.OPEN_READWRITE);
                                        // Zapisujemy najnowszy (lub kilka najnowszych z tablicy) by zasilic pętle glikemii
                                        for (int i=0; i<Math.min(jsonArray.length(), 5); i++) {
                                            JSONObject entry = jsonArray.getJSONObject(i);
                                            int val = entry.optInt("sgv", 0);
                                            long ts = entry.optLong("date", 0);
                                            String nsId = entry.optString("_id", "");
                                            String trend = entry.optString("direction", "");
                                            
                                            // Konstruujemy uproszczony LogEntry w formacie JSON
                                            JSONObject logPayload = new JSONObject();
                                            logPayload.put("id", nsId);
                                            logPayload.put("nsId", nsId);
                                            logPayload.put("timestamp", ts);
                                            logPayload.put("value", val);
                                            logPayload.put("glucose", val);
                                            logPayload.put("type", "glucose");
                                            logPayload.put("trend", getTrendArrow(trend));
                                            
                                            if (i < jsonArray.length() - 1) {
                                                JSONObject prevEntry = jsonArray.getJSONObject(i+1);
                                                int prevSgv = prevEntry.optInt("sgv", 0);
                                                logPayload.put("delta", val - prevSgv);
                                            } else {
                                                logPayload.put("delta", 0);
                                            }

                                            ContentValues values = new ContentValues();
                                            values.put("id", nsId);
                                            values.put("timestamp", ts);
                                            values.put("type", "glucose");
                                            values.put("payload", logPayload.toString());
                                            values.put("is_synced", 0);

                                            db.insertWithOnConflict("application_logs", null, values, SQLiteDatabase.CONFLICT_REPLACE);
                                        }
                                        db.close();
                                    }
                                } catch (Exception dbEx) {
                                    android.util.Log.e("GlikoControlWidget", "Błąd natywnego zapisu do SQLite", dbEx);
                                }

                                // EWALUACJA GLIKOSENSE ML W HEADLESS WEBVIEW
                                if (GlikoForegroundService.headlessWebView != null) {
                                    final String finalJsonStr = jsonArray.toString().replace("'", "\\'");
                                    new android.os.Handler(android.os.Looper.getMainLooper()).post(new Runnable() {
                                        @Override
                                        public void run() {
                                            GlikoForegroundService.headlessWebView.evaluateJavascript(
                                                "if(window.runPrediction) { window.runPrediction('" + finalJsonStr + "'); }",
                                                null
                                            );
                                        }
                                    });
                                }

                                // Rysuj wykres!
                                chartBitmap = drawChart(jsonArray, targetMin, targetMax);
                            }
                        }
                    } else {
                        android.util.Log.w("GlikoControlWidget", "Błąd pobierania danych. Status HTTP: " + status + " dla: " + fetchUrl);
                        SharedPreferences.Editor editor = prefs.edit();
                        editor.putString("widget_last_sync_time", new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date()));
                        editor.putString("widget_last_sync_status", "ERROR");
                        editor.putString("widget_last_sync_error", "Błąd serwera. Status HTTP: " + status);
                        editor.putInt("widget_last_sync_code", status);
                        editor.apply();
                    }
                } catch (Exception e) {
                    android.util.Log.e("GlikoControlWidget", "Wyjątek podczas pobierania danych: " + e.getMessage(), e);
                    SharedPreferences.Editor editor = prefs.edit();
                    editor.putString("widget_last_sync_time", new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date()));
                    editor.putString("widget_last_sync_status", "ERROR");
                    editor.putString("widget_last_sync_error", "Wyjątek: " + e.getClass().getSimpleName() + " - " + e.getMessage());
                    editor.putInt("widget_last_sync_code", -1);
                    editor.apply();
                }
            } else {
                android.util.Log.i("GlikoControlWidget", "Brak adresu Nightscout w ustawieniach.");
                glucose = prefs.getString("widget_glucose", "---");
                arrow = prefs.getString("widget_arrow", "");
                deltaStr = prefs.getString("widget_delta", "---");
                time = prefs.getString("widget_time", "Brak danych");
                try {
                    int val = Integer.parseInt(glucose);
                    if (val < targetMin || val > targetMax + 40) color = Color.parseColor("#EF4444");
                    else if (val <= targetMax) color = Color.parseColor("#22C55E");
                    else color = Color.parseColor("#F59E0B");
                } catch(Exception ignored) {}

                SharedPreferences.Editor editor = prefs.edit();
                editor.putString("widget_last_sync_time", new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date()));
                editor.putString("widget_last_sync_status", "NO_URL");
                editor.putString("widget_last_sync_error", "Brak skonfigurowanego adresu serwera w ustawieniach.");
                editor.putInt("widget_last_sync_code", 0);
                editor.apply();
            }

            AppWidgetManager widgetManager = AppWidgetManager.getInstance(context);

            // --- 1. Aktualizacja małego widżetu (Standard 2x2) ---
            int[] smallWidgetIds = widgetManager.getAppWidgetIds(new ComponentName(context, GlucoseWidget.class));
            if (smallWidgetIds != null && smallWidgetIds.length > 0) {
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.glucose_widget);
                views.setTextViewText(R.id.widget_glucose_val, glucose);
                views.setTextColor(R.id.widget_glucose_val, color);
                views.setTextViewText(R.id.widget_glucose_arrow, arrow);
                views.setTextColor(R.id.widget_glucose_arrow, color);
                views.setTextViewText(R.id.widget_glucose_delta, deltaStr + " mg/dL");
                views.setTextViewText(R.id.widget_glucose_time, time);
                Intent intentMain = new Intent(context, MainActivity.class);
                PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intentMain, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                views.setOnClickPendingIntent(R.id.widget_glucose_val, pendingIntent);
                widgetManager.updateAppWidget(smallWidgetIds, views);
            }
            
            // --- 1a. Aktualizacja małego widżetu (Kwiat 2x2) ---
            int[] flowerIds = widgetManager.getAppWidgetIds(new ComponentName(context, GlucoseFlowerWidget.class));
            if (flowerIds != null && flowerIds.length > 0) {
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.glucose_widget_flower);
                views.setTextViewText(R.id.widget_glucose_val, glucose);
                views.setTextColor(R.id.widget_glucose_val, color);
                views.setTextViewText(R.id.widget_glucose_arrow, arrow);
                views.setTextColor(R.id.widget_glucose_arrow, color);
                views.setTextViewText(R.id.widget_glucose_delta, deltaStr + " mg/dL");
                views.setTextViewText(R.id.widget_glucose_time, time);
                Intent intentMain = new Intent(context, MainActivity.class);
                PendingIntent pendingIntent = PendingIntent.getActivity(context, 100, intentMain, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                views.setOnClickPendingIntent(R.id.widget_glucose_val, pendingIntent);
                widgetManager.updateAppWidget(flowerIds, views);
            }

            // --- 1b. Aktualizacja małego widżetu (Pastylka 2x2) ---
            int[] pillIds = widgetManager.getAppWidgetIds(new ComponentName(context, GlucosePillWidget.class));
            if (pillIds != null && pillIds.length > 0) {
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.glucose_widget_pill);
                views.setTextViewText(R.id.widget_glucose_val, glucose);
                views.setTextColor(R.id.widget_glucose_val, color);
                views.setTextViewText(R.id.widget_glucose_arrow, arrow);
                views.setTextColor(R.id.widget_glucose_arrow, color);
                views.setTextViewText(R.id.widget_glucose_delta, deltaStr + " mg/dL");
                views.setTextViewText(R.id.widget_glucose_time, time);
                Intent intentMain = new Intent(context, MainActivity.class);
                PendingIntent pendingIntent = PendingIntent.getActivity(context, 101, intentMain, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                views.setOnClickPendingIntent(R.id.widget_glucose_val, pendingIntent);
                widgetManager.updateAppWidget(pillIds, views);
            }

            // --- Aktualizacja dużego widżetu kontrolnego (4x3/3x2) ---
            ComponentName controlWidgetName = new ComponentName(context, GlucoseControlWidget.class);
            int[] controlWidgetIds = widgetManager.getAppWidgetIds(controlWidgetName);
            if (controlWidgetIds != null && controlWidgetIds.length > 0) {
                RemoteViews ctrlViews = new RemoteViews(context.getPackageName(), R.layout.glucose_control_widget);
                ctrlViews.setTextViewText(R.id.widget_glucose_val, glucose);
                ctrlViews.setTextColor(R.id.widget_glucose_val, color);
                ctrlViews.setTextViewText(R.id.widget_glucose_arrow, arrow);
                ctrlViews.setTextColor(R.id.widget_glucose_arrow, color);
                ctrlViews.setTextViewText(R.id.widget_glucose_delta, deltaStr + " mg/dL");
                ctrlViews.setTextViewText(R.id.widget_glucose_time, time);

                if (chartBitmap != null) {
                    ctrlViews.setImageViewBitmap(R.id.widget_chart, chartBitmap);
                }

                // Kliknięcie na wartość glukozy otwiera główną aplikację
                Intent intentMain = new Intent(context, MainActivity.class);
                PendingIntent piMain = PendingIntent.getActivity(context, 10, intentMain, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                ctrlViews.setOnClickPendingIntent(R.id.widget_glucose_val, piMain);

                // Button 1: Add Glucose
                Intent intentGlucose = new Intent(context, MainActivity.class);
                intentGlucose.setAction(Intent.ACTION_VIEW);
                intentGlucose.setData(android.net.Uri.parse("glikocontrol://action=add_glucose"));
                PendingIntent piGlucose = PendingIntent.getActivity(context, 11, intentGlucose, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                ctrlViews.setOnClickPendingIntent(R.id.widget_btn_glucose, piGlucose);

                // Button 2: Add Bolus
                Intent intentBolus = new Intent(context, MainActivity.class);
                intentBolus.setAction(Intent.ACTION_VIEW);
                intentBolus.setData(android.net.Uri.parse("glikocontrol://action=add_bolus"));
                PendingIntent piBolus = PendingIntent.getActivity(context, 12, intentBolus, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                ctrlViews.setOnClickPendingIntent(R.id.widget_btn_bolus, piBolus);

                // Button 3: Open Scanner
                Intent intentScanner = new Intent(context, MainActivity.class);
                intentScanner.setAction(Intent.ACTION_VIEW);
                intentScanner.setData(android.net.Uri.parse("glikocontrol://action=open_scanner"));
                PendingIntent piScanner = PendingIntent.getActivity(context, 13, intentScanner, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                ctrlViews.setOnClickPendingIntent(R.id.widget_btn_scanner, piScanner);

                // Button 4: Plate Analysis (Analiza)
                Intent intentCamera = new Intent(context, MainActivity.class);
                intentCamera.setAction(Intent.ACTION_VIEW);
                intentCamera.setData(android.net.Uri.parse("glikocontrol://action=open_camera_vision"));
                PendingIntent piCamera = PendingIntent.getActivity(context, 14, intentCamera, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                ctrlViews.setOnClickPendingIntent(R.id.widget_btn_camera, piCamera);

                widgetManager.updateAppWidget(controlWidgetIds, ctrlViews);
            }

            // --- Aktualizacja powiadomienia w pasku (Powiadomienie) ---
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel("gliko_foreground_service_v3", "Powiadomienia Glikemii", NotificationManager.IMPORTANCE_LOW);
                channel.setShowBadge(false);
                manager.createNotificationChannel(channel);
            }

            RemoteViews notifViews = new RemoteViews(context.getPackageName(), R.layout.notification_glucose);
            notifViews.setTextViewText(R.id.notif_glucose_val, glucose);
            notifViews.setTextColor(R.id.notif_glucose_val, color);
            notifViews.setTextViewText(R.id.notif_glucose_arrow, arrow);
            notifViews.setTextColor(R.id.notif_glucose_arrow, color);
            notifViews.setTextViewText(R.id.notif_glucose_delta, deltaStr);
            notifViews.setTextViewText(R.id.notif_glucose_time, time);
            
            RemoteViews expandedViews = new RemoteViews(context.getPackageName(), R.layout.notification_glucose_expanded);
            expandedViews.setTextViewText(R.id.notif_glucose_val, glucose);
            expandedViews.setTextColor(R.id.notif_glucose_val, color);
            expandedViews.setTextViewText(R.id.notif_glucose_arrow, arrow);
            expandedViews.setTextColor(R.id.notif_glucose_arrow, color);
            expandedViews.setTextViewText(R.id.notif_glucose_delta, deltaStr);
            expandedViews.setTextViewText(R.id.notif_glucose_time, time);

            if (chartBitmap != null) {
                expandedViews.setImageViewBitmap(R.id.notif_chart, chartBitmap);
            }
            
            Intent intentDefault = new Intent(context, MainActivity.class);
            PendingIntent pendingIntentDefault = PendingIntent.getActivity(context, 20, intentDefault, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            notifViews.setOnClickPendingIntent(R.id.notif_glucose_val, pendingIntentDefault);
            expandedViews.setOnClickPendingIntent(R.id.notif_glucose_val, pendingIntentDefault);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "gliko_foreground_service_v3")
                    .setSmallIcon(R.drawable.ic_stat_name)
                    .setCustomContentView(notifViews)
                    .setCustomBigContentView(expandedViews)
                    .setOngoing(true)
                    .setOnlyAlertOnce(true)
                    .setContentIntent(pendingIntentDefault);

            manager.notify(999, builder.build());
            
            // Odświeżenie kafelka szybkich ustawień za każdym razem (sukces, błąd, brak URL)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                try {
                    android.service.quicksettings.TileService.requestListeningState(
                            context,
                            new android.content.ComponentName(context, GlucoseTileService.class)
                    );
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            scheduleNextUpdate(context);
        }).start();
    }
}
