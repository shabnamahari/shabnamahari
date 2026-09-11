#!/usr/bin/env python3
"""Markdown -> PDF in the design of the brand guide (2026-08-10-brand-guide.pdf).

    npm run pdf -- "path/to/document.md"          # writes document.pdf beside it
    python3 scripts/md-to-pdf.py in.md [out.pdf]

Everything a page needs lives in scripts/brand-pdf/ — the template, the five
brand fonts and numbers.json — so nothing is fetched at render time. A PDF
that already has the output's name goes to the Trash, not away. How it works,
and what it will not do: docs/PDF.md.

Direction is read from the document rather than assumed. The Persian and
English knowledge-base documents are the same document in two languages, and
rendering the English one right-to-left — which an earlier Persian-only version
of this script did — silently produces a page that looks fine in a thumbnail
and is wrong on every line.
"""
import argparse
import base64
import datetime
import html as H
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

KIT = pathlib.Path(__file__).resolve().parent / "brand-pdf"
CHROME = os.environ.get(
    "CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

AUTHOR = {"fa": "شبنم آهاری", "en": "Shabnam Ahari"}
TAGLINE = "Your goal speaks English."       # never translated (guide p.5)

FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
EN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")
MONTHS = {
    "fa": ["ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
           "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر"],
    "en": ["January", "February", "March", "April", "May", "June", "July",
           "August", "September", "October", "November", "December"],
}

# The guide alternates white sheets with three paper tones (guide pp.1–20).
COVER_PAPER = "#F7F4EE"
PAPERS = ["#FFFFFF", "#F7F4EE", "#FFFFFF", "#F1ECE2",
          "#FFFFFF", "#F7F4EE", "#FFFFFF", "#E9E2D5"]

DATE_RE = re.compile(r"^[0-9۰-۹]{1,2}\s+\S+\s+[0-9۰-۹]{4}$")
NUMBERED_RE = re.compile(r"^([0-9۰-۹]+)\s*[·.)\-–—:]\s*(.+)$")
OL_RE = re.compile(r"^([0-9۰-۹]+)[.)]\s+(.*)$")
UL_RE = re.compile(r"^[-*+]\s+(.*)$")
HR_RE = re.compile(r"^(-{3,}|\*{3,}|_{3,})$")
TABLE_SEP_RE = re.compile(r"^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$")

# A run of Latin words, joined by spaces, "&" or "+". Never starts inside an
# HTML entity (the text is already escaped when this runs).
_W = r"[A-Za-z0-9_@#+./:'’\-]"
LATIN_RE = re.compile(
    rf"(?<![&A-Za-z0-9])[@#]?[A-Za-z]{_W}*(?:[ ]+(?:&amp;|\+|[A-Za-z0-9]{_W}*))*")


def warn(msg):
    print(f"  ! {msg}", file=sys.stderr)


def is_rtl(text):
    """Majority script wins, so a few Latin course names do not flip the page."""
    return len(re.findall(r"[؀-ۿ]", text)) > len(re.findall(r"[A-Za-z]", text))


def css_string(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


# ---------------------------------------------------------------- inline ----

def isolate_latin(t):
    def fix(seg):
        def rep(m):
            w, tail = m.group(0), ""
            # Closing punctuation belongs to the Persian sentence, not the run.
            while w and w[-1] in ".,:;'’":
                tail, w = w[-1] + tail, w[:-1]
            return f'<span class="lat" dir="ltr">{w}</span>{tail}' if w else tail
        return LATIN_RE.sub(rep, seg)
    return "".join(x if x.startswith("<") else fix(x) for x in re.split(r"(<[^>]+>)", t))


def inline(s, rtl):
    out = []
    for part in re.split(r"(`[^`]+`)", s):
        if len(part) > 1 and part.startswith("`") and part.endswith("`"):
            out.append(f'<code dir="ltr">{H.escape(part[1:-1], quote=False)}</code>')
            continue
        t = H.escape(part, quote=False)
        t = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2">\1</a>', t)
        t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
        t = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", t)
        if rtl:
            # An italic run that is all English — the tagline, a quoted line —
            # is one isolate and keeps its own full stop.
            kept = []

            def hold(m):
                kept.append(f'<em class="lat" dir="ltr">{m.group(1)}</em>')
                return f"\x00{len(kept) - 1}\x00"
            t = re.sub(r"<em>([^<؀-ۿ]*[A-Za-z][^<؀-ۿ]*)</em>", hold, t)
            t = isolate_latin(t)
            t = re.sub(r"\x00(\d+)\x00", lambda m: kept[int(m.group(1))], t)
        out.append(t)
    return "".join(out)


# ----------------------------------------------------------------- blocks ---

def cells(row):
    row = row.strip()
    if row.startswith("|"):
        row = row[1:]
    if row.endswith("|") and not row.endswith("\\|"):
        row = row[:-1]
    return [c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", row)]


def table(head, sep, rows, rtl):
    align = []
    for c in cells(sep):
        align.append("center" if c.startswith(":") and c.endswith(":")
                     else "end" if c.endswith(":") else "")

    def cell(tag, i, c):
        a = align[i] if i < len(align) else ""
        style = f' style="text-align:{a}"' if a else ""
        return f"<{tag}{style}>{inline(c, rtl)}</{tag}>"

    width = len(head)
    thead = "".join(cell("th", i, c) for i, c in enumerate(head))
    body = "".join(
        "<tr>" + "".join(cell("td", i, c) for i, c in enumerate((r + [""] * width)[:width]))
        + "</tr>" for r in rows)
    return f'<table class="tbl"><thead><tr>{thead}</tr></thead><tbody>{body}</tbody></table>'


def blocks(lines, rtl):
    out, para, i, n = [], [], 0, len(lines)

    def flush():
        if para:
            out.append(f"<p>{inline(' '.join(para), rtl)}</p>")
            para.clear()

    while i < n:
        raw = lines[i]
        s = raw.strip()

        if not s:
            flush(); i += 1; continue

        if s.startswith("```"):
            flush()
            j, buf = i + 1, []
            while j < n and not lines[j].strip().startswith("```"):
                buf.append(lines[j]); j += 1
            out.append(f"<pre>{H.escape(chr(10).join(buf), quote=False)}</pre>")
            i = j + 1; continue

        if s.startswith("#### "):
            flush()
            out.append(f'<h4 class="lbl">( {inline(s[5:].strip(), rtl)} )</h4>')
            i += 1; continue

        if s.startswith("### "):
            flush()
            out.append(f'<h3 class="sub">{inline(s[4:].strip(), rtl)}</h3>')
            i += 1; continue

        if HR_RE.match(s):
            flush(); out.append("<hr>"); i += 1; continue

        if s.startswith(">"):
            flush()
            buf = []
            while i < n and lines[i].strip().startswith(">"):
                buf.append(re.sub(r"^\s*>\s?", "", lines[i])); i += 1
            out.append(f"<blockquote>{''.join(blocks(buf, rtl))}</blockquote>")
            continue

        if s.startswith("|") and i + 1 < n and TABLE_SEP_RE.match(lines[i + 1].strip()):
            flush()
            head, sep = cells(s), lines[i + 1]
            i += 2
            rows = []
            while i < n and lines[i].strip().startswith("|"):
                rows.append(cells(lines[i])); i += 1
            out.append(table(head, sep, rows, rtl))
            continue

        m = OL_RE.match(s) or UL_RE.match(s)
        if m and not raw.startswith(("    ", "\t")):
            flush()
            ordered = bool(OL_RE.match(s))
            pat = OL_RE if ordered else UL_RE
            start = int(m.group(1).translate(EN_DIGITS)) if ordered else 1
            items = []
            while i < n:
                r, t = lines[i], lines[i].strip()
                mm = pat.match(t)
                if mm and not r.startswith(("  ", "\t")):
                    items.append(mm.group(mm.lastindex)); i += 1
                elif t and r.startswith((" ", "\t")) and items:
                    items[-1] += " " + t; i += 1        # a wrapped item
                else:
                    break
            tag = "ol" if ordered else "ul"
            attr = f' start="{start}"' if ordered and start != 1 else ""
            lis = "".join(f"<li>{inline(x, rtl)}</li>" for x in items)
            out.append(f"<{tag}{attr}>{lis}</{tag}>")
            continue

        para.append(s)
        i += 1

    flush()
    return out


def trim(lines):
    """Drop blank lines and rules at either end — a section already starts a
    new sheet, so a `---` before a heading has nothing left to do."""
    while lines and (not lines[0].strip() or HR_RE.match(lines[0].strip())):
        lines = lines[1:]
    while lines and (not lines[-1].strip() or HR_RE.match(lines[-1].strip())):
        lines = lines[:-1]
    return lines


# --------------------------------------------------------------- document ---

def parse(md):
    title, lede, sections, cur = None, [], [], None
    for line in md.replace("\r\n", "\n").split("\n"):
        if title is None and line.startswith("# "):
            title = line[2:].strip(); continue
        if line.startswith("## "):
            cur = {"head": line[3:].strip(), "lines": []}
            sections.append(cur); continue
        (cur["lines"] if cur else lede).append(line.rstrip())

    lede = trim(lede)
    date = None
    if lede and DATE_RE.match(lede[0].strip()):
        date, lede = lede[0].strip(), trim(lede[1:])
    # A document that opens with nothing but a quote reads it as its standfirst.
    if lede and all(l.strip().startswith(">") or not l.strip() for l in lede):
        lede = [re.sub(r"^\s*>\s?", "", l) for l in lede]
    for s in sections:
        s["lines"] = trim(s["lines"])
    return title or "", date, lede, sections


def number(sections, src):
    """Give each section its number, in order of precedence:

    1. numbers.json, for a document whose numbers must match a translation
       that orders its sections differently;
    2. the number written in the heading, as in "۵ · دوره‌ها";
    3. counting in order, when the document numbers none of its sections —
       the guide never shows a head without one.

    Two sections in a row with one number are one section: the second
    continues the first under a subhead, rather than starting a sheet."""
    for s in sections:
        m = NUMBERED_RE.match(s["head"])
        s["num"], s["title"] = ((m.group(1).translate(EN_DIGITS), m.group(2)) if m
                                else (None, s["head"]))

    table = json.loads((KIT / "numbers.json").read_text(encoding="utf-8")).get(src.name)
    if table:
        table = {k: v for k, v in table.items() if not k.startswith("_")}
        for s in sections:
            if s["title"] in table:
                s["num"] = str(table[s["title"]])
            else:
                warn(f'numbers.json has no number for "{s["title"]}"')
        for t in set(table) - {s["title"] for s in sections}:
            warn(f'numbers.json lists "{t}", which is not a heading in {src.name}')
    elif sections and not any(s["num"] for s in sections):
        for k, s in enumerate(sections, 1):
            s["num"] = str(k)

    merged = []
    for s in sections:
        if merged and s["num"] and s["num"] == merged[-1]["num"]:
            merged[-1]["lines"] += ["", "### " + s["title"], ""] + s["lines"]
        else:
            merged.append(s)
    return merged


def fmt_num(num, lang, width=2):
    n = num.translate(EN_DIGITS).zfill(width)
    return n.translate(FA_DIGITS) if lang == "fa" else n


def file_date(path, lang):
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", path.name)
    d = datetime.date(*map(int, m.groups())) if m else datetime.date.today()
    s = f"{d.day} {MONTHS[lang][d.month - 1]} {d.year}"
    return s.translate(FA_DIGITS) if lang == "fa" else s


def split_title(title):
    """"Brand — Foundation": the first half is set in display, the second in
    the editorial layer, as the guide's cover sets its two words."""
    parts = re.split(r"\s+[—–]\s+", title, maxsplit=1)
    return (parts[0], parts[1]) if len(parts) == 2 else (title, "")


def fit(text, largest, per_char, smallest):
    """Largest size at which `text` still fits the 493pt measure on one line."""
    return max(smallest, min(largest, round(493 / (per_char * max(len(text), 1)), 1)))


def cover(title, date, lede_html, src, lang, rtl):
    main, sub = split_title(title)
    fa = lang == "fa"
    date = date or file_date(src, lang)
    year = re.search(r"[0-9۰-۹]{4}", date).group(0)
    year = year.translate(FA_DIGITS) if fa else year.translate(EN_DIGITS)
    e = lambda s: inline(s, rtl)

    main_pt = fit(main, 70, .5 if fa else .56, 36)
    sub_html = ""
    if sub:
        sub_pt = fit(sub, 68, .44 if fa else .38, 26)
        sub_html = f'<div class="c-sub" style="font-size:{sub_pt}pt">{e(sub)}</div>'
    ticks = "".join(f'<i style="inset-inline-start:{x}pt"></i>'
                    for x in (0, 85, 170, 255, 339.2))
    return f"""
<section class="cover">
  <div class="c-head">
    <div class="c-ghost">{fmt_num("1", lang)}</div>
    <div class="c-top"><span class="colhead">( {e(main)} )</span>
      <span class="colhead">( {AUTHOR[lang]} · {year} )</span></div>
    <div class="ruler"><i class="line"></i>{ticks}<i class="mark" style="inset-inline-start:255pt"></i></div>
    <div class="c-date"><span class="bar"></span><span class="colhead">( {e(date)} )</span></div>
    <div class="c-title">
      <div class="c-main" style="font-size:{main_pt}pt">{e(main)}</div>
      {sub_html}
    </div>
    <div class="c-tag"><span dir="ltr" lang="en">&ldquo;{TAGLINE}&rdquo;</span></div>
  </div>
  <div class="c-rule"></div>
  <div class="c-lede">{lede_html}</div>
</section>"""


def section(k, s, lang, rtl):
    idx = ghost = ""
    if s["num"]:
        idx = f'<span class="idx">( {fmt_num(s["num"], lang)} )</span>'
        ghost = f'<div class="ghost">{fmt_num(s["num"], lang)}</div>'
    return f"""
<section class="section" style="page:s{k}">
  {ghost}
  <div class="phead">{idx}<span class="dash"></span><h1>{inline(s["title"], rtl)}</h1></div>
  <div class="hrule"></div>
  <div class="sbody">{"".join(blocks(s["lines"], rtl))}</div>
</section>"""


def page_css(title, sections, lang, rtl):
    """Paper colour, footer label and page number for every sheet.

    Each section gets its own named @page, so its paper and the label in its
    footer follow it onto every sheet it runs to — the guide's footer: the
    section's name at the start, the page number at the end."""
    label_side, num_side = ("right", "left") if rtl else ("left", "right")
    counter = "fa-pad" if rtl else "decimal-leading-zero"
    if rtl:
        label_font = "font:500 6pt/1 'Vazirmatn',sans-serif; color:#A9A091;"
        num_font = "font:500 6.6pt/1 'Vazirmatn',sans-serif; letter-spacing:.2em; color:#C42A1E;"
    else:
        label_font = ("font:5pt/1 'Geist Mono',monospace; letter-spacing:.42em; "
                      "color:#A9A091; text-transform:uppercase;")
        num_font = "font:5.6pt/1 'Geist Mono',monospace; letter-spacing:.3em; color:#C42A1E;"
    # The guide's footer rule sits at 793.5pt across its 493pt measure (51pt
    # left, 51.28pt right); body copy stops 19.6pt above it. The rule is the
    # top border of the two footer boxes, each 247pt — a point over half. At
    # exactly half, right-to-left sheets showed a gap where the borders met.
    # (Chrome ignores background-image on @page, so it cannot be drawn there.)
    box = ("vertical-align:top; width:247pt; margin-top:19.6pt; padding-top:7pt; "
           "border-top:.6pt solid #E6DFD2;")
    css = [f"""
@counter-style fa-pad {{ system: extends persian; pad: 2 "۰"; }}
@page {{
  size: A4; margin: 52pt 51.28pt 68pt 51pt;
  @bottom-{label_side} {{ {box} {label_font} text-align:{label_side}; content:""; }}
  @bottom-{num_side} {{ {box} {num_font} text-align:{num_side};
                        content:"( " counter(page, {counter}) " )"; }}
}}"""]
    # The cover's hairline runs the full height of the sheet, on the margin.
    side, edge = ("right", "left") if rtl else ("left", "right")
    line = f'content:""; border-{edge}:.6pt solid #E6DFD2;'
    cover_label = f"{split_title(title)[0]} · {AUTHOR[lang]}"
    css.append(f"""
@page cover {{
  background-color:{COVER_PAPER};
  @top-{side}-corner {{ {line} }} @{side}-top {{ {line} }} @{side}-middle {{ {line} }}
  @{side}-bottom {{ {line} }} @bottom-{side}-corner {{ {line} }}
  @bottom-{label_side} {{ content:{css_string(cover_label)}; }}
}}""")
    for k, s in enumerate(sections):
        css.append(f"@page s{k} {{ background-color:{PAPERS[k % len(PAPERS)]}; "
                   f"@bottom-{label_side} {{ content:{css_string(s['title'])}; }} }}")
    return "\n".join(css)


def fonts_css():
    """The guide's own @font-face rules, each file inlined. Inlined, not
    linked: a font that loads late loses the race against Chrome's print and
    the page silently falls back to Helvetica and Geeza Pro."""
    css = (KIT / "fonts.css").read_text(encoding="utf-8")

    def data(m):
        raw = (KIT / "fonts" / m.group(1)).read_bytes()
        return "url(data:font/woff2;base64," + base64.b64encode(raw).decode() + ")"
    return re.sub(r"url\(([^)]+\.woff2)\)", data, css)


def build_html(src):
    md = src.read_text(encoding="utf-8")
    rtl = is_rtl(md)
    lang, direction = ("fa", "rtl") if rtl else ("en", "ltr")
    title, date, lede, sections = parse(md)
    sections = number(sections, src)
    body = cover(title, date, "".join(blocks(lede, rtl)), src, lang, rtl)
    body += "".join(section(k, s, lang, rtl) for k, s in enumerate(sections))
    style = (fonts_css() + (KIT / "template.css").read_text(encoding="utf-8")
             + page_css(title, sections, lang, rtl))
    return (f'<!doctype html><html lang="{lang}" dir="{direction}"><head><meta charset="utf-8">'
            f"<title>{H.escape(title)}</title><style>{style}</style></head>"
            f"<body>{body}</body></html>"), direction


# ------------------------------------------------------------------ checks ---

def check(pdf):
    """Rasterise every page and look for ink where there must be none: in the
    side margins, and in the strip between the last line of copy and the
    footer rule. Pixels, not extracted text — shaped Persian comes back in
    visual order and every comparison against the source goes wrong."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        print("  · PyMuPDF is not installed — skipped the overflow check")
        return True
    bad = []
    with fitz.open(pdf) as doc:
        for n, page in enumerate(doc, 1):
            pm = page.get_pixmap(dpi=144, colorspace=fitz.csGRAY)
            w, s, k = pm.width, pm.samples, pm.width / page.rect.width

            def inked(x0, x1, y0, y1):
                # Darker than the footer's faint ink. The ghost numerals and
                # the cover's hairline are far lighter than this.
                x0, x1 = int(x0 * k), int(x1 * k)
                return any(min(s[y * w + x0:y * w + x1]) < 150
                           for y in range(int(y0 * k), int(y1 * k)))
            where = [name for name, box in (
                ("left margin", (0, 47, 20, 822)),
                ("right margin", (548, 595, 20, 822)),
                ("above the footer", (51, 544, 776, 792)),
            ) if inked(*box)]
            if where:
                bad.append(f"page {n}: ink in the {', '.join(where)}")
        pages = len(doc)
    for b in bad:
        warn(b)
    if not bad:
        print(f"  ✓ {pages} pages, nothing outside the text area")
    return not bad


def to_trash(path):
    """The PDF being replaced goes to the Trash, where it can be recovered."""
    if shutil.which("trash"):
        subprocess.run(["trash", str(path)], check=True, capture_output=True)
    else:
        stamp = datetime.datetime.now().strftime("%H.%M.%S")
        shutil.move(str(path), pathlib.Path.home() / ".Trash" / f"{path.stem} {stamp}{path.suffix}")
    print(f"  · the previous {path.name} is in the Trash")


def main():
    ap = argparse.ArgumentParser(description="Markdown to a PDF in the brand guide's design.")
    ap.add_argument("src", type=pathlib.Path, help="the .md file")
    ap.add_argument("dst", type=pathlib.Path, nargs="?",
                    help="the .pdf to write (default: beside the .md, same name)")
    ap.add_argument("--html", type=pathlib.Path, help="also keep the intermediate HTML, to debug")
    a = ap.parse_args()

    # `npm run` moves to the repo root; a relative path means where she typed it.
    here = pathlib.Path(os.environ.get("INIT_CWD", os.getcwd()))
    src = (here / a.src.expanduser()).resolve()
    dst = (here / a.dst.expanduser()).resolve() if a.dst else src.with_suffix(".pdf")
    if not src.is_file():
        sys.exit(f"md-to-pdf: no such file: {src}")
    if not os.path.exists(CHROME):
        sys.exit(f"md-to-pdf: Chrome not found at {CHROME} — set CHROME to its binary")

    doc, direction = build_html(src)
    with tempfile.TemporaryDirectory() as tmp:
        page, pdf = pathlib.Path(tmp) / "doc.html", pathlib.Path(tmp) / "doc.pdf"
        page.write_text(doc, encoding="utf-8")
        if a.html:
            (here / a.html).write_text(doc, encoding="utf-8")
        subprocess.run(
            [CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
             "--virtual-time-budget=10000", f"--print-to-pdf={pdf}", page.as_uri()],
            check=True, capture_output=True)
        if not pdf.exists() or pdf.stat().st_size == 0:
            sys.exit("md-to-pdf: Chrome wrote no PDF")
        clean = check(pdf)
        # Only once the new file exists does the old one leave.
        if dst.exists():
            to_trash(dst)
        shutil.move(str(pdf), dst)
    print(f"  ✓ {dst}  ({dst.stat().st_size:,} bytes, {direction})")
    sys.exit(0 if clean else 1)


if __name__ == "__main__":
    main()
