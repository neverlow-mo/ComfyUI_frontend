import { vi } from 'vitest'

module.exports = async function () {
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
