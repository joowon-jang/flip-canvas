import type { Stroke } from "../types/flipbook";

export type SessionHistoryEntry = {
  frameId: string;
  stroke: Stroke;
};

export type SessionHistory = {
  undoStack: SessionHistoryEntry[];
  redoStack: SessionHistoryEntry[];
};

export function createSessionHistory(): SessionHistory {
  return {
    undoStack: [],
    redoStack: [],
  };
}

export function recordStroke(history: SessionHistory, frameId: string, stroke: Stroke): SessionHistory {
  return {
    undoStack: [{ frameId, stroke }, ...history.undoStack],
    redoStack: [],
  };
}

export function undoFrameStroke(
  history: SessionHistory,
  frameId: string,
  currentStrokes: Stroke[],
): { history: SessionHistory; strokes: Stroke[]; entry?: SessionHistoryEntry } {
  const entry = history.undoStack.find((item) => item.frameId === frameId && currentStrokes.some((stroke) => stroke.id === item.stroke.id));
  if (!entry) {
    return { history, strokes: currentStrokes };
  }

  return {
    history: {
      undoStack: history.undoStack.filter((item) => !(item.frameId === entry.frameId && item.stroke.id === entry.stroke.id)),
      redoStack: [entry, ...history.redoStack],
    },
    strokes: currentStrokes.filter((stroke) => stroke.id !== entry.stroke.id),
    entry,
  };
}

export function redoFrameStroke(history: SessionHistory, frameId: string): { history: SessionHistory; entry?: SessionHistoryEntry } {
  const entry = history.redoStack.find((item) => item.frameId === frameId);
  if (!entry) {
    return { history };
  }

  return {
    history: {
      undoStack: [entry, ...history.undoStack],
      redoStack: history.redoStack.filter((item) => !(item.frameId === entry.frameId && item.stroke.id === entry.stroke.id)),
    },
    entry,
  };
}
