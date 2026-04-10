/**
 * Simple TypeScript loader for Node.js
 * Uses built-in TypeScript support (Node 22.6+)
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { transformSync } from 'module';

const EXTENSIONS = ['.ts', '.mts', '.cts'];

function compile(source, filename) {
  // Simple transformation: strip types
  // In production, use proper TypeScript compilation
  return source
    .replace(/:\s*[A-Z][a-zA-Z0-9_<>[\]|&]*\s*([=,);])/g, '$1')  // Remove type annotations
    .replace(/interface\s+\w+\s*\{[^}]*\}/g, '')  // Remove interfaces
    .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')  // Remove type aliases
    .replace(/as\s+[A-Z][a-zA-Z0-9_<>[\]|&]*/g, '')  // Remove type assertions
    .replace(/import\s+type\s+/g, '// import type ');  // Comment out type imports
}

export async function load(url, context, nextLoad) {
  const filename = fileURLToPath(url);
  
  if (EXTENSIONS.some(ext => filename.endsWith(ext))) {
    const source = readFileSync(filename, 'utf8');
    const compiled = compile(source, filename);
    
    return {
      format: 'module',
      source: compiled,
      shortCircuit: true,
    };
  }
  
  return nextLoad(url, context);
}

export function resolve(specifier, context, nextResolve) {
  // Handle .js imports from .ts files
  if (specifier.endsWith('.js')) {
    const tsSpecifier = specifier.replace(/\.js$/, '.ts');
    try {
      return nextResolve(tsSpecifier, context);
    } catch {
      // Fall through to original
    }
  }
  
  return nextResolve(specifier, context);
}
