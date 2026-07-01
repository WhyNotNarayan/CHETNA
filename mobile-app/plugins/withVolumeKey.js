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
      val now = System.currentTimeMillis()
      if (now - lastPressTime > PRESS_WINDOW) {
        pressCount = 0
      }
      pressCount++
      lastPressTime = now
      if (pressCount >= REQUIRED_PRESSES) {
        pressCount = 0
        sendVolumeEvent()
        return true
      }
      return true
    }
    return super.onKeyDown(keyCode, event)
  }

  private fun sendVolumeEvent() {
    try {
      val app = application as? ReactApplication ?: return
      val host = app.reactHost ?: return
      val context = host.currentReactContext ?: return
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
