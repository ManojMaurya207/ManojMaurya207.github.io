export function applyMarkdownFormat(textarea, format) {
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end);
  const pairs = {
    bold: ["**", "**"],
    italic: ["*", "*"],
    code: ["```\n", "\n```"],
  };

  if (
    format === "heading" ||
    format === "bullet" ||
    format === "numbered" ||
    format === "quote"
  ) {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const rangeEnd = end > start && value[end - 1] === "\n" ? end - 1 : end;
    const nextBreak = value.indexOf("\n", rangeEnd);
    const blockEnd = nextBreak < 0 ? value.length : nextBreak;
    const block = value.slice(lineStart, blockEnd) || "Text to format";
    const prefix = {
      heading: "## ",
      bullet: "- ",
      numbered: "1. ",
      quote: "> ",
    }[format];
    const formatted = block
      .split("\n")
      .map((line) => (line ? `${prefix}${line}` : line))
      .join("\n");
    textarea.setRangeText(formatted, lineStart, blockEnd, "select");
  } else if (format === "link") {
    const label = selected || "link text";
    const replacement = `[${label}](https://example.com)`;
    textarea.setRangeText(replacement, start, end, "select");
  } else {
    const [before, after] = pairs[format] || ["", ""];
    const replacement = `${before}${selected || "text"}${after}`;
    textarea.setRangeText(replacement, start, end, "select");
  }

  textarea.focus();
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}
