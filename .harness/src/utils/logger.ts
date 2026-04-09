/**
 * Structured logging for Harness
 */
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { PATHS } from '../config/index.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: Record<string, unknown>;
}

export class Logger {
  private component: string;
  private logFile: string;

  constructor(component: string) {
    this.component = component;
    this.logFile = join(PATHS.logs, `${component}.log`);
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    if (!existsSync(PATHS.logs)) {
      mkdirSync(PATHS.logs, { recursive: true });
    }
  }

  private formatEntry(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      data,
    };
  }

  private write(entry: LogEntry): void {
    const line = JSON.stringify(entry) + '\n';
    
    // Console output
    const color = this.getColor(entry.level);
    console.log(`${color}[${entry.level.toUpperCase()}][${this.component}]${'\x1b[0m'} ${entry.message}`);
    
    // File output
    try {
      appendFileSync(this.logFile, line);
    } catch {
      // Ignore file write errors
    }
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case 'debug': return '\x1b[36m';
      case 'info': return '\x1b[32m';
      case 'warn': return '\x1b[33m';
      case 'error': return '\x1b[31m';
      default: return '\x1b[0m';
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.write(this.formatEntry('debug', message, data));
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.write(this.formatEntry('info', message, data));
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.write(this.formatEntry('warn', message, data));
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.write(this.formatEntry('error', message, {
      ...data,
      errorMessage: error?.message,
      errorStack: error?.stack,
    }));
  }

  static create(component: string): Logger {
    return new Logger(component);
  }
}

export const logger = Logger.create('harness');
