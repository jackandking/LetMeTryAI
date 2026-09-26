#!/usr/bin/env python3
"""Generate a complete LetMeTryAI voting topic page directory.

Reads a topic spec (JSON), renders the index.html / app.js / styles.css /
metadata.json and per-option SVG images from the bundled templates, and writes
them into an output directory following the LetMeTryAI repository convention.

Usage:
    python scripts/generate_vote_page.py --spec spec.json --outdir ./
    python scripts/generate_vote_page.py --spec spec.json --outdir /path/to/LetMeTryAI
"""

import argparse
import json
import os
import re
import sys

# ---------- constants ----------

BASE_TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "templates")
DEFAULT_EVENT_ENDPOINT = "https://letmetry.cloud/api/track"
DEFAULT_BAIDU_HM_ID = "4ec6d2ddfd5746ce248a74a75c1d4fba"

# category -> (primary, primary_dark, secondary, accent, bg, border, shadow)
THEME_PALETTES = {
    "科技": ("#2c5aa0", "#1e4a80", "#4a7ab8", "#3a6aa8", "#e8f0f8", "#c8d8e8", "rgba(44, 90, 160, 0.15)"),
    "美妆": ("#c2185b", "#8e1444", "#e05a8a", "#d83973", "#fce8f0", "#f0c0d4", "rgba(194, 24, 91, 0.15)"),
    "时尚": ("#7b1fa2", "#4a1166", "#aa6bc9", "#8e2fb5", "#f4e8fa", "#e0c8ee", "rgba(123, 31, 162, 0.15)"),
    "娱乐": ("#6a3fa0", "#4a2b70", "#8f6cc0", "#7a4fb0", "#f0eaf8", "#d8ccf0", "rgba(106, 63, 160, 0.15)"),
    "美食": ("#e07b39", "#b05a26", "#f0a05e", "#e88a4a", "#fdf0e6", "#f0d8c0", "rgba(224, 123, 57, 0.15)"),
    "体育": ("#1e7d3a", "#145a28", "#46a05e", "#2e8a48", "#e8f4ec", "#c8e0d0", "rgba(30, 125, 58, 0.15)"),
    "生活": ("#0f7b8c", "#0a5a66", "#46a0ae", "#1e8a99", "#e6f4f6", "#c0e0e6", "rgba(15, 123, 140, 0.15)"),
    "默认": ("#2c5aa0", "#1e4a80", "#4a7ab8", "#3a6aa8", "#eef2f7", "#ccd6e4", "rgba(44, 90, 160, 0.15)"),
}


def normalize_id(value):
    """Turn arbitrary text into a storage-safe lowercase id fragment."""
    if not isinstance(value, str):
        return "option"
    result = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    return result or "option"


def normalize_label(value):
    """Turn an option label into a short SVG-safe text (max ~6 chars)."""
    if not isinstance(value, str):
        return "选项"
    return value.strip()[:6] or "选项"


def load_spec(path):
    """Load and validate the topic spec JSON file."""
    if not os.path.isfile(path):
        raise ValueError(f"spec file not found: {path}")
    with open(path, "r", encoding="utf-8") as fh:
        spec = json.load(fh)

    if not isinstance(spec, dict):
        raise ValueError("spec must be a JSON object")

    for key in ("title", "question"):
        if not spec.get(key):
            raise ValueError(f"spec field '{key}' is required")

    options = spec.get("options")
    if not isinstance(options, list) or not options:
        raise ValueError("spec field 'options' must be a non-empty array")

    for i, opt in enumerate(options):
        if not isinstance(opt, dict) or not opt.get("label"):
            raise ValueError(f"options[{i}] must be an object with a 'label'")

    return spec


def derive_app_id(spec):
    """Derive appId from explicit value, else from title. Returns kebab-case."""
    explicit = spec.get("appId")
    if isinstance(explicit, str) and explicit.strip():
        return normalize_id(explicit)
    return normalize_id(spec.get("title", "new-app"))


def resolve_theme(spec):
    """Return (theme_name, palette) for a category."""
    category = spec.get("category", "")
    for key, palette in THEME_PALETTES.items():
        if key != "默认" and category and key in category:
            return key, palette
    return "默认", THEME_PALETTES["默认"]


def render(template_text, tokens):
    """Replace {{TOKEN}} placeholders. Tokens is a dict; required ones must exist."""
    for key, value in tokens.items():
        template_text = template_text.replace("{{" + key + "}}", str(value))
    return template_text


def build_options_markup(options, input_name):
    """Render repeated <label class="option"> blocks for index.html."""
    blocks = []
    for opt in options:
        value = normalize_id(opt.get("value") or opt["label"])
        blocks.append(
            "                <label class=\"option\">\n"
            f"                    <input type=\"radio\" name=\"{input_name}\" value=\"{value}\">\n"
            f"                    <img src=\"images/{value}.svg\" alt=\"{opt['label']}\" loading=\"lazy\">\n"
            f"                    <span>{opt['label']}</span>\n"
            "                </label>"
        )
    return "\n".join(blocks)


def build_options_js(options):
    """Render the options array body for app.js questionConfig."""
    lines = []
    for opt in options:
        value = normalize_id(opt.get("value") or opt["label"])
        label = opt["label"].replace("\\", "\\\\").replace("'", "\\'")
        lines.append(f"        {{ value: '{value}', label: '{label}' }}")
    return ",\n".join(lines)


def build_svg(option, index, palette):
    """Render one option SVG image file content."""
    value = normalize_id(option.get("value") or option["label"])
    grad1 = option.get("grad1") or palette[0]
    grad2 = option.get("grad2") or palette[1]
    label_text = normalize_label(option.get("svgText") or option["label"])
    tokens = {
        "ID": str(index + 1) + re.sub(r"[^a-z0-9A-Z]", "", value),
        "GRAD1": grad1,
        "GRAD2": grad2,
        "LABEL": label_text,
    }
    with open(os.path.join(BASE_TEMPLATE_DIR, "option.svg.tpl"), "r", encoding="utf-8") as fh:
        return render(fh.read(), tokens)


def render_all(spec):
    """Render all page files and return a dict of relative path -> content."""
    app_id = derive_app_id(spec)
    title = spec["title"]
    question = spec["question"]
    category = spec.get("category", "")
    options = spec["options"]
    input_name = spec.get("inputName") or app_id
    storage_key = app_id.replace("-", "_") + "_v1.data"
    theme_name, palette = resolve_theme(spec)

    option_paths = {}
    for opt in options:
        value = normalize_id(opt.get("value") or opt["label"])
        option_paths[f"images/{value}.svg"] = build_svg(opt, options.index(opt), palette)

    # index.html
    html_tokens = {
        "TITLE": title,
        "QUESTION": question,
        "OPTIONS_MARKUP": build_options_markup(options, input_name),
        "RESULT_BTN_TEXT": spec.get("resultBtnText") or "查看实时票选结果",
        "BAIDU_HM_ID": spec.get("baiduHmId") or DEFAULT_BAIDU_HM_ID,
    }
    with open(os.path.join(BASE_TEMPLATE_DIR, "index.html.tpl"), "r", encoding="utf-8") as fh:
        index_html = render(fh.read(), html_tokens)

    # app.js
    js_tokens = {
        "TITLE": title,
        "QUESTION": question,
        "OPTIONS_JS": build_options_js(options),
        "STORAGE_KEY": storage_key,
        "INPUT_NAME": input_name,
        "APP_ID": app_id,
        "EVENT_ENDPOINT": spec.get("eventEndpoint") or DEFAULT_EVENT_ENDPOINT,
        "AD_LOADING_TEXT": spec.get("adLoadingText") or f"正在分析“{title}”的投票趋势...",
        "RESULT_HEADING": spec.get("resultHeading") or f"{title}投票结果",
        "RESULT_SUBTITLE": spec.get("resultSubtitle") or f"看看大家对“{title}”的最新态度",
    }
    with open(os.path.join(BASE_TEMPLATE_DIR, "app.js.tpl"), "r", encoding="utf-8") as fh:
        app_js = render(fh.read(), js_tokens)

    # styles.css
    bg, bg2 = palette[4], None
    # compute a slightly deeper bg gradient color
    import colorsys
    try:
        hx = palette[4].lstrip("#")
        r, g, b = (int(hx[i:i+2], 16) for i in (0, 2, 4))
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        d = 0.88 if l > 0.75 else l - 0.03
        r2, g2, b2 = colorsys.hls_to_rgb(h, max(0.0, d), s)
        bg2 = "#{:02x}{:02x}{:02x}".format(int(r2 * 255), int(g2 * 255), int(b2 * 255))
    except Exception:
        bg2 = palette[4]

    css_tokens = {
        "THEME_NAME": theme_name,
        "C_PRIMARY": palette[0],
        "C_PRIMARY_DARK": palette[1],
        "C_SECONDARY": palette[2],
        "C_ACCENT": palette[3],
        "C_BG": palette[4],
        "C_BG2": bg2,
        "C_BORDER": palette[5],
        "C_SHADOW": palette[6],
        "C_HOVER1": "rgba(44, 90, 160, 0.05)",
        "C_HOVER2": "rgba(74, 122, 184, 0.05)",
    }
    with open(os.path.join(BASE_TEMPLATE_DIR, "styles.css.tpl"), "r", encoding="utf-8") as fh:
        styles_css = render(fh.read(), css_tokens)

    # metadata.json
    metadata = {
        "id": app_id,
        "name": spec.get("name") or title,
        "description": spec.get("description") or f"关于“{title}”的投票话题",
        "category": category,
        "directory": app_id,
        "url": app_id,
        "image": f"{app_id}/{list(option_paths.keys())[0]}",
        "tags": spec.get("tags", []),
        "featured": bool(spec.get("featured", False)),
        "status": "active",
    }

    files = {
        "index.html": index_html,
        "app.js": app_js,
        "styles.css": styles_css,
        "metadata.json": json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
    }
    files.update(option_paths)
    return app_id, files, metadata


def write_output(app_id, files, outdir):
    """Write rendered files into <outdir>/<app_id>/."""
    base = os.path.join(outdir, app_id)
    os.makedirs(base, exist_ok=True)
    os.makedirs(os.path.join(base, "images"), exist_ok=True)

    written = []
    for rel_path, content in files.items():
        target = os.path.join(base, rel_path)
        with open(target, "w", encoding="utf-8") as fh:
            fh.write(content)
        written.append(rel_path)
    return base, written


def main():
    parser = argparse.ArgumentParser(description="Generate a LetMeTryAI voting topic page.")
    parser.add_argument("--spec", required=True, help="Path to the topic spec JSON file")
    parser.add_argument("--outdir", default=".", help="Output directory (the file is written to <outdir>/<appId>/), default '.'")
    args = parser.parse_args()

    try:
        spec = load_spec(args.spec)
        app_id, files, metadata = render_all(spec)
        base, written = write_output(app_id, files, args.outdir)

        result = {
            "status": "success",
            "appId": app_id,
            "outputDir": os.path.abspath(base),
            "relativeBase": os.path.join(args.outdir, app_id),
            "files": written,
            "metadata": metadata,
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except (ValueError, OSError) as exc:
        result = {"status": "error", "message": str(exc)}
        print(json.dumps(result, ensure_ascii=False, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()