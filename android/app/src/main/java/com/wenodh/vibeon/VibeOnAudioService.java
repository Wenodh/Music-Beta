package com.wenodh.vibeon;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.util.Log;

public class VibeOnAudioService {

    private static final String TAG = "VibeOnAudioService";
    private final Context context;
    private final AudioManager audioManager;
    private AudioFocusRequest mediaAudioFocusRequest;
    private AudioFocusRequest callAudioFocusRequest;
    private final AudioManager.OnAudioFocusChangeListener mediaFocusListener =
            focusChange -> onAudioFocusChange(focusChange, false);
    private final AudioManager.OnAudioFocusChangeListener callFocusListener =
            focusChange -> onAudioFocusChange(focusChange, true);
    private BroadcastReceiver noisyReceiver;
    private boolean isReceiverRegistered = false;
    private boolean legacyFocusRequested = false;
    private boolean legacyFocusForCall = false;
    private boolean isCallAudioMode = false;
    private AudioFocusListener focusListener;

    public interface AudioFocusListener {
        void onAudioFocusLost(boolean forCall);
        void onAudioFocusLostTransient(boolean forCall);
        void onAudioFocusGained(boolean forCall);
        void onHeadphonesDisconnected();
    }

    public VibeOnAudioService(Context context, AudioFocusListener listener) {
        this.context = context.getApplicationContext();
        this.audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        this.focusListener = listener;
    }

    /**
     * Request focus for either media playback or a voice/video call.
     * Music must use USAGE_MEDIA and must never switch the device into communication mode.
     * Calls use USAGE_VOICE_COMMUNICATION and explicitly select communication routing.
     */
    public boolean requestAudioFocus(boolean forCall) {
        if (audioManager == null) return false;

        // Media and call focus have separate ownership. Pausing music while a call starts
        // must not accidentally abandon the call's focus request.
        abandonAudioFocus(forCall);

        int result;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(forCall ? AudioAttributes.USAGE_VOICE_COMMUNICATION : AudioAttributes.USAGE_MEDIA)
                    .setContentType(forCall ? AudioAttributes.CONTENT_TYPE_SPEECH : AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();

            AudioFocusRequest request = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(attributes)
                    .setAcceptsDelayedFocusGain(false)
                    .setOnAudioFocusChangeListener(forCall ? callFocusListener : mediaFocusListener)
                    .build();

            result = audioManager.requestAudioFocus(request);
            if (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                if (forCall) callAudioFocusRequest = request;
                else mediaAudioFocusRequest = request;
            }
        } else {
            int streamType = forCall ? AudioManager.STREAM_VOICE_CALL : AudioManager.STREAM_MUSIC;
            result = audioManager.requestAudioFocus(forCall ? callFocusListener : mediaFocusListener, streamType, AudioManager.AUDIOFOCUS_GAIN);
            legacyFocusRequested = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
            legacyFocusForCall = forCall;
        }

        boolean granted = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        if (granted) {
            if (forCall) {
                isCallAudioMode = true;
                audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
            }
            registerNoisyReceiver();
        } else {
            if (forCall) isCallAudioMode = false;
            if (!hasAnyAudioFocus()) unregisterNoisyReceiver();
        }
        return granted;
    }

    public void setSpeakerphoneOn(boolean enabled) {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!enabled) {
                // Restore Android's preferred communication route (Bluetooth/wired headset
                // when connected), rather than forcing the built-in earpiece.
                audioManager.clearCommunicationDevice();
                return;
            }

            android.media.AudioDeviceInfo speaker = null;
            for (android.media.AudioDeviceInfo device : audioManager.getAvailableCommunicationDevices()) {
                if (device.getType() == android.media.AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                    speaker = device;
                    break;
                }
            }
            if (speaker != null) audioManager.setCommunicationDevice(speaker);
        } else {
            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
            audioManager.setSpeakerphoneOn(enabled);
        }
    }

    public void abandonAudioFocus(boolean forCall) {
        if (audioManager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioFocusRequest request = forCall ? callAudioFocusRequest : mediaAudioFocusRequest;
            if (request != null) {
                audioManager.abandonAudioFocusRequest(request);
                if (forCall) callAudioFocusRequest = null;
                else mediaAudioFocusRequest = null;
            }
        } else if (legacyFocusRequested && legacyFocusForCall == forCall) {
            audioManager.abandonAudioFocus(forCall ? callFocusListener : mediaFocusListener);
            legacyFocusRequested = false;
        }

        if (forCall && isCallAudioMode) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                audioManager.clearCommunicationDevice();
            } else {
                audioManager.setSpeakerphoneOn(false);
                audioManager.setMode(AudioManager.MODE_NORMAL);
            }
            isCallAudioMode = false;
        }
        if (!hasAnyAudioFocus()) unregisterNoisyReceiver();
    }

    private boolean hasAnyAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return mediaAudioFocusRequest != null || callAudioFocusRequest != null;
        }
        return legacyFocusRequested;
    }

    public void abandonAudioFocus() {
        abandonAudioFocus(false);
    }

    private void registerNoisyReceiver() {
        if (!isReceiverRegistered) {
            noisyReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) {
                        Log.i(TAG, "Audio becoming noisy - headphones disconnected");
                        if (focusListener != null) {
                            focusListener.onHeadphonesDisconnected();
                        }
                    }
                }
            };
            IntentFilter filter = new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(noisyReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                context.registerReceiver(noisyReceiver, filter);
            }
            isReceiverRegistered = true;
        }
    }

    private void unregisterNoisyReceiver() {
        if (isReceiverRegistered && noisyReceiver != null) {
            try {
                context.unregisterReceiver(noisyReceiver);
            } catch (Exception e) {
                Log.w(TAG, "Failed to unregister noisy receiver", e);
            }
            isReceiverRegistered = false;
            noisyReceiver = null;
        }
    }

    private void onAudioFocusChange(int focusChange, boolean forCall) {
        Log.i(TAG, "Audio focus changed: " + focusChange + " (forCall=" + forCall + ")");
        if (focusListener == null) return;

        switch (focusChange) {
            case AudioManager.AUDIOFOCUS_LOSS:
                focusListener.onAudioFocusLost(forCall);
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                focusListener.onAudioFocusLostTransient(forCall);
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                // Do not pause music for a duck request; Android can lower the media stream.
                break;
            case AudioManager.AUDIOFOCUS_GAIN:
                focusListener.onAudioFocusGained(forCall);
                break;
        }
    }
}
