# ProGuard / R8 Rules for Vibe On (Capacitor Android Application)

# Keep Capacitor Native Plugin Bridge Classes
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keep class * extends com.getcapacitor.Bridge { *; }
-keep interface com.getcapacitor.** { *; }

# Keep JavaScript Interface Members
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve AndroidX and WebKit classes used by Capacitor WebView
-keep class androidx.webkit.** { *; }
-keep class android.webkit.** { *; }

# Preserve line numbers and source file attributes for crash reporting
-keepattributes SourceFile,LineNumberTable,Signature,InnerClasses,EnclosingMethod,*Annotation*
