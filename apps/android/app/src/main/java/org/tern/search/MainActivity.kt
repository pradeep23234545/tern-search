package org.tern.search

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.Toast
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import kotlin.concurrent.thread

/**
 * Tern for Android: a small, private client for your own Tern / SearXNG server.
 * The search engine runs on your computer or server; this app shows it full-screen,
 * opens results in your browser and adds "Search with Tern" to Android.
 */
class MainActivity : Activity() {

    private lateinit var web: WebView
    private lateinit var refresh: SwipeRefreshLayout
    private lateinit var progress: ProgressBar

    /** Updated on the UI thread, read by the JS bridge on its own thread. */
    @Volatile private var currentUrl: String = ""

    private val prefs by lazy { getSharedPreferences("tern", Context.MODE_PRIVATE) }
    private var server: String?
        get() = prefs.getString(KEY_SERVER, null)?.takeIf { it.isNotBlank() }
        set(value) { prefs.edit().putString(KEY_SERVER, value).apply() }

    private val isNight: Boolean
        get() = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        setContentView(R.layout.activity_main)

        val root = findViewById<View>(R.id.root)
        web = findViewById(R.id.web)
        refresh = findViewById(R.id.refresh)
        progress = findViewById(R.id.progress)

        // Keep content clear of the status bar, navigation bar and keyboard.
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }
        WindowCompat.getInsetsController(window, root).apply {
            isAppearanceLightStatusBars = !isNight
            isAppearanceLightNavigationBars = !isNight
        }

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            // Nothing from the phone's files is ever needed.
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportMultipleWindows(false)
            mediaPlaybackRequiresUserGesture = true
            userAgentString = "$userAgentString TernAndroid/${BuildConfigLite.VERSION}"
        }
        web.addJavascriptInterface(Bridge(), "TernApp")
        web.webViewClient = Client()
        web.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                progress.progress = newProgress
                progress.visibility = if (newProgress < 100) View.VISIBLE else View.GONE
            }
        }

        refresh.setColorSchemeColors(getColor(R.color.tern_accent))
        refresh.setOnRefreshListener { web.reload() }
        // Only pull-to-refresh when the page is scrolled to the very top.
        refresh.setOnChildScrollUpCallback { _, _ -> web.scrollY > 0 }

        if (savedInstanceState != null && web.restoreState(savedInstanceState) != null) return
        handleIntent(intent, firstLaunch = true)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent, firstLaunch = false)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    // ------------------------------------------------------------------ intents

    private fun handleIntent(intent: Intent?, firstLaunch: Boolean) {
        val base = server
        if (intent?.action == ACTION_CHANGE_SERVER || base == null) {
            showSetup()
            return
        }
        val query = when (intent?.action) {
            Intent.ACTION_PROCESS_TEXT -> intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString()
            Intent.ACTION_SEND -> intent.getStringExtra(Intent.EXTRA_TEXT)
            Intent.ACTION_WEB_SEARCH -> intent.getStringExtra("query")
            else -> null
        }?.trim()?.take(500)

        when {
            !query.isNullOrEmpty() -> web.loadUrl("$base/search?q=" + URLEncoder.encode(query, "UTF-8"))
            intent?.action == ACTION_NEW_SEARCH -> web.loadUrl("$base/")
            firstLaunch -> web.loadUrl("$base/")
        }
    }

    // ------------------------------------------------------------------ pages

    private fun showSetup(error: String? = null) {
        val params = StringBuilder("?")
        server?.let { params.append("server=").append(Uri.encode(it)).append('&') }
        error?.let { params.append("error=").append(Uri.encode(it)) }
        web.loadUrl(SETUP_URL + params)
    }

    private fun isServerUrl(uri: Uri): Boolean {
        val base = server?.let { Uri.parse(it) } ?: return false
        val port = { u: Uri -> if (u.port != -1) u.port else if (u.scheme == "https") 443 else 80 }
        return uri.scheme == base.scheme && uri.host.equals(base.host, ignoreCase = true) && port(uri) == port(base)
    }

    private fun openOutside(uri: Uri) {
        val intent = if (uri.scheme == "intent") {
            try { Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME).apply { selector = null; component = null } } catch (_: Exception) { return }
        } else {
            Intent(Intent.ACTION_VIEW, uri)
        }
        intent.addCategory(Intent.CATEGORY_BROWSABLE)
        try {
            startActivity(intent)
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, R.string.no_browser, Toast.LENGTH_SHORT).show()
        }
    }

    private inner class Client : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val uri = request.url
            if (uri.toString().startsWith(ASSET_PREFIX)) return false
            if (isServerUrl(uri)) return false
            // Results, maps, videos: open in the browser the user already trusts.
            openOutside(uri)
            return true
        }

        override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
            currentUrl = url
        }

        override fun onPageFinished(view: WebView, url: String) {
            currentUrl = url
            refresh.isRefreshing = false
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (!request.isForMainFrame) return
            refresh.isRefreshing = false
            val failed = request.url.toString()
            if (failed.startsWith(ASSET_PREFIX)) return
            showSetup("Couldn't reach your Tern server (${error.description}).")
        }
    }

    // ------------------------------------------------------------------ back button

    @Deprecated("Plain Activity: still the simplest back handling for a single WebView")
    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else super.onBackPressed()
    }

    // ------------------------------------------------------------------ JS bridge (setup page only)

    inner class Bridge {
        private fun trusted() = currentUrl.startsWith(ASSET_PREFIX)

        @JavascriptInterface
        fun getServer(): String = if (trusted()) server.orEmpty() else ""

        /** Checks <url>/healthz in the background, then calls window.onTernTest(id, ok, normalizedUrl). */
        @JavascriptInterface
        fun test(id: String, input: String) {
            if (!trusted()) return
            val url = normalize(input)
            thread {
                val ok = url != null && healthy(url)
                val js = "window.onTernTest(${JSONObject.quote(id)}, $ok, ${JSONObject.quote(url ?: "")})"
                runOnUiThread { web.evaluateJavascript(js, null) }
            }
        }

        @JavascriptInterface
        fun save(input: String) {
            if (!trusted()) return
            val url = normalize(input) ?: return
            runOnUiThread {
                server = url
                web.clearHistory()
                web.loadUrl("$url/")
            }
        }

        @JavascriptInterface
        fun retry() {
            if (!trusted()) return
            val base = server ?: return
            runOnUiThread { web.loadUrl("$base/") }
        }
    }

    companion object {
        private const val KEY_SERVER = "server"
        private const val ASSET_PREFIX = "file:///android_asset/"
        private const val SETUP_URL = ASSET_PREFIX + "setup.html"
        const val ACTION_CHANGE_SERVER = "org.tern.search.CHANGE_SERVER"
        const val ACTION_NEW_SEARCH = "org.tern.search.NEW_SEARCH"

        /** "192.168.1.20:8888" -> "http://192.168.1.20:8888"; strips trailing slashes. */
        fun normalize(input: String): String? {
            var s = input.trim().trimEnd('/')
            if (s.isEmpty()) return null
            if (!s.contains("://")) s = "http://$s"
            val uri = Uri.parse(s)
            if (uri.scheme != "http" && uri.scheme != "https") return null
            if (uri.host.isNullOrEmpty()) return null
            return s
        }

        fun healthy(base: String): Boolean = try {
            val c = URL("$base/healthz").openConnection() as HttpURLConnection
            c.connectTimeout = 5000
            c.readTimeout = 5000
            c.instanceFollowRedirects = true
            val code = c.responseCode
            c.disconnect()
            code in 200..299
        } catch (_: Exception) {
            false
        }
    }
}

/** Avoids enabling BuildConfig generation just for the version string. */
private object BuildConfigLite {
    const val VERSION = "1.1"
}
