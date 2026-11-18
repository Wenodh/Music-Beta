package com.wenodh.vibeon;

import android.net.Uri;
import android.util.Base64;
import java.io.File;
import java.io.FileOutputStream;
import java.util.UUID;
import androidx.core.content.ContextCompat;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.common.util.concurrent.ListenableFuture;

/** Capacitor control plane for the process-independent Media3 playback service. */
@CapacitorPlugin(name = "VibeOnPlayback")
public final class VibeOnPlaybackPlugin extends Plugin {
    private MediaController controller;
    private ListenableFuture<MediaController> controllerFuture;
    private Player.Listener playerListener;

    @Override
    public void load() {
        super.load();
        SessionToken token = new SessionToken(getContext(),
                new android.content.ComponentName(getContext(), VibeOnPlaybackService.class));
        controllerFuture = new MediaController.Builder(getContext(), token).buildAsync();
        controllerFuture.addListener(() -> {
            try {
                controller = controllerFuture.get();
                playerListener = new Player.Listener() {
                    @Override public void onPlaybackStateChanged(int state) {
                        if (state == Player.STATE_ENDED) notifyListeners("playbackEnded", new JSObject());
                    }
                    @Override public void onPlayWhenReadyChanged(boolean playWhenReady, int reason) {
                        // Redux mirrors the user's/system's play intent, not ExoPlayer's
                        // transient buffering state (isPlaying=false while loading is normal).
                        JSObject intent = new JSObject();
                        intent.put("playWhenReady", playWhenReady);
                        intent.put("audioFocusLoss", reason == Player.PLAY_WHEN_READY_CHANGE_REASON_AUDIO_FOCUS_LOSS);
                        notifyListeners("playbackIntentChanged", intent);

                        JSObject state = new JSObject();
                        state.put("isPlaying", playWhenReady);
                        notifyListeners("playbackChanged", state);
                    }
                };
                controller.addListener(playerListener);
            } catch (Exception error) {
                android.util.Log.e("VibeOnPlayback", "Media3 controller connection failed", error);
            }
        }, ContextCompat.getMainExecutor(getContext()));
    }

    private MediaController requireController(PluginCall call) {
        if (controller == null) {
            call.reject("Native playback service is not connected yet");
            return null;
        }
        return controller;
    }

    @PluginMethod
    public void setMediaItem(PluginCall call) {
        MediaController player = requireController(call);
        if (player == null) return;
        String uri = call.getString("uri");
        String base64 = call.getString("base64");
        if ((uri == null || uri.trim().isEmpty()) && (base64 == null || base64.isEmpty())) {
            call.reject("A playable media URI or offline audio payload is required");
            return;
        }
        if (base64 != null && !base64.isEmpty()) {
            File cachedAudio = new File(getContext().getCacheDir(), "media3-" + UUID.randomUUID() + ".audio");
            try (FileOutputStream output = new FileOutputStream(cachedAudio)) {
                output.write(Base64.decode(base64, Base64.DEFAULT));
                uri = Uri.fromFile(cachedAudio).toString();
            } catch (Exception error) {
                call.reject("Unable to cache offline audio for native playback", error);
                return;
            }
        }
        MediaMetadata metadata = new MediaMetadata.Builder()
                .setTitle(call.getString("title", "Vibe On"))
                .setArtist(call.getString("artist", ""))
                .setArtworkUri(call.getString("artworkUri") == null ? null : Uri.parse(call.getString("artworkUri")))
                .build();
        MediaItem item = new MediaItem.Builder()
                .setMediaId(call.getString("mediaId", uri == null ? "offline" : uri))
                .setUri(Uri.parse(uri))
                .setMediaMetadata(metadata)
                .build();
        player.setMediaItem(item);
        player.prepare();
        call.resolve();
    }

    @PluginMethod public void play(PluginCall call) {
        MediaController p = requireController(call); if (p == null) return;
        p.play(); call.resolve();
    }
    @PluginMethod public void pause(PluginCall call) {
        MediaController p = requireController(call); if (p == null) return;
        p.pause(); call.resolve();
    }
    @PluginMethod public void stop(PluginCall call) {
        MediaController p = requireController(call); if (p == null) return;
        p.stop(); call.resolve();
    }
    @PluginMethod public void seekTo(PluginCall call) {
        MediaController p = requireController(call); if (p == null) return;
        Double position = call.getDouble("positionMs");
        if (position == null || !Double.isFinite(position) || position < 0) {
            call.reject("positionMs must be a finite non-negative number"); return;
        }
        p.seekTo(position.longValue()); call.resolve();
    }
    @PluginMethod public void setVolume(PluginCall call) {
        MediaController p = requireController(call); if (p == null) return;
        Double volume = call.getDouble("volume");
        if (volume == null || !Double.isFinite(volume)) { call.reject("Invalid volume"); return; }
        p.setVolume((float) Math.max(0d, Math.min(1d, volume))); call.resolve();
    }
    @PluginMethod public void setPlaybackSpeed(PluginCall call) {
        MediaController p = requireController(call); if (p == null) return;
        Double speed = call.getDouble("speed");
        if (speed == null || !Double.isFinite(speed) || speed <= 0) { call.reject("Invalid playback speed"); return; }
        p.setPlaybackSpeed((float) speed.doubleValue()); call.resolve();
    }
    @PluginMethod public void getPlaybackState(PluginCall call) {
        MediaController p = requireController(call); if (p == null) return;
        JSObject state = new JSObject();
        state.put("isPlaying", p.isPlaying());
        state.put("positionMs", p.getCurrentPosition());
        state.put("durationMs", p.getDuration() < 0 ? 0 : p.getDuration());
        state.put("playbackState", p.getPlaybackState());
        state.put("mediaId", p.getCurrentMediaItem() == null ? "" : p.getCurrentMediaItem().mediaId);
        call.resolve(state);
    }

    @Override
    protected void handleOnDestroy() {
        if (controller != null && playerListener != null) controller.removeListener(playerListener);
        if (controllerFuture != null) MediaController.releaseFuture(controllerFuture);
        controller = null;
        super.handleOnDestroy();
    }
}
