package com.indelify.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();
        // Ignore the phone's system font-size setting inside the WebView so text and headings
        // keep the layout we designed for, instead of scaling up and overflowing narrow screens.
        getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
