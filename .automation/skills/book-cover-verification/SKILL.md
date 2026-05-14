---
name: book-cover-verification
description: Ensure book cover images for reading-list/book-recommend pages are correct before deployment. Covers search, download, visual verification, and deployment workflow. Use whenever adding or updating book covers in parent-tools or any book-recommend section.
---

# Book Cover Verification

Prevent the "right URL, wrong book" disaster. All book covers must be searched, downloaded, visually verified, and deployed as local assets.

## Trigger

Use this skill when:
- Creating a new book-recommend / reading-list page
- Adding new books to an existing list
- Replacing incorrect or broken cover images
- Any task involving `parent-tools/book-recommend/` or similar directories

## The Disaster (Why This Skill Exists)

**Date**: 2026-05-10
**Mistake**: Copied Douban image URLs (`img*.doubanio.com/view/subject/s/public/s*.jpg`) by hand.
**Root cause**: The `s*` ID in the URL did not match the actual book. 8 out of 9 covers were wrong.
**Lesson**: URL format correctness != content correctness. Visual verification is non-negotiable.

## Mandatory Workflow

```
Step 1: Search   → Call API to get candidate image URLs
Step 2: Download → Save to local temp directory
Step 3: Verify   → Use ReadMediaFile to visually confirm correct book
Step 4: Deploy   → Copy to images/ directory, update HTML, git push
```

### Step 1: Search via API

```bash
curl -sX POST "https://letmetry.cloud/image/search" \
  -H "Content-Type: application/json" \
  -d '{"keyword":"书名 封面","count":3}'
```

Tips for better results:
- Add `绘本` for children's books
- Add `封面` to the keyword
- Take the first 1-2 results as candidates

### Step 2: Download

```bash
mkdir -p /tmp/book-covers
curl -sL -o /tmp/book-covers/{filename}.jpg "{image_url}"
```

Validate file integrity:
```bash
file /tmp/book-covers/*.jpg
# Must show "JPEG image data"
```

### Step 3: Visual Verification (BLOCKING)

**This step is MANDATORY. Do not skip.**

Use `ReadMediaFile` to open every downloaded cover. Confirm:
- [ ] Book title matches the intended book
- [ ] Author/publisher visible and correct
- [ ] Cover is clear, not blurry or watermarked beyond usability
- [ ] Not a counterfeit/bootleg edition
- [ ] Aspect ratio is reasonable (not stretched or squashed)

**If any check fails**: Discard the image, go back to Step 1 with a refined keyword.

### Step 4: Deploy

```bash
# Copy verified covers to project directory
cp /tmp/book-covers/{name}.jpg \
   /Users/weiping/LetMeTryAI/parent-tools/book-recommend/images/

# Ensure HTML references local relative path
# <img src="../images/{name}.jpg" alt="{book title}" class="book-cover">
```

Then:
```bash
cd /Users/weiping/LetMeTryAI
git add parent-tools/book-recommend/images/
git commit -m "fix/feat(book-covers): add verified covers for {list name}"
git push origin main
cd /Users/weiping/prod/LetMeTryAI && git pull --ff-only
```

## Hard Rules

1. **NEVER** use third-party hotlink URLs (Douban, JD, Dangdang) directly in HTML `src`.
2. **NEVER** copy an image URL without downloading and verifying it first.
3. **NEVER** push a book list page without verifying every single cover image.
4. **ALWAYS** keep covers as local files in `images/` directory.
5. **ALWAYS** verify with `ReadMediaFile` before considering the task done.

## Naming Convention

```
{kebab-case-short-name}.jpg

Examples:
- 大卫，不可以        → david-no.jpg
- 神奇校车           → magic-school-bus.jpg
- 小猪唏哩呼噜        → xiaozhu-xilihulu.jpg
- 猜猜我有多爱你      → guess-how-much.jpg
- 不一样的卡梅拉      → camilla.jpg
- 蝴蝶·豌豆花        → butterfly-pea.jpg
- 昆虫记             → insects.jpg
- 窗边的小豆豆        → totto-chan.jpg
- 草房子             → caofangzi.jpg
```

## Verification Checklist Template

Before marking "done", paste this checklist and check every box:

```markdown
## Cover Verification for {list name}

| # | Book Title | File | Verified |
|---|------------|------|----------|
| 1 |            |      | [ ]      |
| 2 |            |      | [ ]      |
| 3 |            |      | [ ]      |
```

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| SSL error when downloading | Python urllib cert validation | Use `curl -sL` instead |
| API returns irrelevant images | Keyword too vague | Add `封面` or `绘本` to keyword |
| Image too small | Baidu thumbnail parameter | URL already cleaned by API; try next result |
| File shows "corrupt" | Incomplete download | Re-run curl, check network |

## Related

- `ai-image-generator` skill — for generating custom illustrations (not for real book covers)
- `voting-app-scaffold` skill — for building the list page structure
- `idea-to-launch` skill — for end-to-end list creation workflow
