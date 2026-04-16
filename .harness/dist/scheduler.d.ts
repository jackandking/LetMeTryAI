export declare class HarnessScheduler {
    private jobs;
    private mode;
    constructor();
    /**
     * Start all scheduled jobs
     */
    start(): void;
    /**
     * Schedule a single profile
     */
    private scheduleProfile;
    /**
     * Run a profile immediately (for testing)
     */
    runNow(profileId: string): Promise<void>;
    /**
     * Stop all jobs
     */
    stop(): void;
    /**
     * Get status of all jobs
     */
    getStatus(): Record<string, unknown>;
}
//# sourceMappingURL=scheduler.d.ts.map