export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    component: string;
    message: string;
    data?: Record<string, unknown>;
}
export declare class Logger {
    private component;
    private logFile;
    constructor(component: string);
    private ensureLogDir;
    private formatEntry;
    private write;
    private getColor;
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, error?: Error, data?: Record<string, unknown>): void;
    static create(component: string): Logger;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map