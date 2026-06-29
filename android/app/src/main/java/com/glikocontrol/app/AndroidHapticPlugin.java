package com.glikocontrol.app;

import android.content.Context;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AndroidHaptic")
public class AndroidHapticPlugin extends Plugin {

    private Vibrator getVibrator() {
        return (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
    }

    @PluginMethod
    public void tick(PluginCall call) {
        try {
            Vibrator vibrator = getVibrator();
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(12, 160));
                } else {
                    vibrator.vibrate(12);
                }
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to trigger native tick", e);
        }
    }

    @PluginMethod
    public void click(PluginCall call) {
        try {
            Vibrator vibrator = getVibrator();
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    vibrator.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK));
                } else {
                    vibrator.vibrate(VibrationEffect.createOneShot(15, 150));
                }
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to trigger native click", e);
        }
    }

    @PluginMethod
    public void heavyClick(PluginCall call) {
        try {
            Vibrator vibrator = getVibrator();
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    vibrator.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK));
                } else {
                    vibrator.vibrate(VibrationEffect.createOneShot(25, 255));
                }
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to trigger native heavyClick", e);
        }
    }
}
