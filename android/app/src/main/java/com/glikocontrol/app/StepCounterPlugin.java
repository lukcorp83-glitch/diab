package com.glikocontrol.app;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

@CapacitorPlugin(
    name = "StepCounter",
    permissions = {
        @Permission(
            strings = { Manifest.permission.ACTIVITY_RECOGNITION },
            alias = "activity"
        )
    }
)
public class StepCounterPlugin extends Plugin implements SensorEventListener {

    private SensorManager sensorManager;
    private Sensor stepCounterSensor;
    private Sensor stepDetectorSensor;
    public static final String PREFS_NAME = "glikocontrol_step_counter";
    public static final String PREF_LAST_DATE = "last_step_date";
    public static final String PREF_INITIAL_STEPS = "initial_steps_today";
    public static final String PREF_TOTAL_STEPS = "total_steps_today";

    @Override
    public void load() {
        super.load();
        initSensors();
    }

    private void initSensors() {
        try {
            sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
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
            android.util.Log.e("StepCounterPlugin", "Error initializing step sensor", e);
        }
    }

    public static String getTodayString() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
    }

    public static synchronized void handleSensorEvent(Context context, SensorEvent event) {
        if (context == null || event == null || event.sensor == null) return;
        if (event.sensor.getType() == Sensor.TYPE_STEP_COUNTER) {
            float totalSinceReboot = event.values[0];
            updateStepsWithCounter(context, (long) totalSinceReboot);
        } else if (event.sensor.getType() == Sensor.TYPE_STEP_DETECTOR) {
            if (event.values[0] == 1.0f) {
                incrementStepDetector(context);
            }
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        handleSensorEvent(getContext(), event);
    }

    public static synchronized void updateStepsWithCounter(Context context, long totalSinceReboot) {
        if (context == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String today = getTodayString();
        String lastDate = prefs.getString(PREF_LAST_DATE, "");
        long initialSteps = prefs.getLong(PREF_INITIAL_STEPS, -1);

        if (!today.equals(lastDate) || initialSteps < 0 || initialSteps > totalSinceReboot) {
            initialSteps = totalSinceReboot;
            prefs.edit()
                .putString(PREF_LAST_DATE, today)
                .putLong(PREF_INITIAL_STEPS, initialSteps)
                .putLong(PREF_TOTAL_STEPS, 0)
                .apply();
        }

        long todaySteps = Math.max(0, totalSinceReboot - initialSteps);
        prefs.edit()
            .putLong(PREF_TOTAL_STEPS, todaySteps)
            .apply();
    }

    public static synchronized void incrementStepDetector(Context context) {
        if (context == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String today = getTodayString();
        String lastDate = prefs.getString(PREF_LAST_DATE, "");
        long current = prefs.getLong(PREF_TOTAL_STEPS, 0);

        if (!today.equals(lastDate)) {
            current = 0;
            prefs.edit().putString(PREF_LAST_DATE, today).apply();
        }

        current++;
        prefs.edit().putLong(PREF_TOTAL_STEPS, current).apply();
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
    }

    @PluginMethod
    public void getTodaySteps(PluginCall call) {
        if (sensorManager != null) {
            if (stepCounterSensor != null) {
                sensorManager.registerListener(this, stepCounterSensor, SensorManager.SENSOR_DELAY_NORMAL);
            } else if (stepDetectorSensor != null) {
                sensorManager.registerListener(this, stepDetectorSensor, SensorManager.SENSOR_DELAY_NORMAL);
            }
        }

        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String today = getTodayString();
        String lastDate = prefs.getString(PREF_LAST_DATE, "");
        long steps = 0;
        if (today.equals(lastDate)) {
            steps = prefs.getLong(PREF_TOTAL_STEPS, 0);
        }

        boolean isSupported = (stepCounterSensor != null || stepDetectorSensor != null);

        JSObject ret = new JSObject();
        ret.put("steps", steps);
        ret.put("isSupported", isSupported);
        ret.put("date", today);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED) {
                requestPermissionForAlias("activity", call, "permissionCallback");
                return;
            }
        }
        initSensors();
        JSObject ret = new JSObject();
        ret.put("granted", true);
        call.resolve(ret);
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        boolean granted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            granted = (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED);
        }
        if (granted) {
            initSensors();
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }
}
