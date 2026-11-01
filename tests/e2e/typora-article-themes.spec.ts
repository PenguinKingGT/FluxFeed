import { expect, test } from './fixtures';
import { expectFullArticleWidth } from './article-width-assertions';

const themes = [
  { id: 'drake', name: 'Drake', lightLink: 'rgb(214, 50, 0)', darkLink: 'rgb(88, 161, 214)' },
  { id: 'purple', name: 'Purple', lightLink: 'rgb(22, 126, 115)', darkLink: 'rgb(114, 203, 189)' },
  { id: 'ursine', name: 'Ursine', lightLink: 'rgb(192, 63, 69)', darkLink: 'rgb(107, 202, 251)' },
  { id: 'lapis', name: 'Lapis', lightLink: 'rgb(72, 112, 172)', darkLink: 'rgb(171, 186, 212)' },
] as const;

for (const theme of themes) {
  test(`${theme.name} persists its document style and supports dark mode and narrow reading`, async ({ extension }) => {
    await extension.configureSettings({ theme: 'light', colorTheme: 'white' });
    await extension.addFeed('/style-feed.xml');
    const page = await extension.context.newPage();
    await page.setViewportSize({ width: 1600, height: 1100 });
    const options = `chrome-extension://${extension.extensionId}/options.html`;
    await page.goto(`${options}#/all`);
    await page.getByRole('button', { name: /文章样式排版示例/ }).click();
    const prose = page.locator('.reader-prose');
    const source = await prose.innerHTML();
    const font = await prose.evaluate((element) => getComputedStyle(element).fontFamily);
    await page.goto(`${options}#/settings?section=appearance`);
    await page.getByRole('combobox', { name: 'Article style', exact: true }).click();
    await expect(page.getByRole('option')).toHaveCount(9);
    await page.getByRole('option', { name: theme.name, exact: true }).click();
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Article style', exact: true })).toContainText(theme.name);
    await page.goto(`${options}#/all`);
    await page.getByRole('button', { name: /文章样式排版示例/ }).click();
    await expect(prose).toHaveAttribute('data-article-style', theme.id);
    await expect(prose.locator('a')).toHaveCSS('color', theme.lightLink);
    await expectFullArticleWidth(prose);
    await expect(prose).toHaveCSS('font-family', font);
    await expect(page.locator('html')).toHaveAttribute('data-color-theme', 'white');
    expect(await prose.innerHTML()).toBe(source);
    if (theme.id === 'drake') {
      await expect(prose.locator('pre')).toHaveCSS('border-radius', '0px');
      await expect(prose.locator('pre')).toHaveCSS('background-color', 'rgb(43, 43, 43)');
    } else if (theme.id === 'purple') {
      await expect(prose.locator('h2')).toHaveCSS('color', 'rgb(128, 100, 169)');
      expect(await prose.locator('h2').evaluate((element) => parseFloat(getComputedStyle(element).borderLeftWidth))).toBeGreaterThan(0);
    } else if (theme.id === 'ursine') {
      await expect(prose.locator('blockquote')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      expect(await prose.locator('blockquote').evaluate((element) => parseFloat(getComputedStyle(element, '::before').width))).toBe(4);
    } else {
      await expect(prose.locator('h2')).toHaveCSS('display', 'inline-block');
      await expect(prose.locator('h2')).toHaveCSS('background-color', 'rgb(72, 112, 172)');
    }
    await page.screenshot({ path: extension.outputPath(`${theme.id}-light.png`), animations: 'disabled' });
    await page.goto(`${options}#/settings?section=appearance`);
    await page.getByRole('group', { name: 'Appearance Mode', exact: true }).getByLabel('Dark', { exact: true }).click();
    await page.goto(`${options}#/all`);
    await page.getByRole('button', { name: /文章样式排版示例/ }).click();
    await expectFullArticleWidth(prose);
    await expect(prose.locator('a')).toHaveCSS('color', theme.darkLink);
    expect(await prose.innerHTML()).toBe(source);
    const codeColors = await prose.locator('pre').evaluate((element) => ({
      base: getComputedStyle(element).color,
      keyword: getComputedStyle(element.querySelector('.hljs-keyword')!).color,
    }));
    expect(codeColors.keyword).not.toBe(codeColors.base);
    await page.screenshot({ path: extension.outputPath(`${theme.id}-dark.png`), animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 800 });
    const pane = page.getByTestId('reading-pane');
    await expectFullArticleWidth(prose);
    await expect.poll(() => pane.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    for (const element of [prose.locator('pre'), prose.locator('table')]) {
      await expect.poll(() => element.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
    }
    await page.screenshot({ path: extension.outputPath(`${theme.id}-mobile.png`), animations: 'disabled' });
  });
}
