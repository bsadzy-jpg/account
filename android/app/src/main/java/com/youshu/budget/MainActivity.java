package com.youshu.budget;

import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.json.JSONObject;

@SuppressWarnings("deprecation")
public class MainActivity extends Activity {
    private static final int OPEN_FILE_REQUEST = 1001;
    private static final int CREATE_FILE_REQUEST = 1002;
    private static final String APP_URL = "file:///android_asset/www/index.html";

    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private String pendingContent;
    private Object backCallback;
    private AiService aiService;

    @Override
    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(247, 248, 246));
        getWindow().setNavigationBarColor(Color.WHITE);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);

        webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        webView.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(
                        insets.getSystemWindowInsetLeft(),
                        insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(),
                        insets.getSystemWindowInsetBottom()
                );
            }
            return insets;
        });
        setContentView(webView);
        aiService = new AiService(this);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                return !("file".equals(uri.getScheme())
                        && uri.toString().startsWith("file:///android_asset/www/"));
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileChooserCallback != null) fileChooserCallback.onReceiveValue(null);
                fileChooserCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                boolean image = Arrays.stream(params.getAcceptTypes()).anyMatch(type -> type != null && type.startsWith("image/"));
                if (image) intent.setType("image/*");
                else {
                    intent.setType("*/*");
                    intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                            "application/json", "text/csv", "text/plain", "text/tab-separated-values"
                    });
                }
                startActivityForResult(intent, OPEN_FILE_REQUEST);
                return true;
            }
        });

        if (savedInstanceState == null) webView.loadUrl(APP_URL);
        else webView.restoreState(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            backCallback = Api33Back.register(this, this::handleBack);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OPEN_FILE_REQUEST) {
            if (fileChooserCallback == null) return;
            Uri[] result = resultCode == RESULT_OK && data != null && data.getData() != null
                    ? new Uri[]{data.getData()} : null;
            fileChooserCallback.onReceiveValue(result);
            fileChooserCallback = null;
            return;
        }
        if (requestCode == CREATE_FILE_REQUEST) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null && pendingContent != null) {
                try (OutputStream output = getContentResolver().openOutputStream(data.getData())) {
                    if (output == null) throw new IllegalStateException("无法打开目标文件");
                    output.write(pendingContent.getBytes(StandardCharsets.UTF_8));
                    Toast.makeText(this, "备份已保存", Toast.LENGTH_SHORT).show();
                } catch (Exception error) {
                    Toast.makeText(this, "备份保存失败，请重试", Toast.LENGTH_LONG).show();
                }
            }
            pendingContent = null;
        }
    }

    @Override
    @SuppressLint("GestureBackNavigation")
    public void onBackPressed() {
        handleBack();
    }

    private void handleBack() {
        if (webView.canGoBack()) webView.goBack();
        else finish();
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && backCallback != null) {
            Api33Back.unregister(this, backCallback);
        }
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidBridge");
            webView.destroy();
        }
        if (aiService != null) aiService.shutdown();
        super.onDestroy();
    }

    public final class AndroidBridge {
        @JavascriptInterface
        public boolean hasAiConnection() { return aiService.isConnected(); }

        @JavascriptInterface
        public boolean saveAiConnection(String site, String token) { return aiService.saveConnection(site, token); }

        @JavascriptInterface
        public void clearAiConnection() { aiService.clearConnection(); }

        @JavascriptInterface
        public String aiSite() { return aiService.siteName(); }

        @JavascriptInterface
        public void parseAi(String requestJson, int requestId) {
            aiService.parse(requestJson, requestId, (id, ok, message) -> runOnUiThread(() -> {
                if (webView != null) webView.evaluateJavascript(
                        "window.YoushuAI.receive(" + id + "," + ok + "," + JSONObject.quote(message) + ")", null);
            }));
        }

        @JavascriptInterface
        public void saveFile(String content, String filename, String mimeType) {
            runOnUiThread(() -> {
                pendingContent = content;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(mimeType == null || mimeType.isEmpty() ? "application/json" : mimeType);
                intent.putExtra(Intent.EXTRA_TITLE, safeFilename(filename));
                startActivityForResult(intent, CREATE_FILE_REQUEST);
            });
        }

        private String safeFilename(String filename) {
            String fallback = "有数-账本备份.json";
            if (filename == null || filename.trim().isEmpty()) return fallback;
            String cleaned = filename.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "-").trim();
            return cleaned.isEmpty() ? fallback : cleaned;
        }
    }

    @TargetApi(33)
    private static final class Api33Back {
        private static Object register(Activity activity, Runnable action) {
            OnBackInvokedCallback callback = action::run;
            activity.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    callback
            );
            return callback;
        }

        private static void unregister(Activity activity, Object callback) {
            activity.getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(
                    (OnBackInvokedCallback) callback
            );
        }
    }
}
