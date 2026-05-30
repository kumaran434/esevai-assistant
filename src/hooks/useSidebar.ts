import { useState, useEffect, useRef } from 'react';
import { getIpcRenderer } from '../lib/electron-mock';

export function useSidebar(activePortal: string | null) {
  const [sidebarWidth, setSidebarWidth] = useState(20); // Percent: Slightly wider for assistant by default
  const [isResizing, setIsResizing] = useState(false);
  const ipc = getIpcRenderer();
  const widthRef = useRef(sidebarWidth);

  // Sync ref with state
  useEffect(() => {
    widthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  // Resize Listener - only sync when NOT actively dragging to prevent flickering
  useEffect(() => {
    if (activePortal && !isResizing) {
       ipc.send('update-sidebar-width', sidebarWidth / 100);
    }
  }, [sidebarWidth, activePortal, ipc, isResizing]);

  // Dragging logic
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const windowWidth = window.innerWidth;
      if (windowWidth === 0) return;

      const minX = 240; 
      const maxX = windowWidth * 0.85; 
      
      const newX = Math.max(minX, Math.min(maxX, e.clientX));
      const percent = (newX / windowWidth) * 100;
      
      setSidebarWidth(percent);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Use ref to get the absolute latest width even in this closure
      ipc.send('update-sidebar-width', widthRef.current / 100);
      ipc.send('set-resizing-state', false);
      document.body.style.cursor = 'default';
    };

    ipc.send('set-resizing-state', true);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return { sidebarWidth, setSidebarWidth, isResizing, setIsResizing };
}
