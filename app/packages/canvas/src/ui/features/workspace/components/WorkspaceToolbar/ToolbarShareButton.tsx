import React, { useCallback } from 'react';
import { Share2 } from 'lucide-react';
import { useLocation, useSearch } from 'wouter';
import { useBlueprintStore } from '../../../../../application/store/store';
import {
  createCollabRoomId,
  parseCollabRoomId,
  withCollabRoom,
} from '../../../../../application/navigation/collabRoomUrl';
import { COLLABORATION_FEATURE } from '../../../../../application/navigation/featureGate';
import { useFeatureFlag } from '../../../../hooks/useFeatureFlag';

const iconBtnClass =
  'min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 disabled:hover:text-slate-400 transition cursor-pointer disabled:cursor-not-allowed flex items-center justify-center';

export const ToolbarShareButton: React.FC = () => {
  const [pathname, setLocation] = useLocation();
  const search = useSearch();
  const collabEnabled = useFeatureFlag(COLLABORATION_FEATURE);
  const isLoading = useBlueprintStore(s => s.isLoading);
  const setNotification = useBlueprintStore(s => s.setNotification);
  const isActive = useBlueprintStore(s => s.collabSessionPort.isActive());
  const roomFromUrl = parseCollabRoomId(search);

  const handleShare = useCallback(async () => {
    const roomId = roomFromUrl ?? createCollabRoomId();
    const next = withCollabRoom(pathname, search, roomId);
    setLocation(next);
    const url = `${window.location.origin}${next}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotification({
        type: 'success',
        title: 'Share link copied',
        message: 'Open this link in another tab to edit the diagram together.',
      });
    } catch {
      setNotification({
        type: 'info',
        title: 'Share this link',
        message: url,
      });
    }
  }, [pathname, search, roomFromUrl, setLocation, setNotification]);

  if (!collabEnabled) return null;

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      disabled={Boolean(isLoading)}
      className={`${iconBtnClass} ${isActive || roomFromUrl ? 'text-sky-300 hover:text-sky-200 border-sky-900/40' : ''}`}
      title="Share a live editing link"
      aria-label="Share live diagram"
      aria-pressed={Boolean(isActive || roomFromUrl)}
      data-testid="toolbar-share-collab"
    >
      <Share2 className="w-3.5 h-3.5" />
    </button>
  );
};
