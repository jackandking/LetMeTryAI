interface PublishConfig {
    profileId: string;
    appId: string;
    appName: string;
    description?: string;
}
interface PublishResult {
    success: boolean;
    planId?: string;
    error?: string;
}
export declare class KuaishouPublisher {
    private config;
    private cookies;
    private sourceTaskId;
    constructor(config: PublishConfig);
    private sanitizeAppName;
    publish(): Promise<PublishResult>;
    private extractCookies;
    private apiPost;
    private apiGet;
    private fetchTemplateDetail;
    private checkText;
    private checkResource;
    private generateAiCover;
    private createDistributionTask;
}
export declare function publishToKuaishou(profileId: string, appId: string, appName: string, description?: string): Promise<PublishResult>;
export {};
//# sourceMappingURL=kuaishou-publisher.d.ts.map