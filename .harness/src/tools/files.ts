/**
 * File System Tools - Directory and file operations
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { Tool } from '../types/index.js';
import { PATHS } from '../config/index.js';
import { logger } from '../utils/logger.js';

interface WriteFileArgs {
  path: string;
  content: string;
}

interface CopyFileArgs {
  from: string;
  to: string;
}

interface EnsureDirArgs {
  path: string;
}

export const writeFileTool: Tool = {
  name: 'file.write',
  description: 'Write content to a file',
  schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path relative to project root' },
      content: { type: 'string', description: 'Content to write' },
    },
    required: ['path', 'content'],
  },
  async execute(args: unknown): Promise<unknown> {
    const { path: filePath, content } = args as WriteFileArgs;
    const fullPath = join(PATHS.projectRoot, filePath);
    
    // Ensure directory exists
    mkdirSync(dirname(fullPath), { recursive: true });
    
    writeFileSync(fullPath, content, 'utf-8');
    logger.info('File written', { path: filePath, size: content.length });
    
    return { written: true, path: filePath, size: content.length };
  },
};

export const copyFileTool: Tool = {
  name: 'file.copy',
  description: 'Copy a file',
  schema: {
    type: 'object',
    properties: {
      from: { type: 'string', description: 'Source path' },
      to: { type: 'string', description: 'Destination path' },
    },
    required: ['from', 'to'],
  },
  async execute(args: unknown): Promise<unknown> {
    const { from, to } = args as CopyFileArgs;
    const fromPath = join(PATHS.projectRoot, from);
    const toPath = join(PATHS.projectRoot, to);
    
    mkdirSync(dirname(toPath), { recursive: true });
    copyFileSync(fromPath, toPath);
    
    logger.info('File copied', { from, to });
    return { copied: true, from, to };
  },
};

export const ensureDirTool: Tool = {
  name: 'dir.ensure',
  description: 'Ensure a directory exists',
  schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Directory path' },
    },
    required: ['path'],
  },
  async execute(args: unknown): Promise<unknown> {
    const { path: dirPath } = args as EnsureDirArgs;
    const fullPath = join(PATHS.projectRoot, dirPath);
    
    mkdirSync(fullPath, { recursive: true });
    logger.info('Directory ensured', { path: dirPath });
    
    return { ensured: true, path: dirPath };
  },
};

export const readTemplateTool: Tool = {
  name: 'template.read',
  description: 'Read a template file',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Template name (fighter-jets, etc.)' },
    },
    required: ['name'],
  },
  async execute(args: unknown): Promise<unknown> {
    const { name } = args as { name: string };
    const templatePath = join(PATHS.projectRoot, name, 'styles.css');
    
    if (!existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }
    
    const content = readFileSync(templatePath, 'utf-8');
    return { content, path: templatePath };
  },
};
