import ExpoModulesCore

public class StylusInputModule: Module {
  public func definition() -> ModuleDefinition {
    Name("StylusInput")

    View(StylusInputView.self) {
      Prop("enabled") { (view: StylusInputView, enabled: Bool) in
        view.isInputEnabled = enabled
      }
      Events("onStylusBatch")
    }
  }
}
