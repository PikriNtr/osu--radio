const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    // new — forward any number of args
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
  }
});
