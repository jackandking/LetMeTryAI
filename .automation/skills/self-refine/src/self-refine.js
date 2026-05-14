/**
 * Self-Refine: Iterative Refinement with Self-Feedback
 *
 * Adapted from https://github.com/madaan/self-refine
 * Core loop: Generate -> Feedback -> Iterate -> Repeat until feedback is clean.
 *
 * Usage:
 *   const refiner = new SelfRefine({ maxAttempts: 5 });
 *   const result = await refiner.refine({
 *       initPrompt: (ctx) => `Generate a book description for ${ctx.title}...`,
 *       feedbackPrompt: (output, ctx) => `Review this description:\n${output}\nList issues:`,
 *       iteratePrompt: (output, feedback, ctx) => `Improve this:\n${output}\nFeedback:\n${feedback}`,
 *       context: { title: '大卫不可以' }
 *   });
 *   console.log(result.output);      // final refined output
 *   console.log(result.history);     // full iteration log
 */

import { sendChatMessage } from '../../../util/ai_utils.js';

export class SelfRefine {
    /**
     * @param {Object} options
     * @param {number} options.maxAttempts - Max feedback-iterate cycles (default: 5)
     * @param {Function} options.stopCondition - (feedback) => boolean, returns true to stop
     * @param {Function} options.callAI - Override AI caller (default: sendChatMessage)
     */
    constructor(options = {}) {
        this.maxAttempts = options.maxAttempts || 5;
        this.stopCondition = options.stopCondition || defaultStopCondition;
        this.callAI = options.callAI || defaultCallAI;
    }

    /**
     * Run the full self-refine loop.
     *
     * @param {Object} params
     * @param {Function} params.initPrompt - (context) => string, generates initial output
     * @param {Function} params.feedbackPrompt - (output, context) => string, generates feedback
     * @param {Function} params.iteratePrompt - (output, feedback, context) => string, improves output
     * @param {*} params.context - Arbitrary data passed to all prompt functions
     * @returns {Promise<{output: string, history: Array}>}
     */
    async refine({ initPrompt, feedbackPrompt, iteratePrompt, context = {} }) {
        const history = [];

        // Step 1: Initialize
        const initQuery = typeof initPrompt === 'function'
            ? initPrompt(context)
            : initPrompt;
        let output = await this.callAI(initQuery);
        history.push({ step: 'init', prompt: initQuery, output });

        // Step 2: Feedback -> Iterate loop
        for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
            const fbQuery = typeof feedbackPrompt === 'function'
                ? feedbackPrompt(output, context)
                : feedbackPrompt.replace(/\{output\}/g, output);
            const feedback = await this.callAI(fbQuery);
            history.push({ step: `feedback_${attempt}`, prompt: fbQuery, output: feedback });

            if (this.stopCondition(feedback)) {
                break;
            }

            const iterQuery = typeof iteratePrompt === 'function'
                ? iteratePrompt(output, feedback, context)
                : iteratePrompt
                    .replace(/\{output\}/g, output)
                    .replace(/\{feedback\}/g, feedback);
            output = await this.callAI(iterQuery);
            history.push({ step: `iterate_${attempt}`, prompt: iterQuery, output });
        }

        return { output, history };
    }

    /**
     * One-shot refinement: generate feedback and improve in one pass.
     * Useful when you only need a single round of polish.
     */
    async polish({ initPrompt, feedbackPrompt, iteratePrompt, context = {} }) {
        return this.refine({
            initPrompt,
            feedbackPrompt,
            iteratePrompt,
            context,
            maxAttempts: 1
        });
    }
}

/**
 * Default AI caller using project's ai_utils.js
 */
async function defaultCallAI(prompt) {
    const result = await sendChatMessage(prompt);
    return result.response || result;
}

/**
 * Default stop condition: stop if feedback says "none" or "无问题" or is empty.
 */
function defaultStopCondition(feedback) {
    if (!feedback || typeof feedback !== 'string') return true;
    const lower = feedback.trim().toLowerCase();
    return lower === 'none'
        || lower === '无问题'
        || lower === 'no issues'
        || lower === '完美'
        || lower === '';
}

/**
 * Build a few-shot prompt from examples array.
 *
 * @param {Array<{input: string, output: string}>} examples
 * @param {string} template - Template string with {input} and {output} placeholders
 * @param {string} separator - Separator between examples (default: '\n\n###\n\n')
 * @returns {string}
 */
export function buildFewShotPrompt(examples, template, separator = '\n\n###\n\n') {
    return examples.map(ex =>
        template.replace(/\{input\}/g, ex.input).replace(/\{output\}/g, ex.output)
    ).join(separator) + separator;
}

/**
 * Load examples from a JSONL file (Node.js environment).
 *
 * @param {string} filePath - Path to .jsonl file
 * @returns {Array<Object>}
 */
export function loadJsonlExamples(filePath) {
    const fs = await import('fs');
    const text = fs.readFileSync(filePath, 'utf-8');
    return text.trim().split('\n').map(line => JSON.parse(line));
}

export default SelfRefine;
