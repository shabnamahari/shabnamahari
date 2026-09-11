#!/usr/bin/env python3
"""Markdown -> brand-styled PDF, via headless Chrome.

    python3 scripts/md-to-pdf.py input.md output.pdf

Colour and type follow 2026-08-10-brand-guide.pdf: Cream #EFEDEA ground,
Ink #191919 text, Signal Red kept rare, Vazirmatn for Persian.

Direction is read from the document rather than assumed. The Persian and
English knowledge-base documents are the same document in two languages, and
rendering the English one right-to-left — which an earlier Persian-only version
of this script did — silently produces a page that looks fine in a thumbnail
and is wrong on every line.
"""
import html as H
import re, subprocess, sys, pathlib, tempfile

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CSS = """
@page { size: A4; margin: 20mm 18mm 18mm; }
* { box-sizing: border-box; }
body {
  margin: 0; background: #EFEDEA; color: #191919;
  font-family: __FONT__;
  font-size: 11.5pt; line-height: 1.95; direction: __DIR__; text-align: __ALIGN__;
  -webkit-font-smoothing: antialiased;
}
h1 {
  font-weight: 700; font-size: 27pt; line-height: 1.3; letter-spacing: -0.01em;
  margin: 0 0 6mm; padding-bottom: 5mm; border-bottom: 1.5pt solid #191919;
}
h2 {
  font-weight: 700; font-size: 15pt; line-height: 1.45;
  margin: 11mm 0 4mm; padding-bottom: 2.5mm; border-bottom: 0.5pt solid #D5D2CD;
  break-after: avoid;
}
h3 {
  font-weight: 600; font-size: 12pt; margin: 7mm 0 2.5mm;
  break-after: avoid;
}
/* The editorial layer: light-at-large, per the brand guide's bilingual rule. */
.lede {
  font-weight: 400; font-size: 13pt; line-height: 1.85; color: #3a3a3a;
  margin: 0 0 7mm;
}
.date {
  font-size: 9.5pt; color: #6B6864; letter-spacing: 0.06em;
  margin: 0 0 8mm;
}
p { margin: 0 0 4mm; }
strong { font-weight: 700; }
code {
  font-family: "SF Mono", Menlo, monospace; font-size: 9.5pt;
  background: #F7F6F4; border: 0.5pt solid #D5D2CD; border-radius: 2pt;
  padding: 0.5pt 2pt; direction: ltr; unicode-bidi: embed;
}
hr { border: 0; border-top: 0.5pt solid #D5D2CD; margin: 9mm 0; }
ol { margin: 0 0 4mm; padding-__SIDE__: 6mm; list-style-type: __LIST__; }
li { margin-bottom: 2.5mm; }
/* Section numbers get the guide's parenthetical treatment. */
.num { color: #FF3B30; font-weight: 700; }
h2, h3, p, li { orphans: 2; widows: 2; }
"""


def is_rtl(text: str) -> bool:
    """Majority script wins, so a few Latin course names do not flip the page."""
    rtl = len(re.findall(r"[\u0600-\u06FF]", text))
    ltr = len(re.findall(r"[A-Za-z]", text))
    return rtl > ltr


def style_for(rtl: bool) -> str:
    css = CSS
    if rtl:
        css = css.replace("__FONT__", '"Vazirmatn", "Geeza Pro", sans-serif')
        css = css.replace("__DIR__", "rtl").replace("__ALIGN__", "right")
        css = css.replace("__SIDE__", "right").replace("__LIST__", "persian")
    else:
        css = css.replace(
            "__FONT__",
            '"Instrument Sans", "Helvetica Neue", Helvetica, Arial, sans-serif')
        css = css.replace("__DIR__", "ltr").replace("__ALIGN__", "left")
        css = css.replace("__SIDE__", "left").replace("__LIST__", "decimal")
    return css


def inline(s: str) -> str:
    s = H.escape(s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"«([^»]*)»", r"«\1»", s)
    return s


def render(md: str) -> str:
    out, para, in_ol = [], [], False

    def flush_para():
        nonlocal para
        if para:
            out.append(f"<p>{inline(' '.join(para))}</p>")
            para = []

    def close_ol():
        nonlocal in_ol
        if in_ol:
            out.append("</ol>")
            in_ol = False

    lines = md.split("\n")
    first_para_done = False

    for raw in lines:
        line = raw.rstrip()

        if not line.strip():
            flush_para(); close_ol(); continue

        if line.startswith("# "):
            flush_para(); close_ol()
            out.append(f"<h1>{inline(line[2:].strip())}</h1>")
            continue

        if line.startswith("## "):
            flush_para(); close_ol()
            t = line[3:].strip()
            # "۵ · دوره‌ها" -> the number gets the accent
            m = re.match(r"^([۰-۹]+)\s*·\s*(.+)$", t)
            t = f'<span class="num">{m.group(1)}</span> · {inline(m.group(2))}' if m else inline(t)
            out.append(f"<h2>{t}</h2>")
            continue

        if line.startswith("### "):
            flush_para(); close_ol()
            out.append(f"<h3>{inline(line[4:].strip())}</h3>")
            continue

        if re.match(r"^---+$", line.strip()):
            flush_para(); close_ol()
            out.append("<hr>")
            continue

        m = re.match(r"^([۰-۹]+)\.\s+(.*)$", line.strip())
        if m:
            flush_para()
            if not in_ol:
                out.append("<ol>"); in_ol = True
            out.append(f"<li>{inline(m.group(2))}</li>")
            continue

        if in_ol and line.startswith((" ", "\t")):
            out[-1] = out[-1][:-5] + " " + inline(line.strip()) + "</li>"
            continue

        # A bare date line right after the title reads as a standfirst.
        if not first_para_done and re.match(r"^[۰-۹]+\s+\S+\s+[۰-۹]+$", line.strip()):
            out.append(f'<p class="date">{inline(line.strip())}</p>')
            first_para_done = True
            continue

        para.append(line.strip())

    flush_para(); close_ol()
    return "\n".join(out)


def main():
    src = pathlib.Path(sys.argv[1])
    dst = pathlib.Path(sys.argv[2])
    md = src.read_text(encoding="utf-8")
    title = next((l[2:].strip() for l in md.split("\n") if l.startswith("# ")), src.stem)

    rtl = is_rtl(md)
    lang, direction = ("fa", "rtl") if rtl else ("en", "ltr")

    doc = (
        f'<!doctype html><html lang="{lang}" dir="{direction}"><head><meta charset="utf-8">'
        f"<title>{H.escape(title)}</title><style>{style_for(rtl)}</style></head>"
        f"<body>{render(md)}</body></html>"
    )

    tmp = pathlib.Path(tempfile.gettempdir()) / (dst.stem + ".render.html")
    tmp.write_text(doc, encoding="utf-8")

    subprocess.run(
        [CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
         f"--print-to-pdf={dst}", "--virtual-time-budget=6000", tmp.as_uri()],
        check=True, capture_output=True,
    )
    print(f"  ✓ {dst}  ({dst.stat().st_size:,} bytes, {direction})")


main()
