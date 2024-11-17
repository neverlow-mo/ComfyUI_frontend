import { vi } from 'vitest'

// @ts-strict-ignore
module.exports = async function () {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  const { nop } = require('../utils/nopProxy')
  global.enableWebGLCanvas = nop

  HTMLCanvasElement.prototype.getContext = nop

  localStorage['Comfy.Settings.Comfy.Logging.Enabled'] = 'false'

  vi.mock('@/services/dialogService', () => {
    return {
      showLoadWorkflowWarning: vi.fn(),
      showMissingModelsWarning: vi.fn(),
      showSettingsDialog: vi.fn(),
      showExecutionErrorDialog: vi.fn(),
      showTemplateWorkflowsDialog: vi.fn(),
      showPromptDialog: vi.fn().mockImplementation((message, defaultValue) => {
        return Promise.resolve(defaultValue)
      })
    }
  })

  vi.mock('@/stores/toastStore', () => {
    return {
      useToastStore: () => ({
        addAlert: vi.fn()
      })
    }
  })

  vi.mock('@/stores/extensionStore', () => {
    return {
      useExtensionStore: () => ({
        registerExtension: vi.fn(),
        loadDisabledExtensionNames: vi.fn()
      })
    }
  })

  vi.mock('@/stores/workspaceStore', () => {
    return {
      useWorkspaceStore: () => ({
        shiftDown: false,
        spinner: false,
        focusMode: false,
        toggleFocusMode: vi.fn(),
        workflow: {
          activeWorkflow: null,
          syncWorkflows: vi.fn(),
          getWorkflowByPath: vi.fn(),
          createTemporary: vi.fn(),
          openWorkflow: vi.fn()
        }
      })
    }
  })

  vi.mock('@/stores/workspace/bottomPanelStore', () => {
    return {
      toggleBottomPanel: vi.fn()
    }
  })

  vi.mock('@/stores/widgetStore', () => {
    const widgets = {}
    return {
      useWidgetStore: () => ({
        widgets,
        registerCustomWidgets: vi.fn()
      })
    }
  })

  vi.mock('@/stores/widgetStore', () => {
    const widgets = {}
    return {
      useWidgetStore: () => ({
        widgets,
        registerCustomWidgets: vi.fn()
      })
    }
  })

  vi.mock('vue-i18n', () => {
    return {
      useI18n: vi.fn()
    }
  })

  vi.mock('jsondiffpatch', () => {
    return {
      diff: vi.fn()
    }
  })
}
