import { test, expect } from '@playwright/test';

test.describe('ThousandTen M2 Milestone E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the game
    await page.goto('http://localhost:5173/ThousandTen-web/');
    // Wait for the game to fully render
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1', { hasText: 'ThousandTen' })).toBeVisible();
  });

  test('Grid should be exactly 10x10', async ({ page }) => {
    // Find all grid cells by looking at the data attributes we added in the code
    const cells = page.locator('[data-grid-cell="true"]');
    
    // Check total count: 10 * 10 = 100
    await expect(cells).toHaveCount(100);

    // Verify row and col attributes go up to 9
    const lastCell = cells.last();
    await expect(lastCell).toHaveAttribute('data-row', '9');
    await expect(lastCell).toHaveAttribute('data-col', '9');
  });

  test('Available blocks area should generate exactly 3 blocks initially', async ({ page }) => {
    // The blocks in the available area are draggable divs inside the bottom container
    const availableArea = page.locator('.min-h-\\[160px\\]');
    
    // The blocks have the cursor-grab class
    const blocks = availableArea.locator('.cursor-grab');
    
    await expect(blocks).toHaveCount(3);
  });

  test('Should be able to drag and drop a block onto the grid and score points', async ({ page }) => {
    // Get initial score
    const scoreLocator = page.locator('span.text-2xl.font-bold');
    const initialScoreText = await scoreLocator.innerText();
    const initialScore = parseInt(initialScoreText, 10);
    
    expect(initialScore).toBe(0);

    // Find the first available block
    const firstBlock = page.locator('.cursor-grab').first();
    
    // Find a target cell in the middle of the grid (e.g., row 5, col 5)
    const targetCell = page.locator('[data-grid-cell="true"][data-row="5"][data-col="5"]');

    // Perform the drag and drop using pointer events to simulate our custom drag logic
    // Get the first filled cell of the block so we know exactly where to click
    const firstFilledCell = firstBlock.locator('div').locator('div.shadow-\\[0_2px_4px_rgba\\(0\\,0\\,0\\,0\\.2\\)\\]').first();
    const box = await firstFilledCell.boundingBox();
    if (!box) throw new Error('Block cell not found');
    
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    
    // Move to target cell
    const targetBox = await targetCell.boundingBox();
    if (targetBox) {
      // Need a slight delay to allow React state to catch up with the drag start
      await page.waitForTimeout(100);
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
      await page.waitForTimeout(100);
    }
    
    await page.mouse.up();

    // Verify the score has increased (since any block has at least 1 cell)
    const newScoreText = await scoreLocator.innerText();
    const newScore = parseInt(newScoreText, 10);
    expect(newScore).toBeGreaterThan(0);
    
    // Verify there are now only 2 blocks left in the available area
    const remainingBlocks = page.locator('.min-h-\\[160px\\] .cursor-grab');
    await expect(remainingBlocks).toHaveCount(2);
  });
});
