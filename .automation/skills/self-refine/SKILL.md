---
name: self-refine
description: Iterative output refinement using self-feedback loops. Use when a single-pass AI generation is insufficient and the output needs structured critique and improvement (code, text, prompts, descriptions, etc.).
---

# Self-Refine

Iterative refinement framework: generate an output, critique it with feedback, improve based on the feedback, and repeat until the feedback is clean.

Adapted from [Madaan et al., 2023](https://arxiv.org/abs/2303.17651).

## When To Use

Use this skill when:
- A single AI call produces output that is "okay but not great"
- The output needs multi-aspect quality checking (e.g., accuracy, style, completeness)
- You have a well-defined quality criterion that can be expressed as feedback
- You want to automate the "write -> review -> rewrite" loop

### Concrete Use Cases in This Project

- **Book description polish**: Generate a book blurb, critique it for appeal/clarity/age-appropriateness, rewrite.
- **Vote app option labels**: Generate option text, check for neutrality and engagement, refine.
- **Prompt engineering**: Generate a prompt for image generation, critique it for detail/specificity, improve.
- **Code refactoring**: Generate code, check readability/comments/variable names, refactor.
- **Marketing copy**: Generate ad copy, check for brand voice and CTA strength, rewrite.

## When NOT To Use

- Simple tasks where a single AI call is sufficient (overkill)
- Real-time/high-latency scenarios (each iteration = 1 API call)
- Tasks without clear quality criteria (feedback will be vague)
- Tasks where the project already has a specialized refiner skill (e.g., `vote-app-refiner` for full HTML/CSS/JS refactoring)

## Core Loop

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Init      │────▶│  Feedback   │────▶│  Iterate    │
│  (Generate) │     │  (Critique) │     │  (Improve)  │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                     │
                           └─────────────────────┘
                           Feedback says "none"? Stop.
```

Each task needs **three prompts**:

1. **Init prompt**: Generates the initial output.
2. **Feedback prompt**: Reviews the output and lists specific issues.
3. **Iterate prompt**: Takes the output + feedback, produces an improved version.

## Quick Start

```javascript
import { SelfRefine } from './self-refine.js';

const refiner = new SelfRefine({ maxAttempts: 3 });

const result = await refiner.refine({
    initPrompt: (ctx) => `Write a 50-word book description for "${ctx.title}" aimed at ${ctx.audience}.`,

    feedbackPrompt: (output, ctx) =>
        `Review this book description:\n"""\n${output}\n"""\n` +
        `Check for: 1) Accuracy about the book, 2) Appeal to ${ctx.audience}, 3) Clarity.\n` +
        `List issues concisely. If perfect, respond "NONE".`,

    iteratePrompt: (output, feedback, ctx) =>
        `Original description:\n"""\n${output}\n"""\n` +
        `Feedback:\n"""\n${feedback}\n"""\n` +
        `Rewrite the description addressing all feedback.`,

    context: { title: '窗边的小豆豆', audience: '8-year-old children' }
});

console.log(result.output);
// result.history shows every step for debugging
```

## API

### `new SelfRefine(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxAttempts` | number | 5 | Max feedback-iterate cycles |
| `stopCondition` | function | `(fb) => fb.toLowerCase() === 'none'` | Returns `true` to stop iterating |
| `callAI` | function | `sendChatMessage` | Override the AI caller |

### `refine({ initPrompt, feedbackPrompt, iteratePrompt, context })`

Runs the full loop. Returns `{ output, history }`.

- `initPrompt`: `(context) => string` or `string`
- `feedbackPrompt`: `(output, context) => string` or `string` (use `{output}` placeholder)
- `iteratePrompt`: `(output, feedback, context) => string` or `string` (use `{output}` and `{feedback}`)
- `context`: Any data passed to all prompt functions

### `polish({ ... })`

Shorthand for `refine` with `maxAttempts: 1`. Single-round review + rewrite.

### `buildFewShotPrompt(examples, template, separator)`

Helper to build few-shot prompts from example arrays.

```javascript
import { buildFewShotPrompt } from './self-refine.js';

const prompt = buildFewShotPrompt([
    { input: 'concepts: dog, park, run', output: 'A dog runs in the park.' },
    { input: 'concepts: cat, sleep, sun', output: 'A cat sleeps in the sun.' }
], 'Concepts: {input}\nSentence: {output}');
```

## Prompt Design Tips

### 1. Feedback must be actionable

Bad:
```
Feedback: It's not good.
```

Good:
```
Feedback: The description mentions the wrong author. It says "Smith" but the author is "Jones".
```

### 2. Use "NONE" as the stop signal

Train the feedback prompt to output `NONE` (or `无问题`) when no issues exist. The default stop condition checks for this.

### 3. Keep iterate prompt self-contained

The iterate prompt should include:
- The original output
- The feedback
- Clear instructions on what to produce

Do not rely on the model remembering previous turns; include everything in the prompt.

### 4. Limit maxAttempts

Each attempt = 2 API calls (feedback + iterate). Cap at 3-5 to control cost and latency.

## Reference Prompts

The `prompts/` directory contains few-shot examples from the original paper:

| Task | Init | Feedback | Iterate |
|------|------|----------|---------|
| `acronym/` | Generate acronym from title | Score pronunciation, spelling, relation | Improve based on scores |
| `commongen/` | Sentence from concept set | Missing concepts + commonsense check | Rewrite using feedback |
| `gsm/` | Math problem solution | Step-by-step correctness check | Fix errors |
| `responsegen/` | Dialogue response | Fluency, relevance, engagement | Rewrite |
| `pie/` | Python program | Runtime/efficiency/readability | Optimize code |

Use these as templates for designing your own task-specific prompts.

## Comparison with Existing Skills

| Skill | Mechanism | Use When |
|-------|-----------|----------|
| `self-refine` | Generate → Feedback → Iterate loop | Single output needs iterative polish |
| `self-improvement` | Log analysis → Rule extraction → Batch fix | System-level workflow optimization |
| `vote-app-refiner` | Copilot CLI + gpt-5-mini full rewrite | Complete HTML/CSS/JS refactoring |
| `vote-app-image-gen` | One-shot AI image generation | Option illustrations |

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Loops forever | Stop condition too strict | Loosen `stopCondition` or reduce `maxAttempts` |
| Feedback is vague | Feedback prompt not specific enough | Add explicit criteria checklist |
| Output gets worse | Iterate prompt not self-contained | Include original + feedback in iterate prompt |
| Too slow | Too many iterations | Reduce `maxAttempts` to 2-3 |
| Cost too high | Each iteration = 2 API calls | Use `polish()` for single-round only |

## Files

```
.automation/skills/self-refine/
├── src/
│   ├── self-refine.js      # JS framework (this project)
│   └── utils.py            # Original Python reference
├── prompts/
│   ├── acronym/            # Few-shot examples
│   ├── commongen/
│   ├── gsm/
│   ├── pie/
│   └── responsegen/
├── docs/
│   └── paper.pdf           # Original paper (arXiv)
└── SKILL.md                # This file
```

## Citation

```bibtex
@misc{madaan2023selfrefine,
  title={Self-Refine: Iterative Refinement with Self-Feedback},
  author={Madaan, Aman and Tandon, Niket and Gupta, Prakhar and Hallinan, Skyler and Gao, Luyu and Wiegreffe, Sarah and Alon, Uri and Dziri, Nouha and Prabhumoye, Shrimai and Yang, Yiming and Welleck, Sean and Majumder, Bodhisattwa Prasad and Gupta, Shashank and Yazdanbakhsh, Amir and Clark, Peter},
  year={2023},
  eprint={2303.17651},
  archivePrefix={arXiv},
  primaryClass={cs.CL}
}
```
