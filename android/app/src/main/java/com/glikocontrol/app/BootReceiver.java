package com.glikocontrol.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())) {
            // Wznowienie serwisu tła i harmonogramu alarmów po restarcie telefonu
            try {
                Intent serviceIntent = new Intent(context, GlikoForegroundService.class);
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    androidx.core.content.ContextCompat.startForegroundService(context, serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            } catch (Exception e) {
                android.util.Log.e("BootReceiver", "Błąd startu GlikoForegroundService: " + e.getMessage());
            }
            NightscoutFetcher.fetchAndUpdate(context, null, null);
        }
    }
}
