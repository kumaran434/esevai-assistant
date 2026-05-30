export const isElectron = () => {
  return typeof window !== 'undefined' && 
         window.process && 
         (window.process as any).type === 'renderer' ||
         (window as any).navigator?.userAgent?.indexOf('Electron') >= 0;
};

export const getIpcRenderer = () => {
  if (isElectron()) {
    return (window as any).require('electron').ipcRenderer;
  }
  
  // Mock IPC for Web Preview
  return {
    send: (channel: string, ...args: any[]) => {
      console.log(`[Web Mock IPC] Sending to ${channel}:`, args);
    },
    on: (channel: string, func: Function) => {
      console.log(`[Web Mock IPC] Subscribed to ${channel}`);
    },
    removeListener: (channel: string, func: Function) => {
      console.log(`[Web Mock IPC] Unsubscribed from ${channel}`);
    }
  };
};
