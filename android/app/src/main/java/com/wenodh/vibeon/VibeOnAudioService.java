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

public class VibeOnAudioService implements AudioManager.OnAudioFocusChangeListener {

    private static final String TAG = "VibeOnAudioService";
    private final Context context;
    private final AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private BroadcastReceiver noisyReceiver;
    private boolean isReceiverRegistered = false;
    private boolean legacyFocusRequested = false;
    private boolean isCallAudioMode = false;
    private AudioFocusListener focusListener;

    public interface AudioFocusListener {
        void onAudioFocusLost();
        void onAudioFocusGained();
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

        // The app has one active audio owner at a time. Release the previous request before
        // replacing it so the old AudioFocusRequest cannot be orphaned.
        abandonCurrentFocusRequest();

        int result;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(forCall ? AudioAttributes.USAGE_VOICE_COMMUNICATION : AudioAttributes.USAGE_MEDIA)
                    .setContentType(forCall ? AudioAttributes.CONTENT_TYPE_SPEECH : AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();

            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(attributes)
                    .setAcceptsDelayedFocusGain(false)
                    .setOnAudioFocusChangeListener(this)
                    .build();

            result = audioManager.requestAudioFocus(audioFocusRequest);
        } else {
            int streamType = forCall ? AudioManager.STREAM_VOICE_CALL : AudioManager.STREAM_MUSIC;
            result = audioManager.requestAudioFocus(this, streamType, AudioManager.AUDIOFOCUS_GAIN);
            legacyFocusRequested = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        }

        boolean granted = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        if (granted) {
            isCallAudioMode = forCall;
            if (forCall) {
                audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
            } else if (audioManager.getMode() == AudioManager.MODE_IN_COMMUNICATION) {
                audioManager.setMode(AudioManager.MODE_NORMAL);
            }
            registerNoisyReceiver();
        } else {
            isCallAudioMode = false;
            unregisterNoisyReceiver();
        }
        return granted;
    }

    public void setSpeakerphoneOn(boolean enabled) {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            android.media.AudioDeviceInfo target = null;
            for (android.media.AudioDeviceInfo device : audioManager.getAvailableCommunicationDevices()) {
                if (enabled && device.getType() == android.media.AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                    target = device;
                    break;
                }
                if (!enabled && device.getType() == android.media.AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) {
                    target = device;
                }
            }
            if (target != null) audioManager.setCommunicationDevice(target);
        } else {
            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
            audioManager.setSpeakerphoneOn(enabled);
        }
    }

    public void abandonAudioFocus() {
        unregisterNoisyReceiver();
        if (audioManager == null) return;

        boolean wasCallAudioMode = isCallAudioMode;
        abandonCurrentFocusRequest();

        if (wasCallAudioMode) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                audioManager.clearCommunicationDevice();
            } else {
                audioManager.setSpeakerphoneOn(false);
                audioManager.setMode(AudioManager.MODE_NORMAL);
            }
        }
    }

    private void abandonCurrentFocusRequest() {
        if (audioManager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(audioFocusRequest);
            audioFocusRequest = null;
        } else if (legacyFocusRequested) {
            audioManager.abandonAudioFocus(this);
            legacyFocusRequested = false;
        }

        if (isCallAudioMode) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                audioManager.clearCommunicationDevice();
            } else {
                audioManager.setSpeakerphoneOn(false);
                audioManager.setMode(AudioManager.MODE_NORMAL);
            }
        }
        isCallAudioMode = false;
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

    @Override
    public void onAudioFocusChange(int focusChange) {
        Log.i(TAG, "Audio focus changed: " + focusChange);
        if (focusListener == null) return;

        switch (focusChange) {
            case AudioManager.AUDIOFOCUS_LOSS:
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                focusListener.onAudioFocusLost();
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                // Do not pause music for a duck request; Android can lower the media stream.
                // Voice-call UI handles its own ducking policy separately.
                break;
            case AudioManager.AUDIOFOCUS_GAIN:
                focusListener.onAudioFocusGained();
                break;
        }
    }
}
