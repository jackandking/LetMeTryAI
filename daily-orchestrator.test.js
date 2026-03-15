import fs from 'fs';
import os from 'os';
import path from 'path';
import {
    extractJsonObject,
    formatProgressHeartbeat,
    materializeScaffoldPlan,
    parseCopilotEventStream,
    parseTopicSelectionResponse,
    resolveGitPushTarget,
    writeEmailDrafts,
    upsertAppsMetadata
} from './scripts/daily-orchestrator.js';
import { buildScaffoldPlan } from './.agents/skills/voting-app-scaffold/scripts/scaffold.js';
import { validateVotingAppDirectory } from './scripts/validate-voting-app.js';

describe('daily-orchestrator', () => {
    it('extracts JSON from noisy Copilot output', () => {
        const raw = [
            '我已经完成了检索。',
            '```json',
            '{"profileId":"nanrenbao","topicCandidates":[{"title":"055对决","question":"你选谁？","category":"军事","format":"vote","keywords":["055"],"signals":["硬核"],"qualities":["直观"],"riskFlags":[],"options":[{"label":"055"},{"label":"伯克III"}]}]}',
            '```'
        ].join('\n');

        expect(extractJsonObject(raw)).toContain('"profileId":"nanrenbao"');
    });

    it('normalizes parsed topic selection response', () => {
        const response = parseTopicSelectionResponse(
            '{"topicCandidates":[{"title":"055对决","question":"你选谁？","category":"军事","format":"vote","keywords":["055"],"signals":["硬核"],"qualities":["直观"],"riskFlags":[],"options":[{"label":"055型驱逐舰"},{"label":"伯克III"}]}]}'
        );

        expect(response.profileId).toBe('nanrenbao');
        expect(response.topicCandidates[0].options[0].image).toBe('055.svg');
        expect(response.topicCandidates[0].options[1].value).toBe('iii');
    });

    it('extracts assistant content from copilot json event stream', () => {
        const eventStream = [
            '{"type":"session.tools_updated","data":{"model":"gpt-5-mini"}}',
            '{"type":"assistant.message_delta","data":{"deltaContent":"{\\""}}',
            '{"type":"assistant.message","data":{"content":"{\\"profileId\\":\\"nanrenbao\\",\\"topicCandidates\\":[{\\"title\\":\\"055对决\\",\\"question\\":\\"你选谁？\\",\\"category\\":\\"军事\\",\\"format\\":\\"vote\\",\\"keywords\\":[\\"055\\"],\\"signals\\":[\\"硬核\\"],\\"qualities\\":[\\"直观\\"],\\"riskFlags\\":[],\\"options\\":[{\\"label\\":\\"055型驱逐舰\\"},{\\"label\\":\\"伯克III\\"}]}]}"}}'
        ].join('\n');

        const content = parseCopilotEventStream(eventStream);
        expect(content).toContain('"profileId":"nanrenbao"');
    });

    it('formats heartbeat messages for long-running stages', () => {
        expect(formatProgressHeartbeat('Kuaishou publish', 31234)).toBe(
            'Kuaishou publish still running (31s elapsed)'
        );
    });

    it('creates app directory, assets, and metadata deterministically', () => {
        const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-orchestrator-'));
        const stylesTemplatePath = path.join(tempRoot, 'fighter-jets', 'styles.css');
        const appsMetadataPath = path.join(tempRoot, 'apps-metadata.json');

        fs.mkdirSync(path.dirname(stylesTemplatePath), { recursive: true });
        fs.writeFileSync(stylesTemplatePath, 'body { color: #123456; }', 'utf-8');
        fs.writeFileSync(appsMetadataPath, JSON.stringify({ apps: [] }, null, 2), 'utf-8');

        const scaffoldPlan = buildScaffoldPlan({
            appId: 'daily-destroyer',
            appName: '055大驱争霸',
            category: '军事',
            title: '055大驱争霸',
            question: '你更看好哪艘战舰？',
            description: '海军神盾舰投票',
            coverImage: 'daily-destroyer/images/type-055.svg',
            options: [
                { label: '055型驱逐舰', value: 'type-055', image: 'type-055.svg' },
                { label: '伯克III', value: 'burke-iii', image: 'burke-iii.svg' }
            ],
            tags: ['军事', '海军']
        });

        const result = materializeScaffoldPlan({
            scaffoldPlan,
            repoDir: tempRoot,
            appsMetadataPath,
            stylesTemplatePath
        });

        expect(fs.existsSync(path.join(result.outputDir, 'index.html'))).toBe(true);
        expect(fs.existsSync(path.join(result.outputDir, 'app.js'))).toBe(true);
        expect(fs.existsSync(path.join(result.outputDir, 'styles.css'))).toBe(true);
        expect(fs.existsSync(path.join(result.outputDir, 'images', 'type-055.svg'))).toBe(true);
        expect(validateVotingAppDirectory(result.outputDir).valid).toBe(true);

        const metadata = JSON.parse(fs.readFileSync(appsMetadataPath, 'utf-8'));
        expect(metadata.apps[0].id).toBe('daily-destroyer');
        expect(metadata.apps[0].image).toBe('daily-destroyer/images/type-055.svg');
    });

    it('upserts metadata entries by app id', () => {
        const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-orchestrator-meta-'));
        const appsMetadataPath = path.join(tempRoot, 'apps-metadata.json');
        fs.writeFileSync(appsMetadataPath, JSON.stringify({ apps: [{ id: 'keep-me', name: 'keep' }] }, null, 2));

        upsertAppsMetadata(appsMetadataPath, { id: 'keep-me', name: 'updated' });
        upsertAppsMetadata(appsMetadataPath, { id: 'new-one', name: 'new' });

        const metadata = JSON.parse(fs.readFileSync(appsMetadataPath, 'utf-8'));
        expect(metadata.apps).toHaveLength(2);
        expect(metadata.apps[0].id).toBe('new-one');
        expect(metadata.apps[1].name).toBe('updated');
    });

    it('builds explicit push refspecs for temporary worktrees', () => {
        expect(
            resolveGitPushTarget({
                pushBranch: 'main',
                pushRemote: 'origin'
            })
        ).toEqual({
            remote: 'origin',
            branch: 'main',
            refspec: 'HEAD:main'
        });
    });

    it('writes timestamped and latest email drafts outside tracked files', () => {
        const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-email-draft-'));
        const latestPath = path.join(tempRoot, '.runtime', 'email-drafts', 'latest.txt');
        const fixedDate = new Date('2026-03-15T00:20:59.000Z');

        const result = writeEmailDrafts(latestPath, ['line1', 'line2'], fixedDate);

        expect(result.latestPath).toBe(latestPath);
        expect(result.historyPath).toContain('.runtime/email-drafts/email-draft-2026-03-15T00-20-59-000Z.txt');
        expect(fs.readFileSync(latestPath, 'utf-8')).toContain('line1');
        expect(fs.readFileSync(result.historyPath, 'utf-8')).toContain('line2');
    });
});
