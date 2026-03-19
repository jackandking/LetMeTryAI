import { buildLaunchWorkflow } from '../workflows/launch.js';

const workflow = buildLaunchWorkflow({
    profileId: 'nanrenbao',
    topicCandidates: [
        {
            title: '新一代主战坦克火力排行',
            category: '军事',
            format: '投票',
            keywords: ['坦克', '火力'],
            signals: ['硬核科技', '对比强'],
            qualities: ['适合投票', '对比强']
        },
        {
            title: '春季口红新色大 PK',
            category: '美妆',
            format: '投票',
            keywords: ['口红', '显白'],
            signals: ['美妆', '时尚'],
            qualities: ['适合投票', '轻松']
        }
    ],
    appId: 'tank-firepower',
    appName: '火力擂台',
    category: '军事',
    options: [
        { value: 'abrams', label: 'M1A2 艾布拉姆斯', image: 'abrams.jpg' },
        { value: 'type99', label: '99A 主战坦克', image: 'type99.jpg' }
    ],
    report: {
        to: 'jackandking@163.com',
        subject: '[Copilot Report] Daily Update'
    }
});

console.log(workflow.summary);
console.log(workflow.steps.map(step => ({ id: step.id, skill: step.skill })));
