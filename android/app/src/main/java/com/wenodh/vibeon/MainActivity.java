package com.wenodh.vibeon;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private void dispatchCallNotificationAction(Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();
        if (VibeOnCallNotificationManager.ACTION_ACCEPT_CALL.equals(action) ||
            VibeOnCallNotificationManager.ACTION_DECLINE_CALL.equals(action)) {
            Intent broadcast = new Intent(action).setPackage(getPackageName());
            sendBroadcast(broadcast);
            intent.setAction(null);
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VibeOnMediaPlugin.class);
        super.onCreate(savedInstanceState);
        getWindow().getDecorView().post(() -> dispatchCallNotificationAction(getIntent()));
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        dispatchCallNotificationAction(intent);
    }
}
