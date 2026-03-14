---
name: brand-profiles
description: Centralize audience strategy for LetMeTryAI mini-programs such as 男人宝、女人爱、爱老人、家长爱. Use when topic selection or prompting should differ by brand.
---

# Brand Profiles

Audience strategy profiles for LetMeTryAI products.

## Purpose

This skill keeps product strategy in data instead of scattering it across prompts or scripts.

Each profile defines:

- preferred categories
- preferred formats
- positive signals
- avoid signals
- hard blocks
- title and question patterns
- asset hints for downstream app generation

## Included Profiles

- `nanrenbao`
- `womanai`
- `elder-love`
- `parent-tools`

## Quick Start

```javascript
import { getBrandProfile, listBrandProfiles } from './scripts/profile-loader.js';

console.log(listBrandProfiles());

const profile = getBrandProfile('elder-love');
console.log(profile.preferredCategories);
```

## Recommended Usage

1. Load the profile by app or brand id.
2. Pass it into `topic-selector`.
3. Feed the winning brief into `voting-app-scaffold` or another app builder.
4. Reuse the same profile for prompt tone, title generation, and asset sourcing.

## Design Rules

1. Keep profiles declarative.
2. Do not embed scraping or publishing logic here.
3. Use `hardBlocks` for categories that should be rejected outright.
4. Prefer additive profile updates over branching selector logic.
