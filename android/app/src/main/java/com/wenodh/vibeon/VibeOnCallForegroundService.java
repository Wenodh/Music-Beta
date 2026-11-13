package com.wenodh.vibeon;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

public class VibeOnCallForegroundService extends Service {
    private PowerManager.WakeLock callWakeLock;
    private static final String CHANNEL_ID = "vibeon_active_call_channel";
    private static final int NOTIFICATION_ID = VibeOnCallNotificationManager.NOTIFICATION_ID;
    public static final String EXTRA_CALL_TYPE = "callType";
    public static final String EXTRA_FRIEND_NAME = "friendName";

    @Override
    public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Ongoing Calls", NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps an active Vibe On call available while the app is in the background");
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager != null && (callWakeLock == null || !callWakeLock.isHeld())) {
            callWakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "VibeOn:ActiveCall");
            callWakeLock.setReferenceCounted(false);
            callWakeLock.acquire();
        }
        String friendName = intent != null ? intent.getStringExtra(EXTRA_FRIEND_NAME) : "Friend";
        String callType = intent != null ? intent.getStringExtra(EXTRA_CALL_TYPE) : "audio";
        Intent openApp = new Intent(this, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            this, 0, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Vibe On call")
            .setContentText("Call with " + (friendName != null ? friendName : "Friend"))
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(contentIntent)
            .build();

        int serviceTypes = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            serviceTypes = ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
            if ("video".equals(callType)) {
                serviceTypes |= ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA;
            }
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, serviceTypes);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (SecurityException | IllegalStateException error) {
            stopSelf();
            return START_NOT_STICKY;
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        if (callWakeLock != null && callWakeLock.isHeld()) callWakeLock.release();
        callWakeLock = null;
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
