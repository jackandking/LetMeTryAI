# Ralph Skill

> **Ralph Wiggum Pattern**: Autonomous AI coding loop that runs until all tasks complete.

---

## Overview

Ralph is an autonomous AI agent loop that repeatedly executes coding tasks until all PRD items are complete. Named after Ralph Wiggum ("I'm helping!"), each iteration is a **fresh AI instance** with no memory of previous work - preventing context drift and ensuring clean execution.

**Key Principle**: Each iteration starts fresh. State is maintained through files (`prd.json`, `progress.txt`), not context.

---

## When to Use

| Scenario | Use Ralph? |
|----------|------------|
| Feature requiring 5+ implementation steps | ✅ Yes |
| Tasks spanning multiple files/modules | ✅ Yes |
| Need autonomous "overnight" execution | ✅ Yes |
| Single-file quick fix | ❌ No |
| Simple refactoring | ❌ No |
| Exploration/spike tasks | ❌ No |

---

## Workflow

```
┌─────────────────┐
│   Create PRD    │ ← User describes feature
└────────┬────────┘
         ▼
┌─────────────────┐
│  Convert to     │ ← Generate prd.json
│  prd.json       │
└────────┬────────┘
         ▼
┌─────────────────┐     ┌─────────────┐
│  Ralph Loop     │────→│ Fresh Agent │
│  (repeats)      │     │ Instance    │
└────────┬────────┘     └──────┬──────┘
         │                      │
         │    ┌─────────────┐   │
         └──→ │ Pick Story  │ ←─┘
              │ Implement   │
              │ Test        │
              │ Commit      │
              │ Update JSON │
              └──────┬──────┘
                     │
                     ▼ (all done?)
              ┌─────────────┐
              │   Done!     │
              └─────────────┘
```

---

## File Structure

```
scripts/ralph/
├── ralph.sh              # Main bash loop
├── prompt.md             # Prompt template (Amp)
├── CLAUDE.md             # Prompt template (Claude Code)
├── prd.json              # Task list with status
├── prd.json.example      # Example format
└── progress.txt          # Append-only learnings
```

---

## prd.json Format

```json
{
  "title": "Feature Name",
  "branchName": "feature/my-feature",
  "stories": [
    {
      "id": "story-1",
      "title": "Add database schema",
      "description": "Create users table with email, name columns",
      "acceptanceCriteria": [
        "Migration file created",
        "Table exists in database",
        "Indexes on email column"
      ],
      "passes": false,
      "priority": 1
    },
    {
      "id": "story-2",
      "title": "Create API endpoint",
      "description": "POST /api/users to create users",
      "acceptanceCriteria": [
        "Endpoint returns 201 on success",
        "Input validation works",
        "Tests pass"
      ],
      "passes": false,
      "priority": 2,
      "dependsOn": ["story-1"]
    }
  ]
}
```

---

## progress.txt Format

```markdown
# Build Progress Log
Started: 2024-01-15
Feature: User Management System

## Codebase Patterns
- Use TypeScript strict mode
- Prefer async/await over callbacks
- Database: Use repository pattern
- Tests: Place in __tests__ folder
- API: Follow REST conventions

## Decisions Made
- Chose Zod for validation (2024-01-15)
- Using bcrypt for password hashing

## Issues & Solutions
- Issue: Migration conflicts with existing data
- Solution: Added data transformation step

## Current Context
Working on: story-2 (API endpoint)
Last action: Created user service
Next: Implement POST handler
```

---

## Usage

### 1. Create PRD

Describe your feature in detail. Include:
- User-facing goal
- Technical approach
- Acceptance criteria
- Dependencies

### 2. Convert to prd.json

Break PRD into small, completable stories:
- Each story fits in one iteration (~one context window)
- Clear acceptance criteria
- Dependencies specified

### 3. Run Ralph

```bash
# Using Amp (default)
./scripts/ralph/ralph.sh [max_iterations]

# Using Claude Code
./scripts/ralph/ralph.sh --tool claude [max_iterations]

# Example: max 15 iterations
./scripts/ralph/ralph.sh 15
```

Default iterations: 10

---

## Ralph Loop Steps

Each iteration performs:

1. **Check State** - Read `prd.json` and `progress.txt`
2. **Select Story** - Highest priority where `passes: false` and dependencies met
3. **Checkout Branch** - Create/switch to feature branch
4. **Implement** - Code the story (single focused task)
5. **Quality Gates**:
   - Run typecheck (`npm run typecheck` or equivalent)
   - Run tests (`npm test`)
   - Verify acceptance criteria
6. **Commit** - If gates pass, commit with descriptive message
7. **Update State**:
   - Set `passes: true` in `prd.json`
   - Append learnings to `progress.txt`
8. **Repeat** - Until all stories pass or max iterations reached

---

## Quality Gates

Before marking any story complete:

```bash
# Must pass all:
npm run typecheck   # TypeScript check
npm test            # Unit tests
npm run lint        # Linting (optional)
```

If checks fail:
- Fix issues
- Re-run checks
- Only then mark complete

---

## Best Practices

### Story Sizing

**Good** (completable in one iteration):
- Add database column + migration
- Create single UI component
- Implement one API endpoint
- Write tests for one module

**Too Big** (will fail):
- Build entire user system
- Refactor whole codebase
- Add auth + UI + tests in one go

### Dependency Ordering

```json
{
  "stories": [
    { "id": "1", "priority": 1, "passes": false },  // Schema first
    { "id": "2", "priority": 2, "dependsOn": ["1"] },  // Then API
    { "id": "3", "priority": 3, "dependsOn": ["2"] }   // Then UI
  ]
}
```

### progress.txt Maintenance

Keep append-only log of:
- **Codebase Patterns** - Architectural decisions
- **Decisions Made** - Why certain choices
- **Issues & Solutions** - Problems encountered
- **Current Context** - What agent should know

---

## Example: Complete Workflow

### Step 1: Create PRD

```markdown
# Feature: Add User Profiles

## Goal
Users can view and edit their profile information.

## Stories
1. Create profiles table (user_id, bio, avatar_url)
2. Add GET /api/profile endpoint
3. Add PUT /api/profile endpoint  
4. Create Profile UI component
5. Add profile page route

## Acceptance Criteria
- Users can view their profile
- Users can update bio and avatar
- Changes persist to database
```

### Step 2: Convert to prd.json

```json
{
  "title": "Add User Profiles",
  "branchName": "feature/user-profiles",
  "stories": [
    {
      "id": "schema",
      "title": "Create profiles table",
      "description": "Add migration for profiles table",
      "acceptanceCriteria": ["Migration runs", "Table exists"],
      "priority": 1,
      "passes": false
    },
    {
      "id": "get-api",
      "title": "GET /api/profile",
      "description": "Endpoint to fetch user profile",
      "acceptanceCriteria": ["Returns profile data", "Tests pass"],
      "priority": 2,
      "dependsOn": ["schema"],
      "passes": false
    },
    {
      "id": "put-api",
      "title": "PUT /api/profile",
      "description": "Endpoint to update profile",
      "acceptanceCriteria": ["Updates database", "Validates input"],
      "priority": 3,
      "dependsOn": ["schema"],
      "passes": false
    },
    {
      "id": "ui",
      "title": "Profile UI component",
      "description": "React component for profile display/edit",
      "acceptanceCriteria": ["Component renders", "Form works"],
      "priority": 4,
      "dependsOn": ["get-api", "put-api"],
      "passes": false
    }
  ]
}
```

### Step 3: Run Ralph

```bash
./scripts/ralph/ralph.sh 20
```

Ralph will:
1. Create `feature/user-profiles` branch
2. Implement schema story → commit
3. Implement GET API → commit
4. Implement PUT API → commit
5. Implement UI → commit
6. Mark all as complete → exit

---

## Troubleshooting

### Ralph Stuck on Same Story

**Cause**: Story too big, can't complete in one iteration

**Fix**: Break into smaller stories

### Quality Checks Keep Failing

**Cause**: Story dependencies not clear

**Fix**: Add explicit `dependsOn` and order correctly

### Context Overflow

**Cause**: Too many stories in prd.json

**Fix**: Use `limit` when querying stories (max 5-10)

---

## Integration with Other Tools

### Task Tracking

Ralph can integrate with task_list for persistent tracking:
- Create parent task for feature
- Create subtasks for each story
- Ralph updates task status as it progresses

### CI/CD

Quality gates should match CI requirements:
- If CI runs `npm run test:ci`, Ralph should too
- Ensures local and CI behavior match

---

## References

- **Original Pattern**: Geoffrey Huntley's Ralph
- **Repository**: https://github.com/snarktank/ralph
- **Article**: https://www.aihero.dev/ralph-pattern

---

## Quick Start Template

```bash
# 1. Create structure
mkdir -p scripts/ralph

# 2. Copy prompt template (choose one)
cp ralph/CLAUDE.md scripts/ralph/     # For Claude Code
cp ralph/prompt.md scripts/ralph/      # For Amp

# 3. Copy shell script
cp ralph/ralph.sh scripts/ralph/
chmod +x scripts/ralph/ralph.sh

# 4. Create prd.json from template
cp ralph/prd.json.example scripts/ralph/prd.json

# 5. Initialize progress.txt
echo "# Build Progress Log" > scripts/ralph/progress.txt

# 6. Run
./scripts/ralph/ralph.sh
```

---

**Remember**: Ralph is not magic. Clear PRDs, small stories, and explicit acceptance criteria are essential for success.
