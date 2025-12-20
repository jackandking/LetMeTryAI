# MCP Server Usage Examples

This document provides practical examples of using the LetMeTry MySQL MCP Server with GitHub Copilot.

## 📋 Prerequisites

1. MCP server installed and built: `./scripts/setup-mcp.sh`
2. GitHub Copilot enabled in your IDE
3. Configuration file `.github/copilot-mcp.json` in place

## 🔍 Basic Query Examples

### View Recent Images

**User prompt to Copilot:**
```
@workspace Show me the latest 10 images from beauty_images table
```

**What Copilot will do:**
- Use the `mysql_query_table` tool
- Query: `SELECT * FROM beauty_images ORDER BY created_at DESC LIMIT 10`
- Display the results with image URLs and timestamps

---

### Get Table Schema

**User prompt to Copilot:**
```
@workspace What's the structure of the beauty_images table?
```

**What Copilot will do:**
- Use the `get_table_schema` tool
- Return column definitions, types, and indexes
- Display table description

---

### Count Total Images

**User prompt to Copilot:**
```
@workspace How many total images are in the beauty_images table?
```

**What Copilot will do:**
- Use the `mysql_query` tool
- Query: `SELECT COUNT(*) as total FROM beauty_images`
- Return the count

---

## 📝 Insert Operations

### Add a New Image

**User prompt to Copilot:**
```
@workspace Add a new image with URL https://example.com/beauty/image123.jpg to beauty_images
```

**What Copilot will do:**
- Use the `mysql_insert` tool
- Insert: `INSERT INTO beauty_images (image_url) VALUES ('https://example.com/beauty/image123.jpg')`
- Confirm insertion success

---

## 🔎 Advanced Query Examples

### Date-Based Queries

**User prompt to Copilot:**
```
@workspace Show me images created in the last 7 days
```

**What Copilot will do:**
- Use the `mysql_query` tool
- Query: `SELECT * FROM beauty_images WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY created_at DESC`

---

### Pagination

**User prompt to Copilot:**
```
@workspace Get the next 20 images, starting from the 100th record
```

**What Copilot will do:**
- Use the `mysql_query` tool
- Query: `SELECT * FROM beauty_images ORDER BY created_at DESC LIMIT 20 OFFSET 100`

---

### Search by URL Pattern

**User prompt to Copilot:**
```
@workspace Find all images from example.com domain
```

**What Copilot will do:**
- Use the `mysql_query` tool
- Query: `SELECT * FROM beauty_images WHERE image_url LIKE '%example.com%'`

---

## 📊 Statistics and Analytics

### Images per Day

**User prompt to Copilot:**
```
@workspace Show me how many images were added each day this week
```

**What Copilot will do:**
- Use the `mysql_query` tool
- Query: `SELECT DATE(created_at) as date, COUNT(*) as count FROM beauty_images WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(created_at)`

---

### Most Recent Image URL

**User prompt to Copilot:**
```
@workspace What's the URL of the most recently added image?
```

**What Copilot will do:**
- Use the `mysql_query` tool
- Query: `SELECT image_url, created_at FROM beauty_images ORDER BY created_at DESC LIMIT 1`

---

## 🛠️ Database Management

### Check Database Status

**User prompt to Copilot:**
```
@workspace What tables are available in the database?
```

**What Copilot will do:**
- Use the `get_table_schema` tool
- Return list of available tables and their schemas

---

### Verify Data Integrity

**User prompt to Copilot:**
```
@workspace Check if there are any duplicate image URLs in beauty_images
```

**What Copilot will do:**
- Use the `mysql_query` tool
- Query: `SELECT image_url, COUNT(*) as count FROM beauty_images GROUP BY image_url HAVING count > 1`

---

## 🔒 Security Best Practices

### Safe Queries

**Good examples:**
```
@workspace Select the top 5 most recent images
@workspace Count images created today
@workspace Get image with id = 42
```

**Avoid in production:**
```
@workspace Delete all images (dangerous!)
@workspace Update all image URLs (risky!)
@workspace Drop the beauty_images table (never do this!)
```

---

## 💡 Tips for Better Results

### 1. Be Specific
Instead of: "Show me some images"
Better: "Show me the 10 most recent images from beauty_images ordered by created_at"

### 2. Specify Table Names
Always mention the table name explicitly:
- ✅ "Query beauty_images table"
- ❌ "Query the image table"

### 3. Use Natural Language
Copilot understands natural language well:
- "Get images from last week"
- "Count how many images were added yesterday"
- "Find the oldest image in the database"

### 4. Request Specific Columns
If you only need certain data:
- "Show me just the image URLs and creation dates"
- "Get the id and image_url for the latest 5 images"

### 5. Include Sorting Requirements
Specify how you want results ordered:
- "Show me images ordered by creation date, newest first"
- "List images alphabetically by URL"

---

## 🎯 Common Use Cases

### Case 1: Gallery Display
**Goal:** Get images for a photo gallery page

**Prompt:**
```
@workspace Get 50 images for a gallery, ordered by newest first, including URL and creation date
```

---

### Case 2: Statistics Dashboard
**Goal:** Get data for analytics dashboard

**Prompt:**
```
@workspace Get the total count of images and the date of the first and last image added
```

---

### Case 3: Content Moderation
**Goal:** Find recently added images for review

**Prompt:**
```
@workspace Show me all images added in the last hour that need review
```

---

### Case 4: Data Export
**Goal:** Export data for backup

**Prompt:**
```
@workspace Get all image records with all fields for backup purposes
```

---

## 🚨 Troubleshooting

### Issue: Copilot doesn't recognize MCP commands

**Solution:**
1. Ensure MCP server is built: `./scripts/setup-mcp.sh`
2. Restart your IDE
3. Check `.github/copilot-mcp.json` exists
4. Verify the path in copilot-mcp.json points to the correct dist/index.js

---

### Issue: Query returns empty results

**Solution:**
1. Verify table has data: `@workspace Count total records in beauty_images`
2. Check your WHERE conditions are correct
3. Verify table name spelling: "beauty_images" (plural)

---

### Issue: Timeout errors

**Solution:**
1. Simplify your query
2. Add LIMIT to large result sets
3. Check network connection to letmetry.cloud

---

## 📚 Additional Resources

- [MCP Server README](../mcp-servers/letmetry-mysql/README.md)
- [Database Schema](../nanrenbao/database-schema.sql)
- [Main Project README](../README.md)

---

## 🤝 Contributing Examples

Have a useful query pattern? Add it to this document via pull request!

Format:
```markdown
### Your Example Title

**User prompt to Copilot:**
[Your prompt here]

**What Copilot will do:**
- Use the [tool name] tool
- Query: [SQL query if applicable]
- [Expected outcome]
```

---

## 📄 License

MIT License - see LICENSE file for details
