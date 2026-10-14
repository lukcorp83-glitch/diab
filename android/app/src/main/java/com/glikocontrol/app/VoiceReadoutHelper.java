package com.glikocontrol.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioDeviceInfo;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;

import java.util.Locale;

public class VoiceReadoutHelper {

    private static final String TAG = "VoiceReadoutHelper";
    private static TextToSpeech ttsInstance;
    private static boolean isTtsReady = false;
    private static AudioFocusRequest audioFocusRequest;

    public static synchronized void init(Context context) {
        if (ttsInstance != null) return;
        try {
            final Context appContext = context.getApplicationContext();
            ttsInstance = new TextToSpeech(appContext, new TextToSpeech.OnInitListener() {
                @Override
                public void onInit(int status) {
                    if (status == TextToSpeech.SUCCESS) {
                        try {
                            int result = ttsInstance.setLanguage(new Locale("pl", "PL"));
                            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                                Log.w(TAG, "Język polski nie jest w pełni wspierany w silniku TTS, próba Locale.getDefault()");
                                ttsInstance.setLanguage(Locale.getDefault());
                            }
                            ttsInstance.setSpeechRate(1.05f); // Naturalna, dynamiczna mowa
                            ttsInstance.setPitch(1.0f);
                            isTtsReady = true;
                            Log.i(TAG, "Inicjalizacja silnika TextToSpeech zakończona pomyślnie.");
                        } catch (Exception e) {
                            Log.e(TAG, "Błąd konfiguracji języka TTS", e);
                        }
                    } else {
                        Log.e(TAG, "Nie udało się zainicjalizować TextToSpeech, status: " + status);
                    }
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Błąd tworzenia instancji TextToSpeech", e);
        }
    }

    public static boolean isHeadphonesConnected(Context context) {
        try {
            AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (am == null) return false;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioDeviceInfo[] devices = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
                for (AudioDeviceInfo dev : devices) {
                    int type = dev.getType();
                    if (type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                        type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
                        type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                        type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                        type == AudioDeviceInfo.TYPE_BLE_HEADSET ||
                        type == AudioDeviceInfo.TYPE_USB_HEADSET) {
                        return true;
                    }
                }
            } else {
                return am.isWiredHeadsetOn() || am.isBluetoothA2dpOn();
            }
        } catch (Exception e) {
            Log.e(TAG, "Błąd podczas sprawdzania słuchawek", e);
        }
        return false;
    }

    private static boolean isEnglishLanguage(Context context, String customLang) {
        if (customLang != null && !customLang.trim().isEmpty()) {
            return customLang.toLowerCase().startsWith("en");
        }
        try {
            SharedPreferences prefs = context.getSharedPreferences("GlikoPrefs", Context.MODE_PRIVATE);
            String saved = prefs.getString("app_language", null);
            if (saved != null && !saved.trim().isEmpty()) {
                return saved.toLowerCase().startsWith("en");
            }
        } catch (Exception ignored) {}
        return Locale.getDefault().getLanguage().toLowerCase().startsWith("en");
    }

    public static String getArrowSpeech(String arrow) {
        return getArrowSpeech(arrow, false);
    }

    public static String getArrowSpeech(String arrow, boolean isEnglish) {
        if (arrow == null) return isEnglish ? "steady" : "stabilnie";
        String a = arrow.trim();
        if (a.contains("↑↑") || a.equalsIgnoreCase("DoubleUp")) return isEnglish ? "rapid rise" : "bardzo szybki wzrost";
        if (a.contains("↑") || a.equalsIgnoreCase("SingleUp")) return isEnglish ? "rising" : "szybki wzrost";
        if (a.contains("↗") || a.equalsIgnoreCase("FortyFiveUp")) return isEnglish ? "slight rise" : "lekki wzrost";
        if (a.contains("→") || a.equalsIgnoreCase("Flat")) return isEnglish ? "steady" : "stabilnie";
        if (a.contains("↘") || a.equalsIgnoreCase("FortyFiveDown")) return isEnglish ? "slight fall" : "lekki spadek";
        if (a.contains("↓") || a.equalsIgnoreCase("SingleDown")) return isEnglish ? "falling" : "szybki spadek";
        if (a.contains("↓↓") || a.equalsIgnoreCase("DoubleDown")) return isEnglish ? "rapid fall" : "bardzo szybki spadek";
        return isEnglish ? "steady" : "stabilnie";
    }

    public static String buildSpeechPhrase(Context context) {
        return buildSpeechPhrase(context, null, null, null, null);
    }

    public static String buildSpeechPhrase(Context context, String customGlucose, String customTrend, String customDelta) {
        return buildSpeechPhrase(context, customGlucose, customTrend, customDelta, null);
    }

    public static String buildSpeechPhrase(Context context, String customGlucose, String customTrend, String customDelta, String customLang) {
        boolean isEn = isEnglishLanguage(context, customLang);
        SharedPreferences prefs = context.getSharedPreferences("GlikoWidgetPrefs", Context.MODE_PRIVATE);
        String glucose = (customGlucose != null && !customGlucose.trim().isEmpty()) ? customGlucose.trim() : prefs.getString("widget_glucose", null);
        String arrow = (customTrend != null && !customTrend.trim().isEmpty()) ? customTrend.trim() : prefs.getString("widget_arrow", "");
        String deltaStr = (customDelta != null && !customDelta.trim().isEmpty()) ? customDelta.trim() : prefs.getString("widget_delta", "");

        if (glucose == null || glucose.isEmpty() || glucose.equals("---")) {
            return isEn ? "No current glucose reading." : "Brak bieżącego odczytu.";
        }

        StringBuilder sb = new StringBuilder();
        // Przecinek po liczbie zamiast kropki gwarantuje, że syntezator przeczyta liczbę w mianowniku
        // (np. "sto czterdzieści dziewięć", a nie "stoczterdziestego dziewiątego").
        sb.append(glucose).append(", ");

        String arrowPhrase = getArrowSpeech(arrow, isEn);
        sb.append(arrowPhrase);

        if (deltaStr != null && !deltaStr.isEmpty() && !deltaStr.equals("---") && !deltaStr.equals("0") && !deltaStr.equals("+0") && !deltaStr.equals("-0")) {
            Double dVal = null;
            try {
                String cleanRaw = deltaStr.replace(",", ".").replace("+", "").trim();
                dVal = Double.parseDouble(cleanRaw);
            } catch (Exception ignored) {}

            if (dVal != null) {
                long rounded = Math.round(Math.abs(dVal));
                if (rounded > 0) {
                    if (isEn) {
                        sb.append(dVal > 0 ? ", up " : ", down ").append(rounded);
                    } else {
                        sb.append(dVal > 0 ? ", wzrost o " : ", spadek o ").append(rounded);
                    }
                }
            } else {
                String cleanDelta = deltaStr.replace("+", isEn ? "plus " : "plus ").replace("-", isEn ? "minus " : "minus ").trim();
                sb.append(isEn ? ", change " : ", zmiana ").append(cleanDelta);
            }
        }

        String iobStr = prefs.getString("widget_iob", "");
        if (iobStr != null && !iobStr.isEmpty() && !iobStr.equals("0") && !iobStr.equals("0.0") && !iobStr.equals("---")) {
            if (isEn) {
                String cleanIob = iobStr.replace(".", " point ");
                sb.append(". Active insulin ").append(cleanIob).append(" units");
            } else {
                String cleanIob = iobStr.replace(".", " przecinek ");
                sb.append(". Aktywna insulina ").append(cleanIob).append(" jednostki");
            }
        }

        return sb.toString();
    }

    public static void speakGlucose(final Context context, final boolean forceEvenWithoutHeadphones) {
        speakGlucose(context, forceEvenWithoutHeadphones, null, null, null, null);
    }

    public static void speakGlucose(final Context context, final boolean forceEvenWithoutHeadphones, final String customGlucose, final String customTrend, final String customDelta) {
        speakGlucose(context, forceEvenWithoutHeadphones, customGlucose, customTrend, customDelta, null);
    }

    public static void speakGlucose(final Context context, final boolean forceEvenWithoutHeadphones, final String customGlucose, final String customTrend, final String customDelta, final String customLang) {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                try {
                    if (!forceEvenWithoutHeadphones && !isHeadphonesConnected(context)) {
                        Log.i(TAG, "Pominięto odczyt głosowy: słuchawki nie są podłączone.");
                        return;
                    }

                    if (ttsInstance == null || !isTtsReady) {
                        init(context);
                    }

                    boolean isEn = isEnglishLanguage(context, customLang);
                    try {
                        Locale targetLocale = isEn ? Locale.US : new Locale("pl", "PL");
                        ttsInstance.setLanguage(targetLocale);
                    } catch (Exception e) {
                        Log.w(TAG, "Nie udało się przestawić języka TTS: " + e.getMessage());
                    }

                    final String phrase = buildSpeechPhrase(context, customGlucose, customTrend, customDelta, customLang);
                    Log.i(TAG, "Wypowiadanie komunikatu do słuchawek: " + phrase);

                    final AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
                    if (am != null) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                    .build();

                            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                                    .setAudioAttributes(playbackAttributes)
                                    .setAcceptsDelayedFocusGain(false)
                                    .build();

                            am.requestAudioFocus(audioFocusRequest);
                        } else {
                            am.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
                        }
                    }

                    final String utteranceId = "gliko_bg_" + System.currentTimeMillis();

                    if (ttsInstance != null) {
                        ttsInstance.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                            @Override
                            public void onStart(String id) {}

                            @Override
                            public void onDone(String id) {
                                releaseAudioFocus(am);
                            }

                            @Override
                            public void onError(String id) {
                                releaseAudioFocus(am);
                            }
                        });

                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            ttsInstance.speak(phrase, TextToSpeech.QUEUE_FLUSH, null, utteranceId);
                        } else {
                            ttsInstance.speak(phrase, TextToSpeech.QUEUE_FLUSH, null);
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Błąd podczas odczytu TTS", e);
                }
            }
        });
    }

    private static void releaseAudioFocus(AudioManager am) {
        try {
            if (am != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                    am.abandonAudioFocusRequest(audioFocusRequest);
                } else {
                    am.abandonAudioFocus(null);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Błąd podczas zwalniania audio focus", e);
        }
    }
}
