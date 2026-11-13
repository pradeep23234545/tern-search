# Keep the methods the setup page calls through window.TernApp
-keepclassmembers class org.tern.search.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
