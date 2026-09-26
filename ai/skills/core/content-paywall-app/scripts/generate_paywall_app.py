#!/usr/bin/env python3
"""Generate a complete content-paywall mini app (LikeMeTryAI nanrenbao pattern).

Reads a site spec (JSON) and produces a full deployable content site directory
with points economy, paid-to-unlock content, ad-reward points, upload with URL
validation, and an admin panel.

Usage:
    python scripts/generate_paywall_app.py --spec spec.json --outdir ./
"""

import argparse
import json
import os
import re
import sys

BASE_TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "templates")

DEFAULT_API_BASE = "https://letmetry.cloud"
DEFAULTS = {
    "appName": None,  # derived from appId
    "category": "",
    "description": "",
    "apiBase": DEFAULT_API_BASE,
    "contentTable": None,  # derived
    "allowAd": True,
    "allowedDomains": [
        ".bcebos.com",
        ".myqcloud.com",
        ".byteimg.com",
        ".qpic.cn",
        ".klingai.com",
        "letmetry.cloud",
    ],
    "points": {
        "newUser": 20,
        "dailyVisit": 10,
        "upload": 10,
        "view": 1,
        "freeDays": 3,
        "adFull": 10,
        "adPartial": 3,
    },
    "tags": [],
}


def normalize_id(value):
    if not isinstance(value, str):
        return "content-app"
    result = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    if not result:
        return "content-app"
    return result


def load_spec(path):
    if not os.path.isfile(path):
        raise ValueError(f"spec file not found: {path}")
    with open(path, "r", encoding="utf-8") as fh:
        spec = json.load(fh)
    if not isinstance(spec, dict):
        raise ValueError("spec must be a JSON object")
    app_id = normalize_id(spec.get("appId"))
    if spec.get("appId") is not None and not isinstance(spec.get("appId"), str):
        app_id = "content-app"
    # treat empty appId as error
    if not spec.get("appId"):
        raise ValueError("spec field 'appId' is required")
    return spec, app_id


def merge_defaults(spec):
    merged = dict(DEFAULTS)
    merged.update(spec)
    merged["allowAd"] = bool(spec.get("allowAd", DEFAULTS["allowAd"]))
    merged["points"] = dict(DEFAULTS["points"])
    if isinstance(spec.get("points"), dict):
        merged["points"].update(spec["points"])
    merged["allowedDomains"] = spec.get("allowedDomains") or DEFAULTS["allowedDomains"]
    merged["tags"] = spec.get("tags") or []
    return merged


def allowed_domains_js(domains):
    return ",\n".join('        ' + json.dumps(d) for d in domains)


def ad_js(allow_ad):
    if not allow_ad:
        return ""
    return (
        "function watchAd() {\n"
        "    // 广告 SDK 接入点：实际项目替换为真实激励视频广告回调\n"
        "    var result = PointsSystem.awardAdPoints(true);\n"
        "    updatePoints();\n"
        "    showNotification('观看广告 +' + result.pointsAwarded + ' 积分，当前 ' + result.newTotal + ' 分');\n"
        "}"
    )


def ad_bar(allow_ad):
    if not allow_ad:
        return ""
    return (
        '<div id="adBar" class="ad-bar">\n'
        '        <button id="watchAdBtn" onclick="watchAd()">观看广告赚积分</button>\n'
        "    </div>"
    )


def build_tokens(spec, app_id):
    cfg = merge_defaults(spec)
    app_name = cfg.get("appName") or app_id
    content_table = cfg.get("contentTable") or (app_id.replace("-", "_") + "_content")
    return {
        "APP_ID": app_id,
        "APP_NAME": app_name,
        "CATEGORY": cfg.get("category", ""),
        "DESCRIPTION": cfg.get("description", ""),
        "API_BASE": cfg.get("apiBase"),
        "CONTENT_TABLE": content_table,
        "ALLOW_AD": "true" if cfg["allowAd"] else "false",
        "ALLOWED_DOMAINS_JS": allowed_domains_js(cfg["allowedDomains"]),
        "STORAGE_PREFIX": app_id.replace("-", "_"),
        "PV_NEW_USER": str(cfg["points"]["newUser"]),
        "PV_DAILY_VISIT": str(cfg["points"]["dailyVisit"]),
        "PV_UPLOAD": str(cfg["points"]["upload"]),
        "PV_VIEW": str(cfg["points"]["view"]),
        "PV_FREE_DAYS": str(cfg["points"]["freeDays"]),
        "PV_AD_FULL": str(cfg["points"]["adFull"]),
        "PV_AD_PARTIAL": str(cfg["points"]["adPartial"]),
        "AD_JS": ad_js(cfg["allowAd"]),
        "AD_BAR": ad_bar(cfg["allowAd"]),
        "TAGS_JSON": json.dumps(cfg["tags"], ensure_ascii=False),
    }


def render(template_text, tokens):
    for key, value in tokens.items():
        template_text = template_text.replace("{{" + key + "}}", str(value))
    return template_text


def read_template(name):
    path = os.path.join(BASE_TEMPLATE_DIR, name)
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


def build_files(tokens):
    return {
        "index.html": render(read_template("index.html.tpl"), tokens),
        "appreciate.html": render(read_template("appreciate.html.tpl"), tokens),
        "upload.html": render(read_template("upload.html.tpl"), tokens),
        "admin.html": render(read_template("admin.html.tpl"), tokens),
        "config.js": render(read_template("config.js.tpl"), tokens),
        "points-system.js": render(read_template("points-system.js.tpl"), tokens),
        "url-validator.js": render(read_template("url-validator.js.tpl"), tokens),
        "styles.css": render(read_template("styles.css.tpl"), tokens),
        "database-schema.sql": render(read_template("database-schema.sql.tpl"), tokens),
        "metadata.json": render(read_template("metadata.json.tpl"), tokens),
    }


def write_output(app_id, files, outdir):
    base = os.path.join(outdir, app_id)
    os.makedirs(base, exist_ok=True)
    written = []
    for rel_path, content in files.items():
        target = os.path.join(base, rel_path)
        with open(target, "w", encoding="utf-8") as fh:
            fh.write(content)
        written.append(rel_path)
    return base, written


def main():
    parser = argparse.ArgumentParser(description="Generate a content-paywall mini app.")
    parser.add_argument("--spec", required=True, help="Path to the site spec JSON file")
    parser.add_argument("--outdir", default=".", help="Output dir; files go to <outdir>/<appId>/")
    args = parser.parse_args()

    try:
        spec, app_id = load_spec(args.spec)
        tokens = build_tokens(spec, app_id)
        files = build_files(tokens)

        # placeholder check
        leftover = []
        for rel, content in files.items():
            found = re.findall(r"\{\{[A-Z0-9_]+\}\}", content)
            for f in found:
                if f not in ("{{ALLOW_AD}}",):
                    leftover.append((rel, f))
        if leftover:
            raise ValueError("unresolved placeholders: " + json.dumps(sorted(set(leftover)), ensure_ascii=False))

        base, written = write_output(app_id, files, args.outdir)
        metadata = json.loads(files["metadata.json"])
        result = {
            "status": "success",
            "appId": app_id,
            "outputDir": os.path.abspath(base),
            "files": written,
            "metadata": metadata,
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except (ValueError, OSError) as exc:
        print(json.dumps({"status": "error", "message": str(exc)}, ensure_ascii=False, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()