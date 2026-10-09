package com.youshu.budget;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.net.ssl.HttpsURLConnection;

final class AiService {
    interface Callback { void done(int id, boolean ok, String message); }
    private static final String ALIAS = "youshu.netlify.access.v1";
    private static final String PREF = "ai_connection";
    private static final String PATH = "/api/parse-expense";
    private final Context context;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    AiService(Context context) { this.context = context.getApplicationContext(); }

    boolean isConnected() { return prefs().contains("site") && prefs().contains("ciphertext") && prefs().contains("iv"); }
    String siteName() { return prefs().getString("site", ""); }

    synchronized boolean saveConnection(String site, String token) {
        if (token == null || !token.matches("[A-Za-z0-9_-]{32,128}")) return false;
        String normalized = normalizeSite(site);
        if (normalized == null) return false;
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey());
            byte[] encrypted = cipher.doFinal(token.getBytes(StandardCharsets.UTF_8));
            return prefs().edit().putString("site", normalized)
                    .putString("ciphertext", Base64.encodeToString(encrypted, Base64.NO_WRAP))
                    .putString("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)).commit();
        } catch (Exception ignored) { return false; }
    }

    synchronized void clearConnection() { prefs().edit().clear().commit(); }

    void parse(String body, int id, Callback callback) {
        executor.execute(() -> {
            if (body == null || body.length() > 2_900_000 || !isConnected()) {
                callback.done(id, false, "请先连接有数的 Netlify 服务，或缩小图片。"); return;
            }
            HttpsURLConnection connection = null;
            try {
                String site = siteName();
                if (normalizeSite(site) == null) throw new IllegalStateException("服务地址无效，请重新连接。");
                connection = (HttpsURLConnection) new URL(site + PATH).openConnection();
                connection.setInstanceFollowRedirects(false);
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(50000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                connection.setRequestProperty("Authorization", "Bearer " + readToken());
                byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                if (bytes.length > 3_000_000) throw new IllegalStateException("图片过大，请换一张更小的图片。");
                connection.setFixedLengthStreamingMode(bytes.length);
                try (OutputStream output = connection.getOutputStream()) { output.write(bytes); }
                int status = connection.getResponseCode();
                if (status == 401 || status == 403) throw new IllegalStateException("连接凭据不正确，请到“我的”重新设置。");
                if (status == 413) throw new IllegalStateException("图片过大，请换一张更小的图片。");
                if (status == 429) throw new IllegalStateException("请求过于频繁，请稍后重试。");
                if (status == 503) throw new IllegalStateException("Netlify 服务尚未配置好，请检查站点变量。");
                if (status < 200 || status >= 300) throw new IllegalStateException("智能整理暂不可用（HTTP " + status + "）。");
                try (InputStream input = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[4096]; int count;
                    while ((count = input.read(buffer)) != -1) {
                        if (output.size() + count > 65536) throw new IllegalStateException("智能整理结果过长，请缩短内容。");
                        output.write(buffer, 0, count);
                    }
                    callback.done(id, true, output.toString(StandardCharsets.UTF_8.name()));
                }
            } catch (Exception error) {
                String message = error instanceof IllegalStateException ? error.getMessage() : "网络连接失败，请检查网络后重试。";
                callback.done(id, false, message);
            } finally { if (connection != null) connection.disconnect(); }
        });
    }

    void shutdown() { executor.shutdownNow(); }
    private SharedPreferences prefs() { return context.getSharedPreferences(PREF, Context.MODE_PRIVATE); }

    private static String normalizeSite(String site) {
        if (site == null) return null;
        Uri uri = Uri.parse(site.trim());
        String host = uri.getHost();
        if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null || !host.toLowerCase(Locale.ROOT).endsWith(".netlify.app") || host.length() <= ".netlify.app".length() || uri.getPort() != -1 || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null || (uri.getPath() != null && !uri.getPath().isEmpty() && !"/".equals(uri.getPath()))) return null;
        return "https://" + host.toLowerCase(Locale.ROOT);
    }

    private SecretKey secretKey() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        KeyStore.Entry entry = store.getEntry(ALIAS, null);
        if (entry instanceof KeyStore.SecretKeyEntry) return ((KeyStore.SecretKeyEntry) entry).getSecretKey();
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());
        return generator.generateKey();
    }

    private String readToken() throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, secretKey(), new GCMParameterSpec(128, Base64.decode(prefs().getString("iv", ""), Base64.NO_WRAP)));
        return new String(cipher.doFinal(Base64.decode(prefs().getString("ciphertext", ""), Base64.NO_WRAP)), StandardCharsets.UTF_8);
    }
}
