---
name: vote-app-refiner
description: Refactor vote app HTML/CSS/JS using Copilot CLI + gpt-5-mini model. Transforms old template to new card-based design with brand-specific themes.
---

# Vote App Refiner

Refactor a vote app from the old fighter-jets template to the new card-based design.

## Usage

```javascript
import { refineVoteApp } from './vote-app-refiner/index.js';

await refineVoteApp({
  appDirectory: 'fighter-jets',
  brandProfile: 'nanrenbao',
  referenceApp: 'spring-whitening-lipstick'
});
```

## CLI Usage

```bash
./.agents/skills/vote-app-refiner/refine.sh fighter-jets nanrenbao
```

## Inputs

| Parameter | Type | Description |
|-----------|------|-------------|
| appDirectory | string | Path to app directory (e.g., 'fighter-jets') |
| brandProfile | string | Brand ID: nanrenbao, parent-tools, elder-love, womanai |
| referenceApp | string | Reference app for layout pattern (default: spring-whitening-lipstick) |

## Process

1. **Analyze Original App**
   - Read index.html to extract: title, question, options
   - Read app.js to extract: questionConfig
   - Identify brand from radio button name

2. **Generate Refactored Files**
   Use Copilot CLI with gpt-5-mini to refactor:
   
   a) index.html
   ```bash
   copilot -m gpt-5-mini "Refactor index.html for $app using card layout from $referenceApp. 
     Keep original title: '$title', question: '$question', options: $options.
     Use brand theme: $brandProfile. Output complete HTML file."
   ```
   
   b) styles.css
   ```bash
   copilot -m gpt-5-mini "Create styles.css for $app using $brandProfile theme colors.
     Reference: $referenceApp/styles.css. 
     Brand colors: $themeColors. Output complete CSS file."
   ```
   
   c) app.js
   ```bash
   copilot -m gpt-5-mini "Refactor app.js for $app. Fix: change jet-label to option-label,
     improve code structure, keep questionConfig data. Output complete JS file."
   ```

3. **Apply Changes**
   - Write refactored files to app directory
   - Preserve backup in .refine-backup/

4. **Validate**
   - Check syntax validity
   - Verify all placeholders replaced

## Brand Themes

### nanrenbao (Sport Blue)
- Primary: #2c5aa0
- CSS Template: scripts/templates/sport-blue/styles.css
- JS Template: scripts/templates/sport-blue/app.js

### parent-tools (Edu Blue)
- Primary: #4a90d9
- CSS Template: scripts/templates/edu-blue/styles.css
- JS Template: scripts/templates/edu-blue/app.js

### elder-love (Warm Gold)
- Primary: #8b6914
- CSS Template: scripts/templates/warm-gold/styles.css
- JS Template: scripts/templates/warm-gold/app.js

### womanai (Coral Pink)
- Primary: #ff6b8a
- CSS Template: scripts/templates/coral-pink/styles.css
- JS Template: scripts/templates/coral-pink/app.js

## Output

Refactored app with:
- ✓ Card-based option layout (options-grid)
- ✓ CSS variables for theming
- ✓ Fixed class names (option-label not jet-label)
- ✓ Semantic HTML structure
- ✓ Responsive design
- ✓ Animation effects

## Error Handling

- If Copilot fails, falls back to template copy
- Validates output before writing
- Preserves original files as backup
