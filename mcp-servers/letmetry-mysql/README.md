# LetMeTry MySQL MCP Server

An MCP (Model Context Protocol) server that provides MySQL database operations for the LetMeTryAI project through GitHub Copilot.

## 🌟 Features

- **No API Key Required**: Direct connection to letmetry.cloud without authentication
- **GitHub Copilot Integration**: Use natural language to query and manage MySQL database
- **Multiple Operation Modes**: Support for raw SQL queries and convenience wrappers
- **Built-in Schema Information**: Get table schemas and structure information
- **Type-Safe**: Written in TypeScript with full type definitions

## 🚀 Quick Start

### Installation

Run the setup script from the project root:

```bash
./scripts/setup-mcp.sh
```

This will:
1. Install all required dependencies
2. Build the TypeScript MCP server
3. Configure GitHub Copilot to use the server

### Manual Installation

If you prefer manual setup:

```bash
# Navigate to the MCP server directory
cd mcp-servers/letmetry-mysql

# Install dependencies
npm install

# Build the server
npm run build
```

## 📖 Usage with GitHub Copilot

Once installed, you can use natural language commands in GitHub Copilot to interact with the MySQL database:

### Example Commands

**Query the database:**
```
@workspace Show me the latest 10 images from beauty_images table
@workspace Query beauty_images table for images created today
@workspace Get all records from beauty_images ordered by created_at
```

**Insert data:**
```
@workspace Insert a new image URL into beauty_images table
@workspace Add an image with URL https://example.com/image.jpg to beauty_images
```

**Get schema information:**
```
@workspace Show me the schema for beauty_images table
@workspace What tables are available in the database?
@workspace Describe the structure of beauty_images table
```

**Complex queries:**
```
@workspace Count how many images were created in the last 7 days
@workspace Find images created between two specific dates
@workspace Show me the most recent image URL
```

## 🛠️ Available Tools

The MCP server provides four main tools:

### 1. `mysql_query`

Execute raw SQL queries directly.

**Parameters:**
- `sql` (string, required): The SQL query to execute

**Example:**
```json
{
  "sql": "SELECT * FROM beauty_images ORDER BY created_at DESC LIMIT 10"
}
```

### 2. `mysql_query_table`

Query a table with convenient parameters (no need to write SQL).

**Parameters:**
- `table` (string, required): Table name
- `columns` (string, optional): Comma-separated column names (default: "*")
- `where` (string, optional): WHERE clause without the WHERE keyword
- `orderBy` (string, optional): ORDER BY clause without ORDER BY keyword
- `limit` (number, optional): Number of results to return

**Example:**
```json
{
  "table": "beauty_images",
  "columns": "id, image_url, created_at",
  "orderBy": "created_at DESC",
  "limit": 10
}
```

### 3. `mysql_insert`

Insert a new record into a table.

**Parameters:**
- `table` (string, required): Table name
- `data` (object, required): Key-value pairs of column names and values

**Example:**
```json
{
  "table": "beauty_images",
  "data": {
    "image_url": "https://example.com/image.jpg"
  }
}
```

### 4. `get_table_schema`

Get schema information for database tables.

**Parameters:**
- `table` (string, optional): Specific table name (omit to see all tables)

**Example:**
```json
{
  "table": "beauty_images"
}
```

## 📊 Database Schema

### beauty_images Table

Stores URLs of beauty images uploaded by users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (Primary Key, Auto Increment) | Unique identifier |
| `image_url` | VARCHAR(2048) | URL of the image |
| `created_at` | DATETIME | When the record was created |
| `updated_at` | DATETIME | When the record was last updated |

**Indexes:**
- Primary key on `id`
- Index on `created_at` for efficient sorting

## 🔧 Configuration

The MCP server is configured in `.github/copilot-mcp.json`:

```json
{
  "mcpServers": {
    "letmetry-mysql": {
      "command": "node",
      "args": ["./mcp-servers/letmetry-mysql/dist/index.js"],
      "description": "LetMeTry MySQL MCP Server - Execute MySQL queries without API key",
      "disabled": false
    }
  }
}
```

## 🏗️ Development

### Building

```bash
npm run build
```

### Watch Mode

For development with auto-rebuild on file changes:

```bash
npm run watch
```

### Project Structure

```
mcp-servers/letmetry-mysql/
├── src/
│   └── index.ts          # Main MCP server implementation
├── dist/                 # Compiled JavaScript (generated)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## 🔐 Security

### Input Sanitization

The MCP server implements multiple layers of security:

1. **Identifier Validation**: Table and column names are validated with regex `[a-zA-Z0-9_\.]+`
   - Only alphanumeric characters, underscores, and dots allowed
   - Prevents SQL injection through identifiers

2. **String Value Escaping**: 
   - Backslashes are escaped: `\` → `\\`
   - Single quotes are escaped: `'` → `''`
   - Uses `escapeStringValue()` function

3. **Limit Validation**: 
   - Maximum limit of 10,000 records per query
   - Prevents resource exhaustion attacks

4. **Type-Safe Values**:
   - Explicit handling for NULL, string, number, and boolean types
   - Rejects unsupported types with clear error messages

### Security Considerations

**⚠️ Important Security Notes:**

- **WHERE Clause Flexibility**: The `mysql_query_table` tool's `where` parameter accepts free-form SQL for flexibility. While convenient, this means:
  - Users should only use trusted inputs in WHERE clauses
  - For complex queries, prefer using the `mysql_query` tool with carefully constructed SQL
  - In production environments, consider implementing additional WHERE clause validation

- **Recommended Usage**:
  - ✅ **Safe**: Use `mysql_query` for vetted, specific queries
  - ✅ **Safe**: Use `mysql_query_table` with simple, known-safe WHERE conditions
  - ⚠️ **Caution**: Avoid user-provided WHERE clauses in production
  - ❌ **Unsafe**: Never use untrusted external input directly in queries

- **Best Practices**:
  - Limit to READ operations (SELECT) in production
  - Use INSERT operations only with validated data
  - Never expose raw `mysql_query` to end users
  - Implement application-level access controls
  - Monitor and log all database operations
  - Respect API rate limits

### No API Key Required

- The server connects directly to the public letmetry.cloud endpoint
- No authentication tokens or API keys needed
- Simplifies setup and deployment

## 🐛 Troubleshooting

### Server not starting

1. Ensure Node.js v16+ is installed: `node --version`
2. Rebuild the server: `npm run build`
3. Check for errors in the console output

### Copilot not finding the server

1. Verify `.github/copilot-mcp.json` exists
2. Check that the path to `dist/index.js` is correct
3. Restart your IDE/editor
4. Make sure the server is built: `ls -la mcp-servers/letmetry-mysql/dist/`

### Query errors

1. Check the SQL syntax is correct
2. Verify table and column names match the schema
3. Review error messages in the MCP server output
4. Test queries directly at https://letmetry.cloud/mysql/query

## 📝 Example Workflows

### Viewing Recent Images

```
@workspace Show me the 5 most recent images from beauty_images
```

This will execute:
```sql
SELECT * FROM beauty_images ORDER BY created_at DESC LIMIT 5
```

### Adding a New Image

```
@workspace Add a new image with URL https://example.com/new-image.jpg
```

This will execute:
```sql
INSERT INTO beauty_images (image_url) VALUES ('https://example.com/new-image.jpg')
```

### Checking Database Statistics

```
@workspace How many total images are in the beauty_images table?
```

This will execute:
```sql
SELECT COUNT(*) as total FROM beauty_images
```

## 🤝 Contributing

When contributing to the MCP server:

1. Follow TypeScript best practices
2. Add error handling for all operations
3. Update this README with new features
4. Test thoroughly with GitHub Copilot
5. Keep the server lightweight and focused

## 📄 License

MIT License - see main project LICENSE file for details

## 🔗 Related Links

- [MCP Protocol Documentation](https://modelcontextprotocol.io)
- [GitHub Copilot Documentation](https://docs.github.com/copilot)
- [LetMeTryAI Main Repository](https://github.com/jackandking/LetMeTryAI)
- [API Endpoint](https://letmetry.cloud/mysql/query)
