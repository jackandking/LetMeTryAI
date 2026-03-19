---
name: batch-app-refiner
description: Orchestrate batch refinement of multiple vote apps using parallel processing. Leverages vote-app-refiner and vote-app-image-gen skills.
---

# Batch App Refiner

Orchestrate the refinement of multiple vote apps in parallel batches.

## Usage

```javascript
import { refineAppBatch } from './batch-app-refiner/index.js';

const apps = [
  { directory: 'fighter-jets', brand: 'nanrenbao' },
  { directory: 'tank-kings', brand: 'nanrenbao' },
  { directory: 'drone-kings', brand: 'nanrenbao' }
];

await refineAppBatch(apps, { batchSize: 3 });
```

## CLI Usage

```bash
# Refine a list of apps
./.agents/skills/batch-app-refiner/batch.sh apps.txt

# Where apps.txt contains:
# fighter-jets nanrenbao
# tank-kings nanrenbao
# drone-kings nanrenbao
```

## Process

1. **Read App List**
   - Parse input (file or inline list)
   - Validate each app exists
   - Group by brand for efficiency

2. **Process in Batches**
   - Default batch size: 3 apps
   - Parallel processing within batch
   - Sequential batches to avoid conflicts

3. **For Each App**
   ```
   a. vote-app-refiner/refine.sh
      - Refactor HTML/CSS/JS
   
   b. vote-app-image-gen/generate.sh
      - Generate option images
   
   c. Validate output
   ```

4. **Git Operations**
   - Stage all changes
   - Commit per batch
   - Push to origin

## Batch Processing

### Parallel Within Batch
```
Batch 1:
  ├─ App 1: fighter-jets (Task 1)
  ├─ App 2: tank-kings (Task 2)
  └─ App 3: drone-kings (Task 3)
  
  Wait for all 3 → Commit Batch 1

Batch 2:
  ├─ App 4: strategic-bombers (Task 4)
  ├─ App 5: power-armor (Task 5)
  └─ App 6: rockets-king (Task 6)
  
  Wait for all 3 → Commit Batch 2
```

### Error Handling
- If one app fails, continue with others
- Log errors for manual review
- Failed apps can be retried separately

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| batchSize | 3 | Number of apps to process in parallel |
| commitPerBatch | true | Whether to git commit after each batch |
| generateImages | true | Whether to run image generation |
| skipExisting | false | Skip apps already refined |

## Input Format

### File Input (apps.txt)
```
# Format: directory brand
fighter-jets nanrenbao
tank-kings nanrenbao
drone-kings nanrenbao

# Comments and empty lines are ignored

# Can also auto-detect brand
homework-routine
retirement-hobby-pick
```

### Inline Input
```bash
./batch.sh "fighter-jets,tank-kings,drone-kings" nanrenbao
```

## Output

Console output:
```
========================================
Batch App Refiner
========================================

Found 9 apps to refine

Batch 1/3 (3 apps):
  [1/3] fighter-jets - Processing...
  [2/3] tank-kings - Processing...
  [3/3] drone-kings - Processing...
  ✓ Batch 1 complete. Committing...

Batch 2/3 (3 apps):
  ...

========================================
Refinement Complete
Total: 9 apps
Success: 8 apps
Failed: 1 app
See logs: logs/batch-refine.log
========================================
```

## Logs

- `logs/batch-refine.log` - Overall batch progress
- `logs/refine-{app-name}.log` - Per-app refinement log

## Integration with Daily Pipeline

Can be integrated into daily-orchestrator.js:

```javascript
// After creating new apps, run batch refinement
if (newApps.length > 0) {
  await refineAppBatch(newApps.map(app => ({
    directory: app.id,
    brand: app.brand
  })));
}
```
