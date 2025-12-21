// mcp-integration.test.js - Tests for MCP Server integration
import { describe, it, expect, beforeAll } from '@jest/globals';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('MCP Server Integration Tests', () => {
  describe('MCP Server Files', () => {
    it('should have MCP server directory structure', () => {
      const mcpServerDir = join(__dirname, 'mcp-servers', 'letmetry-mysql');
      expect(existsSync(mcpServerDir)).toBe(true);
    });

    it('should have package.json with required dependencies', () => {
      const packagePath = join(__dirname, 'mcp-servers', 'letmetry-mysql', 'package.json');
      expect(existsSync(packagePath)).toBe(true);
      
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
      
      // Check required dependencies
      expect(packageJson.dependencies).toHaveProperty('@modelcontextprotocol/sdk');
      expect(packageJson.dependencies).toHaveProperty('axios');
      
      // Check dev dependencies
      expect(packageJson.devDependencies).toHaveProperty('typescript');
      expect(packageJson.devDependencies).toHaveProperty('@types/node');
      
      // Check scripts
      expect(packageJson.scripts).toHaveProperty('build');
      expect(packageJson.scripts.build).toBe('tsc');
    });

    it('should have TypeScript configuration', () => {
      const tsconfigPath = join(__dirname, 'mcp-servers', 'letmetry-mysql', 'tsconfig.json');
      expect(existsSync(tsconfigPath)).toBe(true);
      
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
      
      // Check important compiler options
      expect(tsconfig.compilerOptions).toBeDefined();
      expect(tsconfig.compilerOptions.outDir).toBe('./dist');
      expect(tsconfig.compilerOptions.rootDir).toBe('./src');
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it('should have MCP server source file', () => {
      const serverPath = join(__dirname, 'mcp-servers', 'letmetry-mysql', 'src', 'index.ts');
      expect(existsSync(serverPath)).toBe(true);
      
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check for key imports
      expect(serverContent).toContain('@modelcontextprotocol/sdk');
      expect(serverContent).toContain('axios');
      
      // Check for LetMeTry endpoint
      expect(serverContent).toContain('letmetry.cloud');
      expect(serverContent).toContain('/mysql/query');
      
      // Check for tool implementations
      expect(serverContent).toContain('mysql_query');
      expect(serverContent).toContain('mysql_query_table');
      expect(serverContent).toContain('mysql_insert');
      expect(serverContent).toContain('get_table_schema');
    });

    it('should have setup script', () => {
      const setupScriptPath = join(__dirname, 'scripts', 'setup-mcp.sh');
      expect(existsSync(setupScriptPath)).toBe(true);
      
      const setupScript = readFileSync(setupScriptPath, 'utf-8');
      
      // Check script content
      expect(setupScript).toContain('#!/bin/bash');
      expect(setupScript).toContain('npm install');
      expect(setupScript).toContain('npm run build');
      expect(setupScript).toContain('mcp-servers/letmetry-mysql');
    });

    it('should have README documentation', () => {
      const readmePath = join(__dirname, 'mcp-servers', 'letmetry-mysql', 'README.md');
      expect(existsSync(readmePath)).toBe(true);
      
      const readme = readFileSync(readmePath, 'utf-8');
      
      // Check for important documentation sections
      expect(readme).toContain('# LetMeTry MySQL MCP Server');
      expect(readme).toContain('No API Key Required');
      expect(readme).toContain('GitHub Copilot');
      expect(readme).toContain('Usage');
      expect(readme).toContain('mysql_query');
      expect(readme).toContain('beauty_images');
    });
  });

  describe('GitHub Copilot Configuration', () => {
    it('should have Copilot MCP configuration file', () => {
      const configPath = join(__dirname, '.github', 'copilot-mcp.json');
      expect(existsSync(configPath)).toBe(true);
    });

    it('should have valid Copilot MCP configuration', () => {
      const configPath = join(__dirname, '.github', 'copilot-mcp.json');
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      
      // Check structure
      expect(config).toHaveProperty('mcpServers');
      expect(config.mcpServers).toHaveProperty('letmetry-mysql');
      
      const serverConfig = config.mcpServers['letmetry-mysql'];
      
      // Check server configuration
      expect(serverConfig.command).toBe('node');
      expect(serverConfig.args).toContain('./mcp-servers/letmetry-mysql/dist/index.js');
      expect(serverConfig.description).toContain('MySQL');
      expect(serverConfig.disabled).toBe(false);
    });

    it('should not require API key in configuration', () => {
      const configPath = join(__dirname, '.github', 'copilot-mcp.json');
      const configContent = readFileSync(configPath, 'utf-8');
      
      // Ensure no API key fields
      expect(configContent.toLowerCase()).not.toContain('api_key');
      expect(configContent.toLowerCase()).not.toContain('apikey');
      expect(configContent.toLowerCase()).not.toContain('token');
      expect(configContent.toLowerCase()).not.toContain('auth');
    });
  });

  describe('MCP Server Endpoint Configuration', () => {
    it('should use correct LetMeTry Cloud endpoint', () => {
      const serverPath = join(__dirname, 'mcp-servers', 'letmetry-mysql', 'src', 'index.ts');
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check endpoint configuration
      expect(serverContent).toContain('https://letmetry.cloud');
      expect(serverContent).toContain('/mysql/query');
      
      // Ensure no hardcoded API keys
      expect(serverContent.toLowerCase()).not.toContain('api_key');
      expect(serverContent.toLowerCase()).not.toContain('x-api-key');
    });

    it('should have proper error handling for queries', () => {
      const serverPath = join(__dirname, 'mcp-servers', 'letmetry-mysql', 'src', 'index.ts');
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check for error handling
      expect(serverContent).toContain('try');
      expect(serverContent).toContain('catch');
      expect(serverContent).toContain('error');
      expect(serverContent).toContain('success: false');
    });

    it('should support beauty_images table schema', () => {
      const serverPath = join(__dirname, 'mcp-servers', 'letmetry-mysql', 'src', 'index.ts');
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check for beauty_images table schema
      expect(serverContent).toContain('beauty_images');
      expect(serverContent).toContain('image_url');
      expect(serverContent).toContain('created_at');
      expect(serverContent).toContain('updated_at');
    });
  });

  describe('Gitignore Configuration', () => {
    it('should ignore MCP server build artifacts', () => {
      const gitignorePath = join(__dirname, '.gitignore');
      const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
      
      // Check for MCP server ignores
      expect(gitignoreContent).toContain('mcp-servers/**/node_modules/');
      expect(gitignoreContent).toContain('mcp-servers/**/dist/');
      expect(gitignoreContent).toContain('mcp-servers/**/*.js');
      expect(gitignoreContent).toContain('mcp-servers/**/*.d.ts');
    });
  });

  describe('Main README Documentation', () => {
    it('should document MCP server feature', () => {
      const readmePath = join(__dirname, 'README.md');
      const readme = readFileSync(readmePath, 'utf-8');
      
      // Check for MCP documentation
      expect(readme).toContain('MCP Server');
      expect(readme).toContain('GitHub Copilot');
      expect(readme).toContain('setup-mcp.sh');
      expect(readme).toContain('mcp-servers/letmetry-mysql');
    });

    it('should include MCP server in project structure', () => {
      const readmePath = join(__dirname, 'README.md');
      const readme = readFileSync(readmePath, 'utf-8');
      
      // Check project structure documentation
      expect(readme).toContain('mcp-servers/');
      expect(readme).toContain('letmetry-mysql/');
      expect(readme).toContain('copilot-mcp.json');
    });

    it('should provide usage examples', () => {
      const readmePath = join(__dirname, 'README.md');
      const readme = readFileSync(readmePath, 'utf-8');
      
      // Check for usage examples
      expect(readme).toContain('@workspace');
      expect(readme).toContain('beauty_images');
    });
  });

  describe('Tool Definitions', () => {
    it('should define mysql_query tool correctly', () => {
      const serverPath = join(__dirname, 'mcp-servers', 'letmetry-mysql', 'src', 'index.ts');
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check mysql_query tool
      expect(serverContent).toContain("name: 'mysql_query'");
      expect(serverContent).toContain('Execute SQL queries');
      expect(serverContent).toContain('inputSchema');
    });

    it('should define convenience wrapper tools', () => {
      const serverPath = join(__dirname, 'mcp-servers', 'letmetry-mysql', 'src', 'index.ts');
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check convenience tools
      expect(serverContent).toContain("name: 'mysql_query_table'");
      expect(serverContent).toContain("name: 'mysql_insert'");
      expect(serverContent).toContain("name: 'get_table_schema'");
    });
  });

  describe('Security Considerations', () => {
    it('should not expose sensitive credentials', () => {
      const serverPath = join(__dirname, 'mcp-servers', 'letmetry-mysql', 'src', 'index.ts');
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check for absence of credentials
      expect(serverContent).not.toContain('password');
      expect(serverContent).not.toContain('secret');
      expect(serverContent.toLowerCase()).not.toContain('bearer');
    });

    it('should have SQL injection protection hints', () => {
      const serverPath = join(__dirname, 'mcp-servers', 'letmetry-mysql', 'src', 'index.ts');
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check for SQL escaping in insert operations
      expect(serverContent).toContain("replace(/'/g");
    });

    it('should have input sanitization functions', () => {
      const serverPath = join(__dirname, 'mcp-servers', 'letmetry-mysql', 'src', 'index.ts');
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check for sanitization functions
      expect(serverContent).toContain('sanitizeIdentifier');
      expect(serverContent).toContain('escapeStringValue');
      expect(serverContent).toContain('validateLimit');
    });

    it('should validate SQL identifiers with regex', () => {
      const serverPath = join(__dirname, 'mcp-servers', 'letmetry-mysql', 'src', 'index.ts');
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check for identifier validation regex
      expect(serverContent).toContain('[a-zA-Z0-9_');
      expect(serverContent).toContain('Invalid identifier');
    });

    it('should escape backslashes and quotes in string values', () => {
      const serverPath = join(__dirname, 'mcp-servers', 'letmetry-mysql', 'src', 'index.ts');
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check for proper escaping
      expect(serverContent).toContain("replace(/\\\\/g");
      expect(serverContent).toMatch(/escapeStringValue/);
    });

    it('should limit query results to prevent abuse', () => {
      const serverPath = join(__dirname, 'mcp-servers', 'letmetry-mysql', 'src', 'index.ts');
      const serverContent = readFileSync(serverPath, 'utf-8');
      
      // Check for limit validation
      expect(serverContent).toContain('validateLimit');
      expect(serverContent).toContain('10000'); // Max limit
    });
  });
});
