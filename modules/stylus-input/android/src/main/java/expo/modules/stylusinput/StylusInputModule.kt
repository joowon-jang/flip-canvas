package expo.modules.stylusinput

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class StylusInputModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("StylusInput")

    View(StylusInputView::class) {
      Prop("enabled") { view: StylusInputView, enabled: Boolean ->
        view.inputEnabled = enabled
      }
      Events("onStylusBatch")
    }
  }
}
