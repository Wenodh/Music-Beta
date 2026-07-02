export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    category: string;
    message: string;
    data?: any;
}

export interface LogTransport {
    log(entry: LogEntry): void;
}

export class ConsoleTransport implements LogTransport {
    log(entry: LogEntry): void {
        const msg = `[${entry.category}] ${entry.message}`;
        switch (entry.level) {
            case 'debug':
                if (import.meta.env.DEV) console.debug(msg, entry.data || '');
                break;
            case 'info': console.info(msg, entry.data || ''); break;
            case 'warn': console.warn(msg, entry.data || ''); break;
            case 'error': console.error(msg, entry.data || ''); break;
        }
    }
}

export class MemoryTransport implements LogTransport {
    private logs: LogEntry[] = [];
    private maxLogs = 1000;

    log(entry: LogEntry): void {
        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    getLogs(): LogEntry[] {
        return [...this.logs];
    }

    clear(): void {
        this.logs = [];
    }
}

export class Logger {
    private transports: LogTransport[] = [new ConsoleTransport()];
    private memoryTransport = new MemoryTransport();

    constructor() {
        this.transports.push(this.memoryTransport);
    }

    log(level: LogLevel, category: string, message: string, data?: any) {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            data
        };
        this.transports.forEach(t => t.log(entry));
    }

    debug(category: string, message: string, data?: any) { this.log('debug', category, message, data); }
    info(category: string, message: string, data?: any) { this.log('info', category, message, data); }
    warn(category: string, message: string, data?: any) { this.log('warn', category, message, data); }
    error(category: string, message: string, data?: any) { this.log('error', category, message, data); }

    getMemoryLogs(): LogEntry[] {
        return this.memoryTransport.getLogs();
    }

    exportLogs(): string {
        return JSON.stringify(this.getMemoryLogs(), null, 2);
    }

    addTransport(transport: LogTransport) {
        this.transports.push(transport);
    }
}

export const logger = new Logger();
