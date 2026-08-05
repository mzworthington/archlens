export type WorkspacePanelId = 'codeViewer' | 'traceLens' | 'properties';

export type WorkspacePanelSlot = 'left' | 'right';

export type LeftSlotPanelId = Extract<WorkspacePanelId, 'codeViewer' | 'traceLens'>;
