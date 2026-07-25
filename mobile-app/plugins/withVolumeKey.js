const { withMainActivity } = require('@expo/config-plugins');

function withVolumeKeyListener(config) {
  config = withMainActivity(config, (mod) => {
    let contents = mod.modResults.contents;

    if (!contents.includes('onKeyDown')) {
      contents = contents.replace(
        'import android.os.Bundle',
        'import android.os.Bundle\nimport android.view.KeyEvent\nimport com.facebook.react.bridge.Arguments\nimport com.facebook.react.modules.core.DeviceEventManagerModule\nimport com.facebook.react.ReactApplication'
      );

      contents = contents.replace(
        'class MainActivity : ReactActivity() {',
        `class MainActivity : ReactActivity() {
  private var pressCount = 0
  private var lastPressTime = 0L
  private val PRESS_WINDOW = 2000L
  private val REQUIRED_PRESSES = 3`
      );

      contents = contents.replace(
        'override fun getMainComponentName(): String = "main"',
        `override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
      if (event?.repeatCount ?: 0 > 0) return true
      val now = System.currentTimeMillis()
      if (now - lastPressTime > PRESS_WINDOW) {
        pressCount = 0
      }
      pressCount++
      lastPressTime = now
      if (pressCount >= REQUIRED_PRESSES) {
        pressCount = 0
        sendVolumeEvent()
      }
      return true
    }
    return super.onKeyDown(keyCode, event)
  }

  override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
    if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
      return true
    }
    return super.onKeyUp(keyCode, event)
  }

  private fun sendVolumeEvent() {
    try {
      val app = application as? ReactApplication ?: return
      val reactHost = app.reactHost
      val context = reactHost?.currentReactContext
      if (context == null) {
        // Retry after a short delay if context not ready
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
          try {
            val retryContext = reactHost?.currentReactContext ?: return@postDelayed
            val params = Arguments.createMap()
            params.putBoolean("triggered", true)
            retryContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit("onVolumePress", params)
          } catch (e: Exception) {
            e.printStackTrace()
          }
        }, 1000)
        return
      }
      val params = Arguments.createMap()
      params.putBoolean("triggered", true)
      context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit("onVolumePress", params)
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  override fun getMainComponentName(): String = "main"`
      );
    }

    mod.modResults.contents = contents;
    return mod;
  });

  return config;
}

module.exports = withVolumeKeyListener;
