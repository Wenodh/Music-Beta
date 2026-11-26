package com.wenodh.vibeon;

import androidx.media3.common.C;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.Player;
import androidx.media3.common.MediaItem;
import androidx.media3.exoplayer.ExoPlayer;
import android.net.Uri;
import java.io.File;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

/**
 * Process-independent Android playback owner. The WebView is only a controller;
 * ExoPlayer and the MediaSession continue while the Activity is backgrounded.
 */
public final class VibeOnPlaybackService extends MediaSessionService {
    private ExoPlayer player;
    private MediaSession mediaSession;
    private File activeOfflineFile;

    private final Player.Listener cacheLifecycleListener = new Player.Listener() {
        @Override
        public void onMediaItemTransition(MediaItem mediaItem, int reason) {
            File nextFile = getOfflineCacheFile(mediaItem);
            if (activeOfflineFile != null && !activeOfflineFile.equals(nextFile)) {
                activeOfflineFile.delete();
            }
            activeOfflineFile = nextFile;
        }

        @Override
        public void onPlaybackStateChanged(int playbackState) {
            if (playbackState == Player.STATE_ENDED) {
                deleteActiveOfflineFile();
            }
        }
    };

    private File getOfflineCacheFile(MediaItem item) {
        if (item == null || item.localConfiguration == null || item.localConfiguration.uri == null) return null;
        Uri uri = item.localConfiguration.uri;
        if (!"file".equals(uri.getScheme())) return null;
        String path = uri.getPath();
        if (path == null || path.isEmpty()) return null;
        File file = new File(path);
        return file.getName().startsWith("media3-") ? file : null;
    }

    private void deleteActiveOfflineFile() {
        if (activeOfflineFile != null) {
            activeOfflineFile.delete();
            activeOfflineFile = null;
        }
    }

    private void cleanupExpiredOfflineFiles() {
        File[] files = getCacheDir().listFiles((dir, name) -> name.startsWith("media3-"));
        if (files == null) return;
        long cutoff = System.currentTimeMillis() - 24L * 60L * 60L * 1000L;
        for (File file : files) {
            if (file.lastModified() < cutoff) file.delete();
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        cleanupExpiredOfflineFiles();
        player = new ExoPlayer.Builder(this).build();
        AudioAttributes mediaAttributes = new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build();
        player.setAudioAttributes(mediaAttributes, true);
        player.setHandleAudioBecomingNoisy(true);
        player.setWakeMode(C.WAKE_MODE_LOCAL);
        player.addListener(cacheLifecycleListener);
        mediaSession = new MediaSession.Builder(this, player).build();
    }

    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public void onTaskRemoved(android.content.Intent rootIntent) {
        if (player != null
                && (!player.getPlayWhenReady() || player.getPlaybackState() == Player.STATE_ENDED)) {
            stopSelf();
        }
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
        }
        if (player != null) {
            player.removeListener(cacheLifecycleListener);
            player.release();
            player = null;
        }
        deleteActiveOfflineFile();
        super.onDestroy();
    }
}
