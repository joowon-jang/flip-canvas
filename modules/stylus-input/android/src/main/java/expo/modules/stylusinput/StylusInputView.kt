package expo.modules.stylusinput

import android.content.Context
import android.view.MotionEvent
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.util.UUID

class StylusInputView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onStylusBatch by EventDispatcher()
  var inputEnabled = true
  private var activeStrokeId = UUID.randomUUID().toString()
  private var activePointerId = MotionEvent.INVALID_POINTER_ID
  private val MAX_HISTORICAL_POINTS = 4

  init {
    isClickable = true
    isFocusable = true
  }

  override fun onHoverEvent(event: MotionEvent): Boolean {
    if (!inputEnabled) return false
    return when (event.actionMasked) {
      MotionEvent.ACTION_HOVER_ENTER,
      MotionEvent.ACTION_HOVER_MOVE,
      MotionEvent.ACTION_HOVER_EXIT -> true
      else -> super.onHoverEvent(event)
    }
  }

  override fun dispatchTouchEvent(event: MotionEvent): Boolean {
    if (!inputEnabled) return super.dispatchTouchEvent(event)
    return handleTouchEvent(event)
  }

  override fun onTouchEvent(event: MotionEvent): Boolean {
    if (!inputEnabled) return false
    return handleTouchEvent(event)
  }

  private fun handleTouchEvent(event: MotionEvent): Boolean {
    val phase = when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        parent?.requestDisallowInterceptTouchEvent(true)
        activePointerId = event.getPointerId(event.actionIndex)
        activeStrokeId = UUID.randomUUID().toString()
        "begin"
      }
      MotionEvent.ACTION_POINTER_DOWN -> return true
      MotionEvent.ACTION_MOVE -> {
        parent?.requestDisallowInterceptTouchEvent(true)
        "move"
      }
      MotionEvent.ACTION_POINTER_UP -> {
        if (event.getPointerId(event.actionIndex) != activePointerId) return true
        "end"
      }
      MotionEvent.ACTION_UP -> "end"
      MotionEvent.ACTION_CANCEL -> "cancel"
      else -> return true
    }

    val points = mutableListOf<Map<String, Any>>()
    val pointerIndex = event.findPointerIndex(activePointerId)
    if (pointerIndex < 0) {
      return true
    }
    if (phase == "move") {
      val historicalStart = maxOf(0, event.historySize - MAX_HISTORICAL_POINTS)
      val historicalStep = maxOf(1, (event.historySize - historicalStart) / MAX_HISTORICAL_POINTS)
      for (historyIndex in historicalStart until event.historySize step historicalStep) {
        points.add(pointFrom(event, pointerIndex, historyIndex, phase))
      }
    }
    points.add(pointFrom(event, pointerIndex, -1, phase))

    onStylusBatch(
      mapOf(
        "strokeId" to activeStrokeId,
        "points" to points
      )
    )
    if (phase == "end" || phase == "cancel") {
      activePointerId = MotionEvent.INVALID_POINTER_ID
    }
    return true
  }

  private fun toDp(value: Float): Double {
    return (value / resources.displayMetrics.density).toDouble()
  }

  private fun pointFrom(event: MotionEvent, pointerIndex: Int, historyIndex: Int, phase: String): Map<String, Any> {
    val toolType = event.getToolType(pointerIndex)
    val pointerType = when (toolType) {
      MotionEvent.TOOL_TYPE_STYLUS -> "stylus"
      MotionEvent.TOOL_TYPE_MOUSE -> "mouse"
      else -> "touch"
    }
    val x = if (historyIndex >= 0) event.getHistoricalX(pointerIndex, historyIndex) else event.getX(pointerIndex)
    val y = if (historyIndex >= 0) event.getHistoricalY(pointerIndex, historyIndex) else event.getY(pointerIndex)
    val rawPressure = if (historyIndex >= 0) {
      event.getHistoricalAxisValue(MotionEvent.AXIS_PRESSURE, pointerIndex, historyIndex)
    } else {
      event.getAxisValue(MotionEvent.AXIS_PRESSURE, pointerIndex)
    }
    val normalizedPressure = if (historyIndex >= 0) event.getHistoricalPressure(pointerIndex, historyIndex) else event.getPressure(pointerIndex)
    val timestamp = if (historyIndex >= 0) event.getHistoricalEventTime(historyIndex) else event.eventTime

    return mapOf(
      "x" to toDp(x),
      "y" to toDp(y),
      "timestamp" to timestamp,
      "pressure" to normalizedPressure.coerceIn(0f, 1f),
      "rawPressure" to rawPressure,
      "pointerType" to pointerType,
      "phase" to phase,
      "tiltX" to event.getAxisValue(MotionEvent.AXIS_TILT, pointerIndex),
      "orientation" to event.getAxisValue(MotionEvent.AXIS_ORIENTATION, pointerIndex)
    )
  }
}
