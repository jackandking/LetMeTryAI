# WomanAI Automation Architecture

`womanai/.automation/` is a local automation workspace for the WomanAI image-growth loop.

## Layout

- `config/womanai-image-gen.config.json` stores API endpoints, prompt foundations, manual tag mappings, and direction templates.
- `scripts/runtime-paths.js` centralizes runtime paths under `.automation/.local/`.
- `scripts/generate-womanai-images.js` reads popular images, scores directions, calls MiniMax, and stores pending review candidates.
- `scripts/list-generated-images.js` lists pending or reviewed candidates.
- `scripts/approve-generated-image.js` approves or rejects a candidate and inserts approved image URLs into `handsome_images`.
- `.local/` stores logs, exports, tmp files, and downloaded/generated artifacts.

## Popularity loop

1. Read `handsome_images` ordered by `view_count DESC`.
2. Apply manual positive tags to the hot sample.
3. Score configured direction templates against those tagged hot images.
4. Build prompts from the highest-scoring directions.
5. Generate candidate images with MiniMax.
6. Save candidates into `womanai_generated_images` with `pending_review` status.
7. Approve candidates into `handsome_images` so they can collect future `view_count`.
8. If the same image URL already exists in a logically deleted row, approval reactivates that row instead of leaving the image invisible.

## First-run workflow

1. Update `manualImageTags` in `config/womanai-image-gen.config.json` with real image ids or URL match rules from current hot images.
2. Run a dry run:
   - `node womanai/.automation/scripts/generate-womanai-images.js --dry-run`
3. Inspect the exported summary in `womanai/.automation/.local/exports/`.
4. Run a real generation after the summary looks right:
   - `MINIMAX_API_KEY=... node womanai/.automation/scripts/generate-womanai-images.js`
5. Review candidates:
   - `node womanai/.automation/scripts/list-generated-images.js`
6. Approve or reject:
   - `node womanai/.automation/scripts/approve-generated-image.js --id 12 --action approve`
   - `node womanai/.automation/scripts/approve-generated-image.js --id 13 --action reject --note "Style drift"`
