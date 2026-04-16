/**
 * Daily App Agent - Full implementation
 */
import type { TaskState } from '../types/index.js';
export declare class DailyAppAgent {
    private profileId;
    private loop;
    private constraints;
    private registry;
    private profile;
    constructor(profileId: string);
    private registerActions;
    run(): Promise<TaskState>;
    private writeFile;
    private ensureDir;
    private runGit;
    private runCommand;
    private handleHumanIntervention;
    private logStep;
}
//# sourceMappingURL=daily-app-agent.d.ts.map