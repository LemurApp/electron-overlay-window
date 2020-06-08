import { EventEmitter } from 'events'
import type { BrowserWindow } from 'electron'
const lib: AddonExports = require('../build/Release/overlay_window.node')

interface AddonExports {
  start(
    overlayWindowId: Buffer,
    targetWindowTitle: string,
    cb: (e: any) => void
  ): void

  activateOverlay(): void
  focusTarget(): void
}

enum EventType {
  EVENT_ATTACH = 1,
  EVENT_FOCUS = 2,
  EVENT_BLUR = 3,
  EVENT_DETACH = 4,
  EVENT_FULLSCREEN = 5,
  EVENT_MOVERESIZE = 6,
}

export interface AttachEvent {
  hasAccess: boolean | undefined
  isFullscreen: boolean | undefined
  x: number
  y: number
  width: number
  height: number
}

export interface FullscreenEvent {
  isFullscreen: boolean
}

export interface MoveresizeEvent {
  x: number
  y: number
  width: number
  height: number
}

declare interface OverlayWindow {
  on(event: 'attach', listener: (e: AttachEvent) => void): this
  on(event: 'focus', listener: () => void): this
  on(event: 'blur', listener: () => void): this
  on(event: 'detach', listener: () => void): this
  on(event: 'fullscreen', listener: (e: FullscreenEvent) => void): this
  on(event: 'moveresize', listener: (e: MoveresizeEvent) => void): this
}

class OverlayWindow extends EventEmitter {
  private _overlayWindow!: BrowserWindow
  public defaultBehavior = true

  readonly WINDOW_OPTS = {
    fullscreenable: true,
    skipTaskbar: true,
    frame: false,
    show: false,
    transparent: true,
    resizable: process.platform === 'linux'
  } as const

  constructor () {
    super()

    this.on('attach', (e) => {
      if (this.defaultBehavior) {
        this._overlayWindow.showInactive()
        if (e.isFullscreen !== undefined) {
          this._overlayWindow.setFullScreen(e.isFullscreen)
        }
        if (e.width != 0 && e.height != 0) {
        this._overlayWindow.setBounds(e)
      }
      }
    })

    this.on('fullscreen', (e) => {
      if (this.defaultBehavior) {
        this._overlayWindow.setFullScreen(e.isFullscreen)
      }
    })

    this.on('detach', () => {
      if (this.defaultBehavior) {
        this._overlayWindow.hide()
      }
    })

    this.on('moveresize', (e) => {
      if (this.defaultBehavior && e.width != 0 && e.height != 0) {
        this._overlayWindow.setBounds(e)
      }
    })
  }

  private handler (e: unknown) {
    switch ((e as { type: EventType }).type) {
      case EventType.EVENT_ATTACH:
        this.emit('attach', e)
        break
      case EventType.EVENT_FOCUS:
        this.emit('focus', e)
        break
      case EventType.EVENT_BLUR:
        this.emit('blur', e)
        break
      case EventType.EVENT_DETACH:
        this.emit('detach', e)
        break
      case EventType.EVENT_FULLSCREEN:
        this.emit('fullscreen', e)
        break
      case EventType.EVENT_MOVERESIZE:
        this.emit('moveresize', e)
        break
    }
  }

  activateOverlay() {
    if (process.platform === 'win32') {
    lib.activateOverlay()
    } else {
      this._overlayWindow.focus()
    }
  }

  focusTarget() {
    if (process.platform === 'win32') {
      this._overlayWindow.blur()
    } else {
    lib.focusTarget()
  }
  }

  attachTo (overlayWindow: BrowserWindow, targetWindowTitle: string) {
    if (this._overlayWindow) {
      throw new Error('Library can be initialized only once.')
    }
    this._overlayWindow = overlayWindow
    lib.start(overlayWindow.getNativeWindowHandle(), targetWindowTitle, this.handler.bind(this))
  }
}

export const overlayWindow = new OverlayWindow()