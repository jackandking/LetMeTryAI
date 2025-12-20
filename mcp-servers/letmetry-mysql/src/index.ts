#!/usr/bin/env node

/**
 * LetMeTry MySQL MCP Server
 * 
 * This MCP server provides MySQL database operations through the LetMeTry Cloud API.
 * No API key is required - it connects directly to letmetry.cloud/lws/mysql/query
 * 
 * Features:
 * - Execute SQL queries (SELECT, INSERT, UPDATE, DELETE)
 * - No authentication required
 * - Integrated with GitHub Copilot for natural language SQL operations
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

// LetMeTry Cloud API endpoint - no API key required
const LETMETRY_API_BASE = 'https://letmetry.cloud/lws';
const MYSQL_QUERY_ENDPOINT = `${LETMETRY_API_BASE}/mysql/query`;

/**
 * Validate and sanitize SQL identifier (table name, column name)
 * @param identifier - The identifier to validate
 * @returns Sanitized identifier or throws error
 */
function sanitizeIdentifier(identifier: string): string {
  // Only allow alphanumeric characters, underscores, and dots
  if (!/^[a-zA-Z0-9_\.]+$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}. Only alphanumeric characters, underscores, and dots are allowed.`);
  }
  return identifier;
}

/**
 * Escape string value for SQL
 * @param value - The value to escape
 * @returns Escaped value
 */
function escapeStringValue(value: string): string {
  // Replace single quotes with double single quotes
  // and escape backslashes
  return value.replace(/\\/g, '\\\\').replace(/'/g, "''");
}

/**
 * Validate limit value
 * @param limit - The limit value to validate
 * @returns Validated limit
 */
function validateLimit(limit: number): number {
  const parsedLimit = parseInt(String(limit), 10);
  if (isNaN(parsedLimit) || parsedLimit < 0 || parsedLimit > 10000) {
    throw new Error('Limit must be a positive number between 0 and 10000');
  }
  return parsedLimit;
}

/**
 * Execute a SQL query against the LetMeTry MySQL database
 * @param sql - The SQL query to execute
 * @returns Query results or error message
 */
async function executeQuery(sql: string): Promise<any> {
  try {
    const response = await axios.post(MYSQL_QUERY_ENDPOINT, {
      sql: sql
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    return {
      success: true,
      data: response.data,
      message: 'Query executed successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details available'
    };
  }
}

/**
 * Main MCP Server implementation
 */
class LetMeTryMySQLServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'letmetry-mysql-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'mysql_query',
            description: 'Execute SQL queries on the LetMeTry MySQL database. Supports SELECT, INSERT, UPDATE, DELETE operations. No API key required.',
            inputSchema: {
              type: 'object',
              properties: {
                sql: {
                  type: 'string',
                  description: 'The SQL query to execute. Examples: "SELECT * FROM beauty_images ORDER BY created_at DESC LIMIT 10", "INSERT INTO beauty_images (image_url) VALUES (\'https://example.com/image.jpg\')"'
                }
              },
              required: ['sql']
            }
          } as Tool,
          {
            name: 'mysql_query_table',
            description: 'Query a specific table with optional filters. A convenience wrapper around mysql_query for common operations.',
            inputSchema: {
              type: 'object',
              properties: {
                table: {
                  type: 'string',
                  description: 'The table name to query (e.g., "beauty_images")'
                },
                columns: {
                  type: 'string',
                  description: 'Comma-separated column names to select (default: "*")',
                  default: '*'
                },
                where: {
                  type: 'string',
                  description: 'Optional WHERE clause (without the WHERE keyword)'
                },
                orderBy: {
                  type: 'string',
                  description: 'Optional ORDER BY clause (without ORDER BY keyword)'
                },
                limit: {
                  type: 'number',
                  description: 'Optional LIMIT for number of results'
                }
              },
              required: ['table']
            }
          } as Tool,
          {
            name: 'mysql_insert',
            description: 'Insert a new record into a table. A convenience wrapper for INSERT operations.',
            inputSchema: {
              type: 'object',
              properties: {
                table: {
                  type: 'string',
                  description: 'The table name to insert into'
                },
                data: {
                  type: 'object',
                  description: 'Key-value pairs of column names and values to insert'
                }
              },
              required: ['table', 'data']
            }
          } as Tool,
          {
            name: 'get_table_schema',
            description: 'Get the schema information for available tables in the database.',
            inputSchema: {
              type: 'object',
              properties: {
                table: {
                  type: 'string',
                  description: 'Optional: specific table name to get schema for'
                }
              }
            }
          } as Tool
        ],
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'mysql_query': {
            const { sql } = args as { sql: string };
            
            if (!sql || typeof sql !== 'string') {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: 'SQL query is required and must be a string'
                    }, null, 2)
                  }
                ]
              };
            }

            const result = await executeQuery(sql);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          case 'mysql_query_table': {
            const { table, columns = '*', where, orderBy, limit } = args as {
              table: string;
              columns?: string;
              where?: string;
              orderBy?: string;
              limit?: number;
            };

            try {
              // Sanitize table name
              const sanitizedTable = sanitizeIdentifier(table);
              
              // Sanitize column names (split by comma and validate each)
              const sanitizedColumns = columns.split(',')
                .map(col => col.trim())
                .map(col => col === '*' ? '*' : sanitizeIdentifier(col))
                .join(', ');
              
              let sql = `SELECT ${sanitizedColumns} FROM ${sanitizedTable}`;
              
              // SECURITY NOTE: WHERE clause is passed through for flexibility
              // This is intentional to support complex queries, but means:
              // - Only use with trusted inputs
              // - For production use with untrusted data, implement additional validation
              // - Consider using mysql_query with parameterized queries for sensitive operations
              if (where) {
                sql += ` WHERE ${where}`;
              }
              
              if (orderBy) {
                // Sanitize ORDER BY clause
                const sanitizedOrderBy = orderBy.split(',')
                  .map(clause => {
                    const parts = clause.trim().split(/\s+/);
                    const column = sanitizeIdentifier(parts[0]);
                    const direction = parts[1]?.toUpperCase();
                    if (direction && direction !== 'ASC' && direction !== 'DESC') {
                      throw new Error('ORDER BY direction must be ASC or DESC');
                    }
                    return direction ? `${column} ${direction}` : column;
                  })
                  .join(', ');
                sql += ` ORDER BY ${sanitizedOrderBy}`;
              }
              
              if (limit) {
                const sanitizedLimit = validateLimit(limit);
                sql += ` LIMIT ${sanitizedLimit}`;
              }

              const result = await executeQuery(sql);
              
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                  }
                ]
              };
            } catch (error: any) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: error.message
                    }, null, 2)
                  }
                ],
                isError: true
              };
            }
          }

          case 'mysql_insert': {
            const { table, data } = args as {
              table: string;
              data: Record<string, any>;
            };

            try {
              // Sanitize table name
              const sanitizedTable = sanitizeIdentifier(table);
              
              // Sanitize column names
              const sanitizedColumns = Object.keys(data)
                .map(col => sanitizeIdentifier(col))
                .join(', ');
              
              // Escape values properly
              const values = Object.values(data)
                .map(v => {
                  if (v === null) {
                    return 'NULL';
                  } else if (typeof v === 'string') {
                    return `'${escapeStringValue(v)}'`;
                  } else if (typeof v === 'number') {
                    return String(v);
                  } else if (typeof v === 'boolean') {
                    return v ? '1' : '0';
                  } else {
                    throw new Error(`Unsupported value type: ${typeof v}`);
                  }
                })
                .join(', ');

              const sql = `INSERT INTO ${sanitizedTable} (${sanitizedColumns}) VALUES (${values})`;
              const result = await executeQuery(sql);
              
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                  }
                ]
              };
            } catch (error: any) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: error.message
                    }, null, 2)
                  }
                ],
                isError: true
              };
            }
          }

          case 'get_table_schema': {
            const { table } = args as { table?: string };
            
            // Provide known schema information
            const schemas = {
              beauty_images: {
                columns: [
                  { name: 'id', type: 'INT', key: 'PRI', extra: 'auto_increment' },
                  { name: 'image_url', type: 'VARCHAR(2048)', key: '', extra: '' },
                  { name: 'created_at', type: 'DATETIME', key: 'MUL', extra: '' },
                  { name: 'updated_at', type: 'DATETIME', key: '', extra: '' }
                ],
                description: 'Stores beauty image URLs uploaded by users'
              }
            };

            let result;
            if (table && schemas[table as keyof typeof schemas]) {
              result = {
                success: true,
                table: table,
                schema: schemas[table as keyof typeof schemas]
              };
            } else if (table) {
              result = {
                success: false,
                error: `Table '${table}' not found in schema information`
              };
            } else {
              result = {
                success: true,
                tables: Object.keys(schemas),
                schemas: schemas
              };
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          default:
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: `Unknown tool: ${name}`
                  }, null, 2)
                }
              ]
            };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error.message,
                stack: error.stack
              }, null, 2)
            }
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('LetMeTry MySQL MCP Server running on stdio');
  }
}

// Start the server
const server = new LetMeTryMySQLServer();
server.run().catch(console.error);
