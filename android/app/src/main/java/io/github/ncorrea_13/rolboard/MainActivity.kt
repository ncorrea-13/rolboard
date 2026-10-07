package io.github.ncorrea_13.rolboard

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.DocumentsContract
import android.provider.Settings
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.view.WindowInsets
import android.widget.FrameLayout
import android.widget.TextView
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileNotFoundException
import java.io.InputStream
import java.util.concurrent.Executors
import mobile.Mobile
import org.json.JSONObject

class MainActivity : Activity() {
    private lateinit var web: WebView
    private val io = Executors.newCachedThreadPool()
    private val sync = Executors.newSingleThreadExecutor()
    private var pendingPick: Pair<String, String>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            Mobile.start(filesDir.absolutePath)
        } catch (e: Exception) {
            setContentView(TextView(this).apply { text = "Rolboard: ${e.message}" })
            return
        }

        web = WebView(this)
        web.setBackgroundColor(BACKGROUND)
        web.settings.textZoom = 100
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.allowFileAccess = false
        web.settings.allowContentAccess = false
        web.webViewClient = Client()
        web.addJavascriptInterface(Bridge(), "RolboardAndroid")
        val root = FrameLayout(this)
        root.setBackgroundColor(BACKGROUND)
        root.addView(web)
        root.setOnApplyWindowInsetsListener { view, insets ->
            if (Build.VERSION.SDK_INT >= 30) {
                val bars = insets.getInsets(
                    WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout() or WindowInsets.Type.ime(),
                )
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            } else {
                @Suppress("DEPRECATION")
                view.setPadding(
                    insets.systemWindowInsetLeft,
                    insets.systemWindowInsetTop,
                    insets.systemWindowInsetRight,
                    insets.systemWindowInsetBottom,
                )
            }
            insets
        }
        window.decorView.setBackgroundColor(BACKGROUND)
        setContentView(root)

        if (savedInstanceState == null) web.loadUrl("$ORIGIN/")
        else web.restoreState(savedInstanceState)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        if (::web.isInitialized) web.saveState(outState)
    }

    @Deprecated("Deprecated in Java")
    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed()
    }

    override fun onPause() {
        super.onPause()
        if (::web.isInitialized) sync.execute { runCatching { Mobile.push() } }
    }

    override fun onResume() {
        super.onResume()
        if (!::web.isInitialized) return
        sync.execute {
            if (runCatching { Mobile.pull() }.getOrDefault(false)) runOnUiThread { web.reload() }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (isFinishing) {
            io.shutdown()
            sync.execute { runCatching { Mobile.stop() } }
            sync.shutdown()
        }
    }

    private fun deliver(result: JSONObject) {
        web.post { web.evaluateJavascript("window.__rolboardResolve($result)", null) }
    }

    private fun deliverText(id: String, status: Int, text: String) {
        deliver(
            JSONObject().put("id", id).put("status", status).put("contentType", "text/plain")
                .put("body", Base64.encodeToString(text.toByteArray(), Base64.NO_WRAP)),
        )
    }

    private fun hasStorageAccess(): Boolean =
        if (Build.VERSION.SDK_INT >= 30) Environment.isExternalStorageManager()
        else checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED

    private fun requestStorageAccess() {
        if (Build.VERSION.SDK_INT >= 30) {
            val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:$packageName"))
            runCatching { startActivity(intent) }
                .onFailure { startActivity(Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)) }
        } else {
            requestPermissions(
                arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE),
                PERMISSION_STORAGE,
            )
        }
    }

    private fun settingsJson(): String =
        JSONObject().put("vaultsRoot", Mobile.vaultsRoot()).put("syncDir", Mobile.syncDir()).toString()

    private fun pickFolder(id: String, kind: String) {
        if (!hasStorageAccess()) {
            requestStorageAccess()
            deliverText(id, 403, "storage permission")
            return
        }
        pendingPick = id to kind
        startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT_TREE), PICK_FOLDER)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != PICK_FOLDER) return
        val (id, kind) = pendingPick ?: return
        pendingPick = null
        val uri = data?.data
        if (resultCode != RESULT_OK || uri == null) {
            deliverText(id, 204, "")
            return
        }
        val path = treeUriToPath(uri)
        if (path == null || !File(path).canRead()) {
            deliverText(id, 400, "unreadable folder")
            return
        }
        io.execute {
            try {
                if (kind == "sync-dir") Mobile.setSyncDir(path) else Mobile.setVaultsRoot(path)
                deliverText(id, 200, settingsJson())
            } catch (e: Exception) {
                deliverText(id, 500, e.message ?: "error")
            }
        }
    }

    private fun openExternal(url: String) {
        val uri = Uri.parse(url)
        if (uri.scheme != "https" || uri.host.isNullOrEmpty()) return
        runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
    }

    private inner class Client : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            if (request.url.host == HOST) return false
            openExternal(request.url.toString())
            return true
        }

        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
            val url = request.url
            if (url.host != HOST) return null
            val path = url.encodedPath ?: "/"
            return if (path.startsWith("/api/")) {
                api(path + (url.encodedQuery?.let { "?$it" } ?: ""))
            } else {
                asset(path)
            }
        }

        private fun api(path: String): WebResourceResponse {
            val res = try {
                Mobile.request("GET", path, "", ByteArray(0))
            } catch (e: Exception) {
                return text(500, e.message ?: "error")
            }
            val status = res.status.toInt().let { if (it in 300..399) 500 else it }
            val (mime, charset) = splitContentType(res.contentType)
            return WebResourceResponse(mime, charset, status, reason(status), emptyMap(), ByteArrayInputStream(res.body ?: ByteArray(0)))
        }

        private fun asset(path: String): WebResourceResponse {
            val name = path.trimStart('/').ifEmpty { "index.html" }
            val stream = try {
                assets.open("web/$name")
            } catch (_: FileNotFoundException) {
                return page(assets.open("web/index.html"))
            }
            val mime = mimeFor(name)
            return if (mime == "text/html") page(stream) else WebResourceResponse(mime, "utf-8", stream)
        }

        private fun page(stream: InputStream): WebResourceResponse {
            val headers = mapOf("Content-Security-Policy" to CSP)
            return WebResourceResponse("text/html", "utf-8", 200, "OK", headers, stream)
        }

        private fun text(status: Int, body: String) =
            WebResourceResponse("text/plain", "utf-8", status, reason(status), emptyMap(), ByteArrayInputStream(body.toByteArray()))
    }

    private inner class Bridge {
        @JavascriptInterface
        fun request(id: String, method: String, path: String, contentType: String, bodyBase64: String) {
            io.execute {
                val result = JSONObject().put("id", id)
                try {
                    val body = if (bodyBase64.isEmpty()) ByteArray(0) else Base64.decode(bodyBase64, Base64.NO_WRAP)
                    val res = Mobile.request(method, path, contentType, body)
                    result.put("status", res.status)
                        .put("contentType", res.contentType)
                        .put("body", Base64.encodeToString(res.body ?: ByteArray(0), Base64.NO_WRAP))
                } catch (e: Exception) {
                    result.put("status", 0).put("contentType", "text/plain")
                        .put("body", Base64.encodeToString((e.message ?: "error").toByteArray(), Base64.NO_WRAP))
                }
                deliver(result)
            }
        }

        @JavascriptInterface
        fun settings(): String = settingsJson()

        @JavascriptInterface
        fun pickFolder(id: String, kind: String) {
            runOnUiThread { this@MainActivity.pickFolder(id, kind) }
        }

        @JavascriptInterface
        fun openExternal(url: String) {
            runOnUiThread { this@MainActivity.openExternal(url) }
        }
    }

    companion object {
        private val BACKGROUND = Color.parseColor("#07080A")
        private const val PICK_FOLDER = 1
        private const val PERMISSION_STORAGE = 2
        private const val HOST = "rolboard.local"
        private const val ORIGIN = "https://$HOST"
        private const val CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; " +
            "img-src 'self' data: https:; connect-src 'self' https://api.github.com; object-src 'none'; base-uri 'self'; frame-src 'none'"

        private val MIME = mapOf(
            "html" to "text/html",
            "js" to "text/javascript",
            "css" to "text/css",
            "json" to "application/json",
            "svg" to "image/svg+xml",
            "png" to "image/png",
            "jpg" to "image/jpeg",
            "jpeg" to "image/jpeg",
            "webp" to "image/webp",
            "ico" to "image/x-icon",
            "woff2" to "font/woff2",
        )

        private fun treeUriToPath(uri: Uri): String? {
            val docId = runCatching { DocumentsContract.getTreeDocumentId(uri) }.getOrNull() ?: return null
            if (docId.startsWith("raw:")) return docId.removePrefix("raw:")
            val volume = docId.substringBefore(':')
            val relative = docId.substringAfter(':', "")
            val base = if (volume.equals("primary", ignoreCase = true)) {
                Environment.getExternalStorageDirectory().path
            } else {
                "/storage/$volume"
            }
            return if (relative.isEmpty()) base else "$base/$relative"
        }

        private fun mimeFor(name: String) = MIME[name.substringAfterLast('.', "").lowercase()] ?: "application/octet-stream"

        private fun splitContentType(value: String?): Pair<String, String?> {
            if (value.isNullOrBlank()) return "application/octet-stream" to null
            val parts = value.split(";").map { it.trim() }
            val charset = parts.drop(1).firstOrNull { it.startsWith("charset=", ignoreCase = true) }?.substringAfter('=')
            return parts[0] to charset
        }

        private fun reason(status: Int) = when (status) {
            200 -> "OK"
            201 -> "Created"
            204 -> "No Content"
            400 -> "Bad Request"
            401 -> "Unauthorized"
            404 -> "Not Found"
            else -> "Status $status"
        }
    }
}
