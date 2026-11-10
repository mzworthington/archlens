/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react';

const ExtensionPreviewContext = createContext(false);

/** Marks the VS Code map, where the first release keeps the canvas and leaves site chrome out. */
export function ExtensionPreviewProvider({ children }: { children: ReactNode }) {
  return (
    <ExtensionPreviewContext.Provider value={true}>{children}</ExtensionPreviewContext.Provider>
  );
}

export function useExtensionPreview(): boolean {
  return useContext(ExtensionPreviewContext);
}
