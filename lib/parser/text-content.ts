/** Encodes literal text for HTML storage without interpreting entity notation or markup. */
export function escapeHtmlText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Preserves source line breaks in the reader's HTML body representation. */
export function plainTextToHtml(text: string): string {
  return escapeHtmlText(text).replace(/\r\n|\r|\n/g, '<br>');
}
