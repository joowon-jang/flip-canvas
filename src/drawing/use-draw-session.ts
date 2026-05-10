import { useEffect, useRef } from "react";

import { createSessionHistory, recordStroke, redoFrameStroke, undoFrameStroke } from "../model/session-history";
import type { FlipFrame, FlipProject, Stroke } from "../types/flipbook";
import { now } from "../utils/id";

type UseDrawSessionInput = {
  projectId: string;
  addStroke: (projectId: string, frameId: string, stroke: Stroke) => void;
  updateFrame: (projectId: string, frame: FlipFrame) => void;
};

export function useDrawSession({
  projectId,
  addStroke,
  updateFrame,
}: UseDrawSessionInput) {
  const historyRef = useRef(createSessionHistory());

  useEffect(() => {
    historyRef.current = createSessionHistory();
  }, [projectId]);

  function handleCommitStroke(project: FlipProject, frame: FlipFrame, stroke: Stroke): void {
    historyRef.current = recordStroke(historyRef.current, frame.id, stroke);
    addStroke(project.id, frame.id, stroke);
  }

  function handleUndo(project: FlipProject, frame: FlipFrame): void {
    const result = undoFrameStroke(historyRef.current, frame.id, frame.strokes);
    if (!result.entry) {
      return;
    }
    historyRef.current = result.history;
    updateFrame(project.id, { ...frame, strokes: result.strokes, updatedAt: now() });
  }

  function handleRedo(project: FlipProject, frame: FlipFrame): void {
    const result = redoFrameStroke(historyRef.current, frame.id);
    if (!result.entry) {
      return;
    }
    historyRef.current = result.history;
    updateFrame(project.id, { ...frame, strokes: [...frame.strokes, result.entry.stroke], updatedAt: now() });
  }

  return {
    handleCommitStroke,
    handleUndo,
    handleRedo,
  };
}
