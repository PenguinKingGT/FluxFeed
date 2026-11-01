import { expect, type Locator } from '@playwright/test';

/** Checks document themes consume the reader's full content width without a second paper wrapper. */
export async function expectFullArticleWidth(prose: Locator): Promise<void> {
  await expect(prose).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(prose).toHaveCSS('padding', '0px');
  const geometry = await prose.evaluate((element) => {
    const reader = element.closest('.reader-content');
    if (!reader) {
      throw new Error('Article must be inside the reader content region');
    }
    const parent = reader.getBoundingClientRect();
    const style = getComputedStyle(reader);
    const left = parent.left + parseFloat(style.paddingLeft);
    const right = parent.right - parseFloat(style.paddingRight);
    const article = element.getBoundingClientRect();
    return {
      leftGap: Math.abs(article.left - left),
      rightGap: Math.abs(right - article.right),
      textWidth: element.clientWidth,
      availableWidth: right - left,
    };
  });
  // Bounding boxes may be fractional while clientWidth is rounded to whole CSS pixels.
  expect(geometry.leftGap).toBeLessThan(1);
  expect(geometry.rightGap).toBeLessThan(1);
  expect(Math.abs(geometry.textWidth - geometry.availableWidth)).toBeLessThan(1);
}
