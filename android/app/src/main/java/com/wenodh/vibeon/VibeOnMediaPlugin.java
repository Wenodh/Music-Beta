package com.wenodh.vibeon;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "VibeOnMedia")
public class VibeOnMediaPlugin extends Plugin implements VibeOnAudioService.AudioFocusListener {

    private static final String TAG = "VibeOnMediaPlugin";
    private VibeOnAudioService audioService;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        super.load();
        audioService = new VibeOnAudioService(getContext(), this);
    }

    @PluginMethod
    public void requestAudioFocus(PluginCall call) {
        if (audioService != null) {
            boolean granted = audioService.requestAudioFocus();
            JSObject ret = new JSObject();
            ret.put("granted", granted);
            call.resolve(ret);
        } else {
            call.reject("Audio service not initialized");
        }
    }

    @PluginMethod
    public void abandonAudioFocus(PluginCall call) {
        if (audioService != null) {
            audioService.abandonAudioFocus();
            call.resolve();
        } else {
            call.reject("Audio service not initialized");
        }
    }

    @Override
    public void onAudioFocusLost() {
        mainHandler.post(() -> {
            JSObject ret = new JSObject();
            ret.put("event", "audioFocusLost");
            notifyListeners("audioFocusChanged", ret);
        });
    }

    @Override
    public void onAudioFocusGained() {
        mainHandler.post(() -> {
            JSObject ret = new JSObject();
            ret.put("event", "audioFocusGained");
            notifyListeners("audioFocusChanged", ret);
        });
    }

    @Override
    public void onHeadphonesDisconnected() {
        mainHandler.post(() -> {
            JSObject ret = new JSObject();
            ret.put("event", "headphonesDisconnected");
            notifyListeners("becomingNoisy", ret);
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (audioService != null) {
            audioService.abandonAudioFocus();
        }
        super.handleOnDestroy();
    }
}
