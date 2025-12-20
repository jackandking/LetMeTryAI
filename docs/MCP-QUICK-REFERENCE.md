# MCP Server Quick Reference

Quick reference card for LetMeTry MySQL MCP Server with GitHub Copilot.

## 🚀 Setup

```bash
./scripts/setup-mcp.sh
```

## 📋 Common Commands

### View Data
```
@workspace Show latest 10 images from beauty_images
@workspace Get all images from beauty_images table
@workspace Show images ordered by date, newest first
```

### Insert Data
```
@workspace Add image with URL https://example.com/img.jpg to beauty_images
@workspace Insert new image https://cdn.example.com/photo.jpg
```

### Statistics
```
@workspace Count total images in beauty_images
@workspace How many images were added today?
@workspace Show image count by date for last week
```

### Schema Info
```
@workspace What's the structure of beauty_images table?
@workspace Show all available tables
@workspace Describe beauty_images columns
```

## 🔧 Tools Available

| Tool | Purpose | Example |
|------|---------|---------|
| `mysql_query` | Raw SQL queries | Any SQL statement |
| `mysql_query_table` | Quick table queries | With filters, sorting, limits |
| `mysql_insert` | Insert records | New image URLs |
| `get_table_schema` | Schema information | Table structures |

## 📊 beauty_images Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key (auto increment) |
| `image_url` | VARCHAR(2048) | Image URL |
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

## 💡 Tips

- Always specify table name: "beauty_images"
- Use natural language - Copilot understands context
- Be specific about sorting and limits
- No API key needed - works out of the box

## 🔗 Resources

- [Full Usage Examples](./MCP-USAGE-EXAMPLES.md)
- [MCP Server README](../mcp-servers/letmetry-mysql/README.md)
- [Database Schema](../nanrenbao/database-schema.sql)
