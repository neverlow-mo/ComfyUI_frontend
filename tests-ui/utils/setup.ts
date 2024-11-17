// @ts-strict-ignore
import type { ComfySettingsDialog } from '@/scripts/ui/settings'
import type { ComfyApp } from '@/scripts/app'
import '../../src/scripts/api'
import { ComfyNodeDef } from '@/types/apiTypes'
import { vi } from 'vitest'

const fs = require('fs')
const path = require('path')
function* walkSync(dir: string): Generator<string> {
  const files = fs.readdirSync(dir, { withFileTypes: true })
  for (const file of files) {
    if (file.isDirectory()) {
      yield* walkSync(path.join(dir, file.name))
    } else {
      yield path.join(dir, file.name)
    }
  }
}

export interface APIConfig {
  mockExtensions?: string[]
  mockNodeDefs?: Record<string, any>
  settings?: Record<string, string>
  userConfig?: {
    storage: 'server' | 'browser'
    users?: Record<string, any>
    migrated?: boolean
  }
  userData?: Record<string, any>
}

/**
 * @typedef { import("../../src/types/comfy").ComfyObjectInfo } ComfyObjectInfo
 */

/**
 * @param {{
 *   mockExtensions?: string[],
 *   mockNodeDefs?: Record<string, ComfyObjectInfo>,
 *   settings?: Record<string, string>
 *   userConfig?: {storage: "server" | "browser", users?: Record<string, any>, migrated?: boolean },
 *   userData?: Record<string, any>
 * }} config
 */
export function mockApi(config: APIConfig = {}) {
  let { mockExtensions, mockNodeDefs, userConfig, settings, userData } = {
    settings: {},
    userData: {},
    ...config
  }
  if (!mockExtensions) {
    mockExtensions = Array.from(walkSync(path.resolve('./src/extensions/core')))
      .filter((x) => x.endsWith('.js'))
      .map((x) => path.relative(path.resolve('./src/'), x).replace(/\\/g, '/'))
  }
  if (!mockNodeDefs) {
    mockNodeDefs = JSON.parse(
      fs.readFileSync(path.resolve('./tests-ui/data/object_info.json'))
    )
  }

  const events = new EventTarget()
  const mockApi = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
    getSystemStats: vi.fn(),
    getExtensions: vi.fn(() => mockExtensions),
    getNodeDefs: vi.fn(() => mockNodeDefs),
    init: vi.fn(),
    apiURL: vi.fn((x) => 'src/' + x),
    fileURL: vi.fn((x) => 'src/' + x),
    createUser: vi.fn((username) => {
      if (username in userConfig.users) {
        return { status: 400, json: () => 'Duplicate' }
      }
      userConfig.users[username + '!'] = username
      return { status: 200, json: () => username + '!' }
    }),
    getModels: vi.fn(() => []),
    getUserConfig: vi.fn(
      () => userConfig ?? { storage: 'browser', migrated: false }
    ),
    getSettings: vi.fn(() => settings),
    storeSettings: vi.fn((v) => Object.assign(settings, v)),
    getUserData: vi.fn((f) => {
      if (f in userData) {
        return { status: 200, json: () => userData[f] }
      } else {
        return { status: 404 }
      }
    }),
    storeUserData: vi.fn((file, data) => {
      userData[file] = data
    }),
    listUserData: vi.fn(() => [])
  }
  vi.mock('../../src/scripts/api', () => ({
    get api() {
      return mockApi
    }
  }))
}

export const mockSettingStore = () => {
  let app: ComfyApp | null = null

  const mockedSettingStore = {
    addSettings(settings: ComfySettingsDialog) {
      app = settings.app
    },

    set(key: string, value: any) {
      app?.ui.settings.setSettingValue(key, value)
    },

    get(key: string) {
      return (
        app?.ui.settings.getSettingValue(key) ??
        app?.ui.settings.getSettingDefaultValue(key)
      )
    }
  }

  vi.mock('@/stores/settingStore', () => ({
    useSettingStore: vi.fn(() => mockedSettingStore)
  }))
}

export const mockNodeDefStore = () => {
  const mockedNodeDefStore = {
    addNodeDef: vi.fn((nodeDef: ComfyNodeDef) => {})
  }

  vi.mock('@/stores/nodeDefStore', () => ({
    useNodeDefStore: vi.fn(() => mockedNodeDefStore),
    useNodeFrequencyStore: vi.fn(() => ({
      getNodeFrequencyByName: vi.fn(() => 0)
    }))
  }))
}
