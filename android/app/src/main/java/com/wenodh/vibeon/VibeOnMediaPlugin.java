package com.wenodh.vibeon;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Handler;
import android.os.Looper;
import androidx.core.content.ContextCompat;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import android.Manifest;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "VibeOnMedia",
    permissions = {
        @Permission(
            strings = { Manifest.permission.POST_NOTIFICATIONS },
            alias = "notifications"
        )
    }
)
public class VibeOnMediaPlugin extends Plugin implements VibeOnAudioService.AudioFocusListener {

    private static final String TAG = "VibeOnMediaPlugin";
    private VibeOnAudioService audioService;
    private VibeOnCallNotificationManager callNotificationManager;
    private BroadcastReceiver callActionReceiver;
    private boolean callServiceActive = false;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        super.load();
        audioService = new VibeOnAudioService(getContext(), this);
        callNotificationManager = new VibeOnCallNotificationManager(getContext());

        callActionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null || intent.getAction() == null) return;
                String action = intent.getAction();
                JSObject ret = new JSObject();
                if (VibeOnCallNotificationManager.ACTION_TOGGLE_MUTE.equals(action)) {
                    ret.put("action", "toggleMute");
                    notifyListeners("callNotificationAction", ret);
                } else if (VibeOnCallNotificationManager.ACTION_END_CALL.equals(action)) {
                    ret.put("action", "endCall");
                    notifyListeners("callNotificationAction", ret);
                } else if (VibeOnCallNotificationManager.ACTION_ACCEPT_CALL.equals(action)) {
                    ret.put("action", "acceptCall");
                    notifyListeners("callNotificationAction", ret);
                } else if (VibeOnCallNotificationManager.ACTION_DECLINE_CALL.equals(action)) {
                    ret.put("action", "declineCall");
                    notifyListeners("callNotificationAction", ret);
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(VibeOnCallNotificationManager.ACTION_TOGGLE_MUTE);
        filter.addAction(VibeOnCallNotificationManager.ACTION_END_CALL);
        filter.addAction(VibeOnCallNotificationManager.ACTION_ACCEPT_CALL);
        filter.addAction(VibeOnCallNotificationManager.ACTION_DECLINE_CALL);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(callActionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(callActionReceiver, filter);
        }
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
    public void setSpeakerphoneOn(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        if (audioService != null) {
            audioService.setSpeakerphoneOn(enabled);
            call.resolve();
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

    @PluginMethod
    public void startCallForegroundService(PluginCall call) {
        String friendName = call.getString("friendName", "Friend");
        String callType = call.getString("callType", "audio");
        Intent serviceIntent = new Intent(getContext(), VibeOnCallForegroundService.class);
        serviceIntent.putExtra(VibeOnCallForegroundService.EXTRA_FRIEND_NAME, friendName);
        serviceIntent.putExtra(VibeOnCallForegroundService.EXTRA_CALL_TYPE, callType);
        try {
            ContextCompat.startForegroundService(getContext(), serviceIntent);
            callServiceActive = true;
            call.resolve();
        } catch (Exception error) {
            Log.e(TAG, "Unable to start foreground call service", error);
            call.reject("Unable to keep the call active in the background", error);
        }
    }

    @PluginMethod
    public void stopCallForegroundService(PluginCall call) {
        getContext().stopService(new Intent(getContext(), VibeOnCallForegroundService.class));
        callServiceActive = false;
        if (callNotificationManager != null) callNotificationManager.clearCallNotification();
        call.resolve();
    }

    @PluginMethod
    public void showIncomingCallNotification(PluginCall call) {
        String callerName = call.getString("callerName", "Friend");
        String callType = call.getString("callType", "audio");
        if (callNotificationManager != null) {
            callNotificationManager.showIncomingCallNotification(callerName, callType);
            call.resolve();
        } else {
            call.reject("Call notification manager not initialized");
        }
    }

    @PluginMethod
    public void clearIncomingCallNotification(PluginCall call) {
        if (callNotificationManager != null) {
            callNotificationManager.clearIncomingCallNotification();
            call.resolve();
        } else {
            call.reject("Call notification manager not initialized");
        }
    }

    @PluginMethod
    public void showCallNotification(PluginCall call) {
        String friendName = call.getString("friendName", "Friend");
        String callType = call.getString("callType", "audio");
        boolean isMuted = Boolean.TRUE.equals(call.getBoolean("isMuted", false));
        String duration = call.getString("duration", "Active");

        if (callNotificationManager != null) {
            callNotificationManager.showCallNotification(friendName, callType, isMuted, duration);
            call.resolve();
        } else {
            call.reject("Call notification manager not initialized");
        }
    }

    @PluginMethod
    public void clearCallNotification(PluginCall call) {
        if (callNotificationManager != null) {
            callNotificationManager.clearCallNotification();
            call.resolve();
        } else {
            call.reject("Call notification manager not initialized");
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
        if (audioService != null && !callServiceActive) {
            audioService.abandonAudioFocus();
        }
        if (callNotificationManager != null && !callServiceActive) {
            callNotificationManager.clearCallNotification();
        }
        if (callNotificationManager != null) {
            callNotificationManager.clearIncomingCallNotification();
        }
        if (callActionReceiver != null) {
            try {
                getContext().unregisterReceiver(callActionReceiver);
            } catch (Exception ignored) {}
        }
        super.handleOnDestroy();
    }
}
