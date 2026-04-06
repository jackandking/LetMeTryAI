# WomanAI Image Review Flow

## Candidate table

Generated images land in `womanai_generated_images`.

Important fields:

- `direction_key`
- `direction_label`
- `prompt_text`
- `image_url`
- `provider`
- `provider_image_id`
- `source_image_ids`
- `source_view_count_sum`
- `status`
- `review_note`
- `approved_image_id`

## Review decisions

### Approve

`approve-generated-image.js --action approve`

- checks whether the generated `image_url` is already in `handsome_images`
- reactivates the existing row when the same image URL was previously soft-deleted
- inserts it when it is new
- updates the candidate row to `approved`
- stores the linked `approved_image_id`

### Reject

`approve-generated-image.js --action reject`

- keeps the candidate in `womanai_generated_images`
- marks it as `rejected`
- saves the optional review note for later prompt tuning

## Operator checklist

Before approving, verify:

- the candidate still fits current customer taste signals
- the generated image matches the direction label and prompt
- the image does not duplicate an existing asset
- the image is worth adding back into the popularity loop
