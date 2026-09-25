package com.glikocontrol.app;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.util.Log;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    private static final String TAG = "ApkInstaller";
    private long currentDownloadId = -1;
    private BroadcastReceiver downloadReceiver;

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        String version = call.getString("version", "update");
        boolean isBeta = Boolean.TRUE.equals(call.getBoolean("isBeta", false));

        if (url == null || url.trim().isEmpty()) {
            call.reject("Brak prawidłowego adresu URL pliku APK.");
            return;
        }

        Context context = getContext();
        if (context == null) {
            call.reject("Brak kontekstu aplikacji Android.");
            return;
        }

        try {
            // Unikalna nazwa pliku z uwzględnieniem kanału (Beta vs Main) i wersji
            String filename = isBeta 
                ? "GlikoControl_" + version + "-beta.apk" 
                : "GlikoControl_" + version + ".apk";

            // Upewnij się, że stary plik o tej nazwie w katalogu Pobrane jest czyszczony
            File destinationFile = new File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), filename);
            if (destinationFile.exists()) {
                destinationFile.delete();
            }

            DownloadManager downloadManager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
            if (downloadManager == null) {
                call.reject("Usługa DownloadManager jest niedostępna w tym systemie.");
                return;
            }

            Uri downloadUri = Uri.parse(url);
            DownloadManager.Request request = new DownloadManager.Request(downloadUri);
            request.setTitle(isBeta ? "GlikoControl Beta " + version : "GlikoControl " + version);
            request.setDescription("Pobieranie aktualizacji aplikacji...");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationUri(Uri.fromFile(destinationFile));
            request.setMimeType("application/vnd.android.package-archive");

            // Rejestracja nasłuchiwania na zakończenie pobierania
            registerDownloadCompleteReceiver(destinationFile);

            currentDownloadId = downloadManager.enqueue(request);
            Log.d(TAG, "Rozpoczęto pobieranie APK ID: " + currentDownloadId + " do: " + destinationFile.getAbsolutePath());

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("downloadId", currentDownloadId);
            ret.put("filename", filename);
            call.resolve(ret);

        } catch (Exception e) {
            Log.e(TAG, "Błąd inicjowania pobierania APK", e);
            call.reject("Błąd pobierania instalatora: " + e.getMessage(), e);
        }
    }

    private synchronized void registerDownloadCompleteReceiver(final File targetApkFile) {
        final Context context = getContext();
        if (context == null) return;

        // Wyrejestruj stary odbiornik jeśli istniał
        if (downloadReceiver != null) {
            try {
                context.unregisterReceiver(downloadReceiver);
            } catch (Exception ignored) {}
            downloadReceiver = null;
        }

        downloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent intent) {
                String action = intent.getAction();
                if (DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(action)) {
                    long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (id == currentDownloadId && id != -1) {
                        Log.d(TAG, "Pobieranie APK ukończone pomyślnie. Rozpoczynanie instalacji...");
                        openApkInstaller(targetApkFile);
                        
                        try {
                            ctx.unregisterReceiver(this);
                        } catch (Exception ignored) {}
                        downloadReceiver = null;
                    }
                }
            }
        };

        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(downloadReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            context.registerReceiver(downloadReceiver, filter);
        }
    }

    @PluginMethod
    public void openApkInstaller(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("Brak ścieżki pliku");
            return;
        }
        File file = new File(path);
        if (!file.exists()) {
            call.reject("Plik nie istnieje: " + path);
            return;
        }
        boolean ok = openApkInstaller(file);
        JSObject ret = new JSObject();
        ret.put("success", ok);
        call.resolve(ret);
    }

    private boolean openApkInstaller(File apkFile) {
        Context context = getContext();
        if (context == null || !apkFile.exists()) {
            Log.e(TAG, "Nie można otworzyć instalatora - brak pliku lub kontekstu");
            return false;
        }

        try {
            Uri apkUri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                apkUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    apkFile
                );
            } else {
                apkUri = Uri.fromFile(apkFile);
            }

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            context.startActivity(installIntent);
            Log.d(TAG, "Uruchomiono systemowy instalator dla: " + apkUri.toString());
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Błąd podczas uruchamiania instalatora APK", e);
            return false;
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (downloadReceiver != null && getContext() != null) {
            try {
                getContext().unregisterReceiver(downloadReceiver);
            } catch (Exception ignored) {}
            downloadReceiver = null;
        }
        super.handleOnDestroy();
    }
}
