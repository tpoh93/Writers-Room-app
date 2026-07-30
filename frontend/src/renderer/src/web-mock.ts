export function setupWebMock(): void {
  if (typeof window === 'undefined') return
  if (!window.electron) {
    window.electron = {
      process: {
        platform: 'web',
        env: {},
        versions: {
          electron: 'web',
          chrome: navigator.userAgent,
          node: 'web'
        }
      },
      webUtils: {
        getPathForFile: (file: File) => {
          return URL.createObjectURL(file)
        }
      },
      webFrame: {
        setZoomLevel: (level: number) => {
        },
        insertCSS: (css: string): string => {
          return css
        },
        setZoomFactor: (factor: number) => {
        }
      },
      ipcRenderer: {
        invoke: async (channel: string, ...args: unknown[]) => {
          return undefined
        },
        on: (channel: string, _listener: unknown) => {
          return () => {}
        },
        once: (channel: string, _listener: unknown) => {
          return () => {}
        },
        postMessage: (channel: string, message: unknown, transfer?: unknown[]) => {
        },
        send: (channel: string, ...args: unknown[]) => {
        },
        sendSync: (channel: string, ...args: unknown[]) => {
          return undefined
        },
        sendTo: (webContentsId: number, channel: string, ...args: unknown[]) => {
        },
        sendToHost: (channel: string, ...args: unknown[]) => {
        },
        removeListener: (channel: string, listener: (...args: unknown[]) => void) => {
          return window.electron.ipcRenderer
        },
        removeAllListeners: () => {}
      }
    }
  }
  if (!window.api) {
    window.api = {
      setApiKey: async (id: number) => {
        return { success: true }
      },
      getApiKey: async (id: number) => {
        return { success: true, apiKey: undefined }
      },
      openIdeasHome: async () => {
        window.open('/#/ideas-home', '_blank')
        return { success: true }
      }
    }
  }
}
