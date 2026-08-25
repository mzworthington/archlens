export type WorkspacePanelId = 'codeViewer' | 'traceLens' | 'chaosLens' | 'properties';

export type WorkspacePanelSlot = 'left' | 'right';

export type LeftSlotPanelId = Extract<WorkspacePanelId, 'codeViewer' | 'traceLens' | 'chaosLens'>;
