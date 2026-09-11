# Brand PDFs

A markdown file goes in; a PDF in the design of the brand guide
(`2026-08-10-brand-guide.pdf`) comes out. Built 11 September 2026 for the chatbot
knowledge-base documents, and meant for any document Shabnam asks for as a PDF.

```
npm run pdf -- "path/to/document.md"              # writes document.pdf beside it
npm run pdf -- "path/to/document.md" other.pdf    # or somewhere else
```

Quote the path — the folders under `mywebsite. personal/` have spaces in their
names. A relative path is read from wherever the command was typed, not from the
repo root. The markdown file is only read, never written.

**The PDF it replaces goes to the Trash**, not away — and only after the new one has
been written, so a failed render never costs the old file.

## Where everything is

| Path | What it is |
|---|---|
| `scripts/md-to-pdf.py` | The tool. One file, Python 3 standard library only. |
| `scripts/brand-pdf/template.css` | The design. Every value is taken from the guide's own source, with a comment where a flowing document had to depart from a fixed-layout book. |
| `scripts/brand-pdf/fonts/` | The five brand families as `.woff2` — Bricolage Grotesque, Geist Mono, Instrument Sans, Instrument Serif, Vazirmatn (300–900) — each with its SIL Open Font Licence. |
| `scripts/brand-pdf/fonts.css` | Their `@font-face` rules, with the guide's unicode ranges. |
| `scripts/brand-pdf/numbers.json` | Section numbers for documents whose numbering must match a translation. |

It needs macOS, Google Chrome at its usual path (or `CHROME=/path/to/binary`), and
`python3`. No npm packages and no network: the fonts are inlined into the page
before Chrome prints it. PyMuPDF (`fitz`) is optional — with it, the tool checks
every page for overflow; without it, it says the check was skipped.

## What the markdown becomes

| Markdown | On the page |
|---|---|
| `# Title — subtitle` | The cover, set like the guide's p.1: the first half in display type, the second in the editorial layer, then the date, "the instrument" ruler and the tagline. |
| A date alone on the line under the title | The cover date. Without one, the date in the file name. |
| Text before the first `##` | The cover's standfirst. A document that opens with a `>` quote uses the quote. |
| `## 5 · Title` | A section: a fresh sheet, `( 05 )`, the gold dash, the title, the rule, a ghost numeral in the far corner. Its name and the page number sit in the footer of every sheet it runs to. |
| `### ` and `#### ` | The guide's subhead with a hairline above it; the small mono label in parentheses. |
| Tables | The guide's ruled rows: mono column heads, hairlines between rows, no verticals, no fills. `:--`, `:-:` and `--:` align columns; escape a literal bar as `\|`. |
| `>` quote, code block, `---` | The tinted card with the Signal Red bar; a mono card; a hairline. |
| `**bold**`, `*italic*`, `` `code` ``, `[links](…)` | As you would expect. English italics are Instrument Serif. |

Direction comes from the document: whichever script has more letters wins. Persian
runs right to left in Vazirmatn, with Persian digits in the section index, the page
numbers and numbered lists. Latin words inside Persian are isolated so an `@` or `+`
stays at the right end of its word.

## Section numbers

In order of precedence:

1. `numbers.json` — keyed by file name, then by the `##` heading exactly as written.
2. A number written into the heading, as in `## ۵ · دوره‌ها`.
3. If a document numbers none of its sections, they are counted in order — the
   guide never shows a head without a number.

Two sections in a row with the same number are one section: the second continues
the first under a subhead. This is how the English knowledge-base file matches the
Persian one — its sections come in a different order and it gives "Answering hours"
a section of its own, where the Persian keeps it inside ۹.

**When a file in `numbers.json` is renamed** — a new date on the front, say — rename
its entry too. The tool warns about every heading it cannot find a number for.

## Decisions, and why

- **Running text is 9.5pt, not the guide's 7.5pt.** The guide is a book of short
  statements; these documents are read at length. Everything else is the guide's.
  Shabnam chose this over an exact-size version on 11 September 2026.
- **The display face is Bricolage Grotesque**, which is what the guide is set in —
  its typography page names Kumbh Sans, but the pages themselves are Bricolage.
  Confirmed by Shabnam, 11 September 2026.
- **Persian has no serif**, so its editorial layer is Vazirmatn 300 set large and its
  display is Vazirmatn 900 (guide p.10). Persian words are never letter-spaced;
  letter-spacing breaks the joins.
- **Every section starts a sheet**, as every subject in the guide has its own page.
  Short sections leave white space, as the guide's pages do.
- **The fonts are the guide's own files**, extracted from its source
  (`~/mabrandguide/2026-08-10-brand-guide.html`), and inlined rather than linked: a
  linked font can lose the race against Chrome's print, and the page then falls back
  to Helvetica and Geeza Pro without any error.

## Checking a PDF

The tool rasterises every page and reports ink where there must be none — in the side
margins, or between the last line and the footer rule — and exits with status 1.

Beyond that, look at the pages rather than extracting their text. Shaped Persian comes
back from a PDF in visual order, so a diff against the markdown shows hundreds of
differences that are not there:

```
python3 -c "import fitz; [p.get_pixmap(dpi=110).save(f'page-{i+1}.png') for i, p in enumerate(fitz.open('document.pdf'))]"
```

## What it does not do

Nested lists, images and footnotes are not supported. A document gets one cover, from
its first `#` heading. For a brand-new design rather than a new document, change
`template.css` — and read the guide's pages first.
