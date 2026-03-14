import { getBrandProfile } from '../../brand-profiles/scripts/profile-loader.js';
import { buildTopicBrief, rankTopicCandidates } from '../../topic-selector/scripts/topic-selector.js';
import { buildScaffoldPlan } from '../../voting-app-scaffold/scripts/scaffold.js';
import { buildPublishPlan } from '../../kuaishou-publisher/scripts/publisher.js';

/**
 * Build a lightweight reporting plan for downstream report generation.
 *
 * @param {object} spec Launch spec.
 * @param {object} selectedTopic Selected topic result.
 * @returns {object} Reporting plan.
 */
function buildReportPlan(spec, selectedTopic) {
    const report = spec.report && typeof spec.report === 'object' ? spec.report : {};

    return {
        to: typeof report.to === 'string' && report.to.trim() ? report.to.trim() : 'jackandking@163.com',
        subject: typeof report.subject === 'string' && report.subject.trim()
            ? report.subject.trim()
            : '[Copilot Report] Daily Update',
        template: typeof report.template === 'string' && report.template.trim()
            ? report.template.trim()
            : 'summary',
        summary: {
            appId: spec.appId,
            appName: spec.appName,
            profileId: spec.profileId,
            selectedTopic: selectedTopic?.candidate?.title || ''
        },
        relatedSkill: 'report-sender'
    };
}

/**
 * Build a single launch workflow by composing existing reusable skills.
 *
 * @param {object} spec Launch spec.
 * @returns {object} Full launch workflow.
 */
export function buildLaunchWorkflow(spec) {
    const source = spec && typeof spec === 'object' ? spec : {};
    if (!Array.isArray(source.topicCandidates) || source.topicCandidates.length === 0) {
        throw new Error('topicCandidates are required to build a launch workflow');
    }

    const profile = getBrandProfile(source.profileId);
    const rankedTopics = rankTopicCandidates(source.topicCandidates, profile, { limit: 3 });

    if (rankedTopics.length === 0) {
        throw new Error(`No accepted topic candidates found for profile ${source.profileId}`);
    }

    const selectedTopic = rankedTopics[0];
    const topicBrief = buildTopicBrief(selectedTopic.candidate, profile);
    const scaffoldPlan = buildScaffoldPlan({
        appId: source.appId,
        appName: source.appName,
        category: source.category,
        description: source.description || topicBrief.question,
        topicBrief,
        brandProfile: profile,
        options: source.options,
        coverImage: source.coverImage,
        tags: source.tags,
        inputName: source.inputName
    });
    const deployedUrl = typeof source.deployedUrl === 'string' && source.deployedUrl.trim()
        ? source.deployedUrl.trim()
        : `https://letmetryai.cn/${source.appId}/`;
    const publishPlan = buildPublishPlan({
        appId: scaffoldPlan.metadataEntry.id,
        appName: scaffoldPlan.metadataEntry.name,
        description: scaffoldPlan.metadataEntry.description,
        deployedUrl,
        ...(source.publish && typeof source.publish === 'object' ? source.publish : {})
    });
    const reportPlan = buildReportPlan(source, selectedTopic);

    const steps = [
        {
            id: 'select-topic',
            skill: 'topic-selector',
            title: 'Select the best topic for the target profile',
            output: selectedTopic
        },
        {
            id: 'scaffold-app',
            skill: 'voting-app-scaffold',
            title: 'Generate app scaffold outputs from the selected topic',
            output: scaffoldPlan
        },
        {
            id: 'verify-deploy',
            skill: 'manual-check',
            title: 'Verify deployment before Kuaishou publication',
            output: {
                deployedUrl,
                checks: [
                    'Confirm the page loads',
                    'Confirm images render correctly',
                    'Confirm the deployed branch is pushed'
                ]
            }
        },
        {
            id: 'publish-kuaishou',
            skill: 'kuaishou-publisher',
            title: 'Publish the deployed app to Kuaishou Spark Plan',
            output: publishPlan
        },
        {
            id: 'send-report',
            skill: 'report-sender',
            title: 'Send the launch summary report',
            output: reportPlan
        }
    ];

    return {
        summary: {
            profileId: profile.id,
            profileName: profile.name,
            appId: scaffoldPlan.metadataEntry.id,
            appName: scaffoldPlan.metadataEntry.name,
            selectedTopic: selectedTopic.candidate.title
        },
        selectedTopic,
        rankedTopics,
        topicBrief,
        scaffoldPlan,
        publishPlan,
        reportPlan,
        steps
    };
}
