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

    public boolean requestAudioFocus() {
        if (audioManager == null) return false;

        int result;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes playbackAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build();

            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(playbackAttributes)
                    .setAcceptsDelayedFocusGain(false)
                    .setOnAudioFocusChangeListener(this)
                    .build();

            result = audioManager.requestAudioFocus(audioFocusRequest);
        } else {
            result = audioManager.requestAudioFocus(this, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        }

        boolean granted = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        if (granted) audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
        registerNoisyReceiver();
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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(audioFocusRequest);
            audioFocusRequest = null;
        } else {
            audioManager.abandonAudioFocus(this);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            audioManager.clearCommunicationDevice();
        } else {
            audioManager.setSpeakerphoneOn(false);
            audioManager.setMode(AudioManager.MODE_NORMAL);
        }
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
            case AudioManager.AUDIOFOCUS_GAIN:
                focusListener.onAudioFocusGained();
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                // For music streaming apps, pausing or ducking can be handled
                focusListener.onAudioFocusLost();
                break;
        }
    }
}
