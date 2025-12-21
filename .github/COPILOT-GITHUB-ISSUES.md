# Using GitHub Issues with Copilot MCP for Database Operations

This guide explains how to leverage GitHub Copilot to perform SQL operations directly from GitHub Issues.

## 🎯 Overview

This repository has a MySQL MCP (Model Context Protocol) server that allows GitHub Copilot to:
- Execute SQL queries directly
- Create and modify database schemas
- Test database operations
- Implement features that require database changes

## 📝 Creating Database Enhancement Issues

### Step 1: Create an Issue
Use the **Database Enhancement** template:
```
https://github.com/jackandking/LetMeTryAI/issues/new/choose
```

### Step 2: Specify Database Operations
Be specific about what you need:

```markdown
## Example Issue

**Table**: beauty_images
**Operation**: Add a likes counter

**SQL Schema Change**:
```sql
ALTER TABLE beauty_images 
ADD COLUMN likes INT DEFAULT 0,
ADD COLUMN dislikes INT DEFAULT 0;
```

**Test Queries**:
```sql
SELECT id, image_url, likes, dislikes FROM beauty_images LIMIT 5;
UPDATE beauty_images SET likes = 10 WHERE id = 1;
```
```

### Step 3: Mention MCP Capabilities
Add this note to your issue:
```markdown
**MCP Enabled**: Copilot can execute these queries directly for testing.
```

## 🤖 Enabling Copilot Coding Agent

To have Copilot automatically implement your issue:

### Method 1: In Issue Comments
Add a comment with the hashtag:
```markdown
#github-pull-request_copilot-coding-agent please implement this database enhancement
```

### Method 2: Assign to Copilot
1. Assign the issue to the Copilot coding agent
2. The agent will:
   - Read the issue description
   - Execute SQL queries via MCP
   - Test the changes
   - Create a PR with the implementation

## 🗄️ Available Database Operations

### Query Data
```markdown
@workspace Show me the latest 10 images from beauty_images
@workspace Count total images where likes > 5
@workspace Get schema for beauty_images table
```

### Modify Schema
```markdown
@workspace Create the beauty_images table using nanrenbao/database-schema.sql
@workspace Add a new column 'views' to beauty_images
```

### Insert/Update Data
```markdown
@workspace Insert a test image URL into beauty_images
@workspace Update likes count for image id 1
```

## 📋 Best Practices

### 1. Be Specific
❌ Bad: "Add some columns to the database"
✅ Good: "Add `likes INT` and `views INT` columns to beauty_images table"

### 2. Include Test Queries
Always provide queries Copilot can use to verify:
```sql
-- Verify column exists
SHOW COLUMNS FROM beauty_images LIKE 'likes';

-- Test data insertion
INSERT INTO beauty_images (image_url, likes) VALUES ('test.jpg', 5);
```

### 3. Reference Schema Files
Link to existing schema documentation:
```markdown
See: [nanrenbao/database-schema.sql](nanrenbao/database-schema.sql)
```

### 4. Specify Frontend Integration
Mention which HTML/JS files will use the new database features:
```markdown
**Frontend Files**:
- nanrenbao/appreciate.html (display likes)
- nanrenbao/upload.html (initialize likes to 0)
```

## 🔧 MCP Configuration Files

The MCP server is configured in:
- **Workspace**: [.vscode/settings.json](../.vscode/settings.json)
- **Copilot**: [.github/copilot-mcp.json](../copilot-mcp.json)
- **Instructions**: [.github/copilot-instructions.md](copilot-instructions.md)

## 📊 Database Schema Reference

Current tables:
- **beauty_images**: [nanrenbao/database-schema.sql](../nanrenbao/database-schema.sql)
  - `id`, `image_url`, `created_at`, `updated_at`

## ⚡ Quick Example: Complete Workflow

### 1. Create Issue
```markdown
Title: [DB] Add like/dislike functionality to beauty images

**Table**: beauty_images
**Operation**: Add like/dislike columns

**SQL**:
ALTER TABLE beauty_images 
ADD COLUMN likes INT DEFAULT 0,
ADD COLUMN dislikes INT DEFAULT 0;

**Test**: @workspace Show schema for beauty_images
**MCP**: Enabled
```

### 2. Assign to Copilot
Add comment: `#github-pull-request_copilot-coding-agent`

### 3. Copilot Will:
- Execute the ALTER TABLE statement
- Verify columns were added
- Update schema documentation
- Create PR with changes

### 4. Review & Merge
- Check the PR created by Copilot
- Test on your local environment
- Merge when satisfied

## 🚀 Advanced Usage

### Testing Complex Queries
```markdown
@workspace Can you test if this query works:
SELECT image_url, likes, 
       (likes - dislikes) as score 
FROM beauty_images 
ORDER BY score DESC 
LIMIT 10
```

### Data Migration
```markdown
@workspace Migrate existing beauty_images by setting all likes to 0
UPDATE beauty_images SET likes = 0, dislikes = 0;
```

### Performance Testing
```markdown
@workspace Create an index on the likes column for faster sorting
CREATE INDEX idx_likes ON beauty_images(likes);
```

## 📞 Troubleshooting

### MCP Server Not Working?
1. Verify it's built: `ls -la mcp-servers/letmetry-mysql/dist/`
2. Rebuild if needed: `/workspaces/LetMeTryAI/scripts/setup-mcp.sh`
3. Reload VS Code window
4. Check [.vscode/settings.json](../.vscode/settings.json)

### Issue Not Being Picked Up?
- Make sure you use `#github-pull-request_copilot-coding-agent`
- Provide clear, specific requirements
- Include test queries Copilot can execute
- Reference the database schema files

## 🎓 Resources

- [MCP Server README](../mcp-servers/letmetry-mysql/README.md)
- [MCP Quick Reference](../docs/MCP-QUICK-REFERENCE.md)
- [MCP Usage Examples](../docs/MCP-USAGE-EXAMPLES.md)
- [Copilot Instructions](copilot-instructions.md)

---

**Now you can use GitHub Issues to request database changes and let Copilot implement them automatically! 🎉**
