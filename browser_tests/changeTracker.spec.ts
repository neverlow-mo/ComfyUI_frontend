import {
  ComfyPage,
  comfyPageFixture as test,
  comfyExpect as expect
} from './fixtures/ComfyPage'

async function beforeChange(comfyPage: ComfyPage) {
  await comfyPage.page.evaluate(() => {
    window['app'].canvas.emitBeforeChange()
  })
}
async function afterChange(comfyPage: ComfyPage) {
  await comfyPage.page.evaluate(() => {
    window['app'].canvas.emitAfterChange()
  })
}

test.describe('Change Tracker', () => {
  test.describe('Undo/Redo', () => {
    test.beforeEach(async ({ comfyPage }) => {
      await comfyPage.setSetting('Comfy.UseNewMenu', 'Top')
    })

    // Flaky https://github.com/Comfy-Org/ComfyUI_frontend/pull/1481
    // The collapse can be recognized as several changes.
    test.skip('Can undo multiple operations', async ({ comfyPage }) => {
      function isModified() {
        return comfyPage.page.evaluate(async () => {
          return window['app'].extensionManager.workflow.activeWorkflow
            .isModified
        })
      }

      await comfyPage.menu.topbar.saveWorkflow('undo-redo-test')
      expect(await isModified()).toBe(false)

      const node = (await comfyPage.getFirstNodeRef())!
      await node.click('collapse')
      await expect(node).toBeCollapsed()
      expect(await isModified()).toBe(true)

      await comfyPage.ctrlB()
      await expect(node).toBeBypassed()
      expect(await isModified()).toBe(true)

      await comfyPage.ctrlZ()
      await expect(node).not.toBeBypassed()
      expect(await isModified()).toBe(true)

      await comfyPage.ctrlZ()
      await expect(node).not.toBeCollapsed()
      expect(await isModified()).toBe(false)
    })
  })

  test('Can undo & redo user changes', async ({ comfyPage }) => {
    comfyPage.clickEmptySpace()
    await expect(comfyPage.canvas).toHaveScreenshot('undo-initial-state.png')

    comfyPage.dragAndDrop(
      comfyPage.clipTextEncodeNode2OutputSlot,
      comfyPage.kSamplerTitlebar
    )
    await expect(comfyPage.canvas).toHaveScreenshot('undo-step1.png')

    comfyPage.ctrlZ()
    await expect(comfyPage.canvas).toHaveScreenshot('undo-initial-state.png')

    comfyPage.dragAndDrop(
      comfyPage.clipTextEncodeNode1OutputSlot,
      comfyPage.kSamplerTitlebar
    )
    await expect(comfyPage.canvas).toHaveScreenshot('undo-step3.png')

    comfyPage.ctrlZ()
    await expect(comfyPage.canvas).toHaveScreenshot('undo-initial-state.png')

    comfyPage.ctrlY()
    await expect(comfyPage.canvas).toHaveScreenshot('undo-step3.png')
  })

  test('Can group multiple change actions into a single transaction', async ({
    comfyPage
  }) => {
    const node = (await comfyPage.getFirstNodeRef())!
    expect(node).toBeTruthy()
    await expect(node).not.toBeCollapsed()
    await expect(node).not.toBeBypassed()

    // Make changes outside set
    // Bypass + collapse node
    await node.click('collapse')
    await comfyPage.ctrlB()
    await expect(node).toBeCollapsed()
    await expect(node).toBeBypassed()

    // Undo, undo, ensure both changes undone
    await comfyPage.ctrlZ()
    await expect(node).not.toBeBypassed()
    await expect(node).toBeCollapsed()
    await comfyPage.ctrlZ()
    await expect(node).not.toBeBypassed()
    await expect(node).not.toBeCollapsed()

    // Run again, but within a change transaction
    beforeChange(comfyPage)

    await node.click('collapse')
    await comfyPage.ctrlB()
    await expect(node).toBeCollapsed()
    await expect(node).toBeBypassed()

    // End transaction
    afterChange(comfyPage)

    // Ensure undo reverts both changes
    await comfyPage.ctrlZ()
    await expect(node).not.toBeBypassed()
    await expect(node).not.toBeCollapsed()
  })

  test('Can group multiple transaction calls into a single one', async ({
    comfyPage
  }) => {
    const node = (await comfyPage.getFirstNodeRef())!
    const bypassAndPin = async () => {
      await beforeChange(comfyPage)
      await comfyPage.ctrlB()
      await expect(node).toBeBypassed()
      await comfyPage.page.keyboard.press('KeyP')
      await comfyPage.nextFrame()
      await expect(node).toBePinned()
      await afterChange(comfyPage)
    }

    const collapse = async () => {
      await beforeChange(comfyPage)
      await node.click('collapse', { moveMouseToEmptyArea: true })
      await expect(node).toBeCollapsed()
      await afterChange(comfyPage)
    }

    const multipleChanges = async () => {
      await beforeChange(comfyPage)
      // Call other actions that uses begin/endChange
      await collapse()
      await bypassAndPin()
      await afterChange(comfyPage)
    }

    await multipleChanges()

    await comfyPage.ctrlZ()
    await expect(node).not.toBeBypassed()
    await expect(node).not.toBePinned()
    await expect(node).not.toBeCollapsed()

    await comfyPage.ctrlY()
    await expect(node).toBeBypassed()
    await expect(node).toBePinned()
    await expect(node).toBeCollapsed()
  })
})
