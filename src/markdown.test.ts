import { sanitizeRecipeHtml } from "../scripts/lib/markdown";

describe("sanitizeRecipeHtml", () => {
  test("keeps benign formatting and image markup", () => {
    const html = sanitizeRecipeHtml(
      "<h1>Title</h1><p>Some <strong>bold</strong> and " +
        '<img src="https://example.com/img.png" alt="alt text">.</p>',
    );

    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain('<img src="https://example.com/img.png"');
  });

  test("strips raw script and iframe tags", () => {
    const html = sanitizeRecipeHtml(
      "Hello<script>alert('xss')</script>" +
        '<iframe src="https://evil.example"></iframe>',
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("<iframe");
    expect(html).toContain("Hello");
  });

  test("removes event handlers and dangerous URL schemes from links", () => {
    const html = sanitizeRecipeHtml(
      '<a href="javascript:alert(1)" onclick="evil()">link</a>',
    );

    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("onclick");
    expect(html).toContain(">link</a>");
  });

  test("decodes benign apostrophe entities like the browser would", () => {
    const html = sanitizeRecipeHtml("<p>it&#39;s fine</p>");

    expect(html).toContain("<p>it's fine</p>");
  });
});
