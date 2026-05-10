import ExpoModulesCore
import UIKit

public final class StylusInputView: ExpoView {
  let onStylusBatch = EventDispatcher()
  var isInputEnabled = true
  private var activeStrokeId = UUID().uuidString

  public override init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    isMultipleTouchEnabled = false
    backgroundColor = .clear
  }

  private func point(from touch: UITouch, phase: String) -> [String: Any] {
    let location = touch.preciseLocation(in: self)
    let pointerType = touch.type == .pencil ? "pencil" : "touch"
    let pressure: CGFloat
    if touch.maximumPossibleForce > 0 {
      pressure = min(max(touch.force / touch.maximumPossibleForce, 0), 1)
    } else {
      pressure = pointerType == "pencil" ? 0.6 : 0.5
    }

    return [
      "x": location.x,
      "y": location.y,
      "timestamp": touch.timestamp * 1000,
      "pressure": pressure,
      "rawPressure": touch.force,
      "pointerType": pointerType,
      "phase": phase,
      "altitude": touch.altitudeAngle,
      "azimuth": touch.azimuthAngle(in: self)
    ]
  }

  private func preferredTouch(from touches: Set<UITouch>) -> UITouch? {
    touches.first { $0.type == .pencil } ?? touches.first
  }

  private func emit(_ touches: Set<UITouch>, phase: String, event: UIEvent?) {
    guard isInputEnabled, let touch = preferredTouch(from: touches) else {
      return
    }

    if phase == "begin" {
      activeStrokeId = UUID().uuidString
    }

    var points: [[String: Any]] = []
    if let coalesced = event?.coalescedTouches(for: touch), phase == "move" {
      points = coalesced.map { point(from: $0, phase: phase) }
    } else {
      points = [point(from: touch, phase: phase)]
    }

    onStylusBatch([
      "strokeId": activeStrokeId,
      "points": points
    ])
  }

  public override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
    emit(touches, phase: "begin", event: event)
  }

  public override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
    emit(touches, phase: "move", event: event)
  }

  public override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
    emit(touches, phase: "end", event: event)
  }

  public override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
    emit(touches, phase: "cancel", event: event)
  }
}
