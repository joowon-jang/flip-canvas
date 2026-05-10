type DrawCanvasSizeInput = {
  width: number;
  height: number;
  surfaceTopPadding?: number;
  landscapeStudioHeight?: number;
};

type DrawPortraitLayout = {
  orientation: "portrait";
  canvasSize: number;
  surfacePaddingHorizontal: number;
  surfacePaddingBottom: number;
  headerHeight: number;
};

type DrawLandscapeLayout = {
  orientation: "landscape";
  canvasSize: number;
  toolRailWidth: number;
  sidePanelWidth: number;
  frameGridWidth: number;
  panelContentWidth: number;
  frameListHeight: number;
  gap: number;
  surfacePaddingHorizontal: number;
  surfacePaddingBottom: number;
  headerHeight: number;
  panelPadding: number;
  panelPaddingBottom: number;
  panelGap: number;
  actionGap: number;
  actionButtonHeight: number;
  frameEditActionHeight: number;
  titleFontSize: number;
  sheetCountFontSize: number;
  frameListMode: "grid" | "strip";
  frameStripExpanded: boolean;
  frameStripFillAvailable: boolean;
  actionDirection: "row" | "column";
};

export type DrawStudioLayout = DrawPortraitLayout | DrawLandscapeLayout;

const TABLET_PORTRAIT_MIN_WIDTH = 600;
const TABLET_PORTRAIT_RESERVED_HEIGHT = 388;
const CANVAS_MAX_SIZE = 640;
const PORTRAIT_HORIZONTAL_PADDING = 23;
const PORTRAIT_BOTTOM_PADDING = 20;
const PORTRAIT_HEADER_HEIGHT = 96;
const LANDSCAPE_HORIZONTAL_PADDING = 31;
const LANDSCAPE_BOTTOM_PADDING = 28;
const LANDSCAPE_HEADER_HEIGHT = 72;
const DEFAULT_SURFACE_TOP_PADDING = 18;
const LANDSCAPE_TOOL_RAIL_MIN_WIDTH = 64;
const LANDSCAPE_TOOL_RAIL_MAX_WIDTH = 84;
const LANDSCAPE_PANEL_MIN_WIDTH = 180;
const LANDSCAPE_PANEL_MAX_WIDTH = 620;
const FRAME_GRID_PANEL_PADDING = 40;
const FRAME_GRID_THUMB_WIDTH = 72;
const FRAME_GRID_GAP = 14;
const ACTION_BUTTON_MIN_WIDTH = 82;
const ACTION_BUTTON_ROW_GAP = 10;
const LANDSCAPE_PANEL_HEADER_HEIGHT = 32;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function frameGridWidth(panelWidth: number): number {
  const contentWidth = panelWidth - FRAME_GRID_PANEL_PADDING;
  const columns = Math.max(1, Math.floor((contentWidth + FRAME_GRID_GAP) / (FRAME_GRID_THUMB_WIDTH + FRAME_GRID_GAP)));
  return columns * FRAME_GRID_THUMB_WIDTH + (columns - 1) * FRAME_GRID_GAP;
}

function surfaceTopPaddingOrDefault(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : DEFAULT_SURFACE_TOP_PADDING;
}

function measuredLandscapeStudioHeightOrDefault(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function getPortraitCanvasSize({ width, height }: DrawCanvasSizeInput): number {
  const isTabletPortrait = width >= TABLET_PORTRAIT_MIN_WIDTH && height > width;
  if (isTabletPortrait) {
    return Math.min(width - 48, height - TABLET_PORTRAIT_RESERVED_HEIGHT);
  }

  return Math.min(width - 48, height * 0.42, CANVAS_MAX_SIZE);
}

function getLandscapeLayout({ width, height, surfaceTopPadding, landscapeStudioHeight }: DrawCanvasSizeInput): DrawLandscapeLayout {
  const availableWidth = width - LANDSCAPE_HORIZONTAL_PADDING * 2;
  const gap = clamp(Math.round(width * 0.025), 16, 28);
  const toolRailWidth = clamp(Math.round(availableWidth * 0.067), LANDSCAPE_TOOL_RAIL_MIN_WIDTH, LANDSCAPE_TOOL_RAIL_MAX_WIDTH);
  const baseSidePanelWidth = clamp(Math.round(availableWidth * 0.32), LANDSCAPE_PANEL_MIN_WIDTH, 330);
  const widthBoundCanvas = availableWidth - toolRailWidth - gap * 2 - baseSidePanelWidth;
  const fallbackPanelHeight = Math.max(120, height - surfaceTopPaddingOrDefault(surfaceTopPadding) - LANDSCAPE_HEADER_HEIGHT - LANDSCAPE_BOTTOM_PADDING);
  const panelHeight = Math.max(120, measuredLandscapeStudioHeightOrDefault(landscapeStudioHeight, fallbackPanelHeight));
  const availableHeight = panelHeight;
  const canvasSize = Math.max(120, Math.min(availableHeight, widthBoundCanvas));
  const remainingPanelWidth = Math.max(baseSidePanelWidth, availableWidth - toolRailWidth - gap * 2 - canvasSize);
  const sidePanelWidth = Math.min(LANDSCAPE_PANEL_MAX_WIDTH, remainingPanelWidth);
  const panelPadding = clamp(Math.round(sidePanelWidth * 0.05), 12, 20);
  const panelContentWidth = sidePanelWidth - panelPadding * 2;
  const frameListMode = sidePanelWidth >= 360 && panelHeight <= 420 ? "strip" : "grid";
  const canFitRowActions = panelContentWidth >= ACTION_BUTTON_MIN_WIDTH * 2 + ACTION_BUTTON_ROW_GAP;
  const panelPaddingBottom = clamp(Math.round(panelHeight * 0.02), 8, 12);
  const panelGap = clamp(Math.round(panelHeight * 0.035), 8, 14);
  const actionGap = canFitRowActions ? ACTION_BUTTON_ROW_GAP : clamp(Math.round(panelHeight * 0.02), 6, 8);
  const actionButtonHeight = clamp(Math.round(panelHeight * 0.095), 32, 36);
  const frameEditActionHeight = actionButtonHeight;
  const actionAreaHeight = canFitRowActions ? actionButtonHeight : actionButtonHeight * 2 + actionGap;
  const frameListHeight = Math.max(
    72,
    panelHeight - panelPadding - panelPaddingBottom - LANDSCAPE_PANEL_HEADER_HEIGHT - panelGap * 3 - frameEditActionHeight - actionAreaHeight,
  );

  return {
    orientation: "landscape",
    canvasSize,
    toolRailWidth,
    sidePanelWidth,
    frameGridWidth: frameGridWidth(sidePanelWidth),
    panelContentWidth,
    frameListHeight,
    gap,
    surfacePaddingHorizontal: LANDSCAPE_HORIZONTAL_PADDING,
    surfacePaddingBottom: LANDSCAPE_BOTTOM_PADDING,
    headerHeight: LANDSCAPE_HEADER_HEIGHT,
    panelPadding,
    panelPaddingBottom,
    panelGap,
    actionGap,
    actionButtonHeight,
    frameEditActionHeight,
    titleFontSize: clamp(Math.round(width * 0.02), 16, 20),
    sheetCountFontSize: sidePanelWidth >= 330 ? 11 : 10,
    frameListMode,
    frameStripExpanded: frameListMode === "strip",
    frameStripFillAvailable: frameListMode === "strip",
    actionDirection: canFitRowActions ? "row" : "column",
  };
}

export function getDrawStudioLayout(input: DrawCanvasSizeInput): DrawStudioLayout {
  if (input.width > input.height) {
    return getLandscapeLayout(input);
  }

  return {
    orientation: "portrait",
    canvasSize: getPortraitCanvasSize(input),
    surfacePaddingHorizontal: PORTRAIT_HORIZONTAL_PADDING,
    surfacePaddingBottom: PORTRAIT_BOTTOM_PADDING,
    headerHeight: PORTRAIT_HEADER_HEIGHT,
  };
}

export function getDrawCanvasSize(input: DrawCanvasSizeInput): number {
  return getDrawStudioLayout(input).canvasSize;
}
