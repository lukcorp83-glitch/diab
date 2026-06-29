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
        android.content.SharedPreferences prefs = getContext().getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
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
        String text = call.getString("text", "Pętla zamknięta działa");

        Intent notificationIntent = new Intent(getContext(), MainActivity.class);
        android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(
                getContext(),
                0,
                notificationIntent,
                android.app.PendingIntent.FLAG_IMMUTABLE | android.app.PendingIntent.FLAG_UPDATE_CURRENT
        );

        androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(getContext(), "gliko_foreground_service_v3")
                .setContentTitle(title)
                .setContentText(text)
                .setSmallIcon(R.drawable.ic_stat_name)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_LOW);

        android.app.NotificationManager notificationManager = (android.app.NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify(999, builder.build());
        }
        
        call.resolve();
    }
}
