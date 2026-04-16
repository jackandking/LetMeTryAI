/**
 * Structured logging for Harness
 */
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { PATHS } from '../config/index.js';
export class Logger {
    component;
    logFile;
    constructor(component) {
        this.component = component;
        this.logFile = join(PATHS.logs, `${component}.log`);
        this.ensureLogDir();
    }
    ensureLogDir() {
        if (!existsSync(PATHS.logs)) {
            mkdirSync(PATHS.logs, { recursive: true });
        }
    }
    formatEntry(level, message, data) {
        return {
            timestamp: new Date().toISOString(),
            level,
            component: this.component,
            message,
            data,
        };
    }
    write(entry) {
        const line = JSON.stringify(entry) + '\n';
        // Console output
        const color = this.getColor(entry.level);
        console.log(`${color}[${entry.level.toUpperCase()}][${this.component}]${'\x1b[0m'} ${entry.message}`);
        // File output
        try {
            appendFileSync(this.logFile, line);
        }
        catch {
            // Ignore file write errors
        }
    }
    getColor(level) {
        switch (level) {
            case 'debug': return '\x1b[36m';
            case 'info': return '\x1b[32m';
            case 'warn': return '\x1b[33m';
            case 'error': return '\x1b[31m';
            default: return '\x1b[0m';
        }
    }
    debug(message, data) {
        this.write(this.formatEntry('debug', message, data));
    }
    info(message, data) {
        this.write(this.formatEntry('info', message, data));
    }
    warn(message, data) {
        this.write(this.formatEntry('warn', message, data));
    }
    error(message, error, data) {
        this.write(this.formatEntry('error', message, {
            ...data,
            errorMessage: error?.message,
            errorStack: error?.stack,
        }));
    }
    static create(component) {
        return new Logger(component);
    }
}
export const logger = Logger.create('harness');
//# sourceMappingURL=logger.js.map