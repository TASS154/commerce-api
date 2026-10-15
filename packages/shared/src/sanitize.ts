const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAGS = /<\/?[^>]+>/g;

/** Strip C0 control characters and HTML tags from user-provided strings. */
export function stripControlAndHtml(value: string): string {
  return value.replace(CONTROL_CHARS, "").replace(HTML_TAGS, "").trim();
}
