package com.wenodh.vibeon;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;

public class VibeOnCallNotificationManager {
    public static final String CHANNEL_ID = "vibeon_active_call_channel";
    public static final int NOTIFICATION_ID = 9002;
    public static final String ACTION_TOGGLE_MUTE = "com.wenodh.vibeon.ACTION_TOGGLE_MUTE";
    public static final String ACTION_END_CALL = "com.wenodh.vibeon.ACTION_END_CALL";

    private final Context context;
    private final NotificationManager notificationManager;

    public VibeOnCallNotificationManager(Context context) {
        this.context = context.getApplicationContext();
        this.notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannel();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Ongoing Calls",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Ongoing Voice and Video Call Controls");
            channel.setShowBadge(false);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    public void showCallNotification(String friendName, String callType, boolean isMuted, String duration) {
        if (notificationManager == null) return;

        // Intent to return to app / bring to front
        Intent openAppIntent = new Intent(context, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
                context,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        // Mute Action Intent
        Intent muteIntent = new Intent(ACTION_TOGGLE_MUTE);
        PendingIntent mutePendingIntent = PendingIntent.getBroadcast(
                context,
                1,
                muteIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        // End Call Action Intent
        Intent endIntent = new Intent(ACTION_END_CALL);
        PendingIntent endPendingIntent = PendingIntent.getBroadcast(
                context,
                2,
                endIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        String title = "Call with " + (friendName != null ? friendName : "Friend");
        String contentText = (isMuted ? "Muted · " : "Active · ") + (duration != null ? duration : "In Call");

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(contentText)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(openAppPendingIntent)
                .addAction(
                        android.R.drawable.ic_lock_silent_mode,
                        isMuted ? "Unmute" : "Mute",
                        mutePendingIntent
                )
                .addAction(
                        android.R.drawable.ic_menu_close_clear_cancel,
                        "End Call",
                        endPendingIntent
                );

        notificationManager.notify(NOTIFICATION_ID, builder.build());
    }

    public void clearCallNotification() {
        if (notificationManager != null) {
            notificationManager.cancel(NOTIFICATION_ID);
        }
    }
}
