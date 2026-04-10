---
name: self-improvement
description: Self-improving workflow for LetMeTryAI automation system. Use when analyzing task execution patterns, identifying failure modes, optimizing workflow performance, or updating skills based on usage feedback. Triggers on task failures, performance degradation, or explicit improvement requests.
---

# Self-Improvement Skill

Self-evolving automation system that learns from execution history and improves workflow quality over time.

## Overview

This skill provides continuous improvement capabilities for the LetMeTryAI automation system through:

1. **Execution Analysis** - Monitor task success/failure patterns
2. **Failure Diagnosis** - Root cause analysis of errors
3. **Pattern Learning** - Extract successful strategies
4. **Skill Updates** - Automatically improve skills based on feedback

## When to Use

Use this skill when:
- A task fails repeatedly with similar errors
- Performance metrics show degradation
- New failure patterns emerge
- User requests workflow optimization
- After significant system changes

## Core Components

### 1. Execution Log Analysis

Read execution logs from `.harness/.local/logs/`:

```typescript
import { analyzeExecutionLogs } from './scripts/analyze-logs.ts';

const patterns = await analyzeExecutionLogs({
  timeRange: '7d',
  taskType: 'daily_app_creation',
  minOccurrences: 3
});
```

### 2. Failure Classification

Common failure types:

| Type | Pattern | Solution |
|------|---------|----------|
| `timeout` | Operation exceeded time limit | Increase timeout, add retry logic |
| `network` | Connection failed | Add exponential backoff, circuit breaker |
| `validation` | Output didn't meet criteria | Improve validation rules, add examples |
| `resource` | Missing files/dependencies | Add resource checks, pre-validation |
| `logic` | Incorrect processing flow | Update workflow logic, add tests |

### 3. Improvement Workflow

```
Analyze → Diagnose → Propose → Validate → Apply
```

**Step 1: Analyze**
- Read recent execution logs
- Identify failure patterns
- Calculate success rates

**Step 2: Diagnose**
- Classify failure types
- Find root causes
- Locate problematic code sections

**Step 3: Propose**
- Generate fix suggestions
- Estimate impact
- Create test cases

**Step 4: Validate**
- Run tests
- Verify fixes
- Check for regressions

**Step 5: Apply**
- Update skills/workflows
- Record changes
- Monitor results

### 4. Self-Improvement Rules

**Rule 1: Preserve Working Patterns**
```typescript
// Before changing, verify current behavior
if (currentSuccessRate > 0.9) {
  // Make minimal changes
  applyGradualImprovement();
} else {
  // Allow larger changes
  applySignificantRefactoring();
}
```

**Rule 2: Version Control**
- Always backup before changes
- Use git branches for experiments
- Tag stable versions

**Rule 3: Test Coverage**
- New code must have tests
- Maintain >80% coverage
- Include edge cases

**Rule 4: Gradual Rollout**
- Apply changes to 10% of tasks first
- Monitor for 24 hours
- Scale to 100% if successful

## Usage Examples

### Example 1: Fix Recurring Failure

```typescript
// Detect pattern
const failures = await analyzeRecentFailures({
  task: 'video_generation',
  errorPattern: 'ffmpeg failed'
});

// Diagnose
if (failures.count > 3 && failures.sameError) {
  const rootCause = await diagnoseFailure(failures);
  
  // Propose fix
  const fix = await generateFix(rootCause);
  
  // Validate
  const testResult = await validateFix(fix);
  
  if (testResult.success) {
    await applyFix(fix);
  }
}
```

### Example 2: Optimize Performance

```typescript
// Analyze timing
const metrics = await analyzePerformance({
  task: 'topic_selection',
  metric: 'duration',
  threshold: 'p95 > 60s'
});

// Identify bottleneck
if (metrics.slowStep === 'ai.generate') {
  // Apply optimization
  await optimizeAIGeneration({
    addCache: true,
    reduceRetries: true,
    parallelize: true
  });
}
```

### Example 3: Update Skill Based on Feedback

```typescript
// Read user feedback
const feedback = await loadFeedback({
  skill: 'video-recorder',
  rating: '< 3 stars'
});

// Analyze common complaints
const issues = extractCommonIssues(feedback);

// Update skill
for (const issue of issues) {
  await updateSkill('video-recorder', {
    fix: issue.solution,
    test: issue.testCase
  });
}
```

## Scripts

### analyze-logs.ts

Analyze execution logs and identify patterns:

```bash
npx tsx scripts/analyze-logs.ts --task video_generation --days 7
```

### diagnose-failure.ts

Diagnose specific failure types:

```bash
npx tsx scripts/diagnose-failure.ts --error "ffmpeg failed" --context
```

### generate-fix.ts

Generate fix suggestions:

```bash
npx tsx scripts/generate-fix.ts --file src/services/video-generator.ts --issue timeout
```

### validate-fix.ts

Validate proposed fixes:

```bash
npx tsx scripts/validate-fix.ts --fix fix.patch --tests
```

## References

- `references/failure-patterns.md` - Common failure patterns and solutions
- `references/performance-tips.md` - Performance optimization guidelines
- `references/skill-templates.md` - Templates for skill improvements

## Best Practices

1. **Monitor Before Changing**
   - Collect at least 10 data points
   - Understand normal variance
   - Identify true anomalies

2. **Hypothesis-Driven**
   - Form hypothesis about cause
   - Test with minimal change
   - Measure before/after

3. **Rollback Plan**
   - Keep previous version
   - Test rollback procedure
   - Set up alerts for issues

4. **Document Changes**
   - Record what changed
   - Why it changed
   - Expected impact
   - Actual results

## Integration

### With Daily Workflow

Add to `daily-app-agent.ts`:

```typescript
// After task completion
await selfImprovement.recordExecution({
  taskId: task.id,
  success: result.success,
  duration: result.duration,
  errors: result.errors
});

// Weekly review
if (isMondayMorning()) {
  await selfImprovement.runWeeklyReview();
}
```

### With Error Handler

```typescript
// In error handler
catch (error) {
  await selfImprovement.analyzeFailure({
    error,
    context: taskContext,
    autoFix: true // Attempt automatic fix
  });
}
```

## Metrics

Track these metrics for improvement:

- **Success Rate** - % of tasks completed successfully
- **Mean Time To Recovery** - Average time to fix failures
- **Performance Regression** - Changes in execution time
- **Skill Effectiveness** - Success rate by skill version

## Safety

⚠️ **Never automatically apply changes that:**
- Modify production credentials
- Delete data without backup
- Change core workflow logic without review
- Affect >50% of tasks without testing

Always require human approval for high-risk changes.
