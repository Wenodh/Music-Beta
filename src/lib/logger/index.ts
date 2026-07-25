const isDev = import.meta.env.DEV;

export const Logger = {
    debug: (message: string, payload?: any) => {
        if (isDev) {
            if (payload) {
                console.debug(`[DEBUG] ${message}`, payload);
            } else {
                console.debug(`[DEBUG] ${message}`);
            }
        }
    },
    info: (message: string, payload?: any) => {
        if (payload) {
            console.info(`[INFO] ${message}`, payload);
        } else {
            console.info(`[INFO] ${message}`);
        }
    },
    warn: (message: string, payload?: any) => {
        if (payload) {
            console.warn(`[WARN] ${message}`, payload);
        } else {
            console.warn(`[WARN] ${message}`);
        }
    },
    error: (message: string, payload?: any) => {
        if (payload) {
            console.error(`[ERROR] ${message}`, payload);
        } else {
            console.error(`[ERROR] ${message}`);
        }
    }
};
