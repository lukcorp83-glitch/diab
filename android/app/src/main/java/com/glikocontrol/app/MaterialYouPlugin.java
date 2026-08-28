package com.glikocontrol.app;

import android.os.Build;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MaterialYou")
public class MaterialYouPlugin extends Plugin {

    @PluginMethod
    public void getColors(PluginCall call) {
        JSObject ret = new JSObject();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ret.put("supported", true);
            
            try {
                // Fetch colors from android.R.color on Android 12+
                int color100 = getContext().getResources().getColor(android.R.color.system_accent1_100, getContext().getTheme());
                int color200 = getContext().getResources().getColor(android.R.color.system_accent1_200, getContext().getTheme());
                int color300 = getContext().getResources().getColor(android.R.color.system_accent1_300, getContext().getTheme());
                int color400 = getContext().getResources().getColor(android.R.color.system_accent1_400, getContext().getTheme());
                int color500 = getContext().getResources().getColor(android.R.color.system_accent1_500, getContext().getTheme());
                int color600 = getContext().getResources().getColor(android.R.color.system_accent1_600, getContext().getTheme());
                int color700 = getContext().getResources().getColor(android.R.color.system_accent1_700, getContext().getTheme());
                int color800 = getContext().getResources().getColor(android.R.color.system_accent1_800, getContext().getTheme());
                int color900 = getContext().getResources().getColor(android.R.color.system_accent1_900, getContext().getTheme());
                
                // Fallbacks for 50 and 950 since they might not be natively mapped perfectly,
                // we can use 100 for 50 and 900 for 950 or approximate
                int color50 = color100;
                int color950 = color900;

                ret.put("color50", String.format("#%06X", (0xFFFFFF & color50)));
                ret.put("color100", String.format("#%06X", (0xFFFFFF & color100)));
                ret.put("color200", String.format("#%06X", (0xFFFFFF & color200)));
                ret.put("color300", String.format("#%06X", (0xFFFFFF & color300)));
                ret.put("color400", String.format("#%06X", (0xFFFFFF & color400)));
                ret.put("color500", String.format("#%06X", (0xFFFFFF & color500)));
                ret.put("color600", String.format("#%06X", (0xFFFFFF & color600)));
                ret.put("color700", String.format("#%06X", (0xFFFFFF & color700)));
                ret.put("color800", String.format("#%06X", (0xFFFFFF & color800)));
                ret.put("color900", String.format("#%06X", (0xFFFFFF & color900)));
                ret.put("color950", String.format("#%06X", (0xFFFFFF & color950)));
                
                call.resolve(ret);
            } catch (Exception e) {
                Log.e("MaterialYouPlugin", "Failed to get system colors", e);
                ret.put("supported", false);
                call.resolve(ret);
            }
        } else {
            ret.put("supported", false);
            call.resolve(ret);
        }
    }
}
