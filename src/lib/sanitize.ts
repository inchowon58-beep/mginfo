import sanitizeHtml from "sanitize-html";

export function cleanHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "h2",
      "h3",
      "p",
      "br",
      "strong",
      "em",
      "b",
      "i",
      "ul",
      "ol",
      "li",
      "blockquote",
      "cite",
      "a",
      "img",
      "figure",
      "figcaption",
      "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
      span: ["class"],
      blockquote: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

export function stripGeneratedImages(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "h2",
      "h3",
      "p",
      "br",
      "strong",
      "em",
      "b",
      "i",
      "ul",
      "ol",
      "li",
      "blockquote",
      "cite",
      "a",
      "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["class"],
      blockquote: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}
