package com.wenodh.vibeon;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VibeOnMediaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
