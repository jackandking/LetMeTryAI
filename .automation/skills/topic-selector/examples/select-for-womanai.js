import { getBrandProfile } from '../../brand-profiles/scripts/profile-loader.js';
import { buildTopicBrief, rankTopicCandidates } from '../scripts/topic-selector.js';

const candidates = [
    {
        title: '春季口红新色大 PK',
        summary: '豆沙色、奶茶色、玫瑰色谁更显白',
        category: '美妆',
        format: '投票',
        keywords: ['口红', '显白', '种草'],
        signals: ['美妆', '时尚', '对比强', '适合投票'],
        qualities: ['轻松', '可分享'],
        riskFlags: []
    },
    {
        title: '谁才是新一代主战坦克之王',
        summary: '比拼火力、机动和防护',
        category: '军事',
        format: '投票',
        keywords: ['坦克', '主战坦克'],
        signals: ['硬核科技', '对比强'],
        qualities: ['适合投票'],
        riskFlags: []
    }
];

const profile = getBrandProfile('womanai');
const ranked = rankTopicCandidates(candidates, profile, { limit: 1 });

console.log(ranked[0]);
console.log(buildTopicBrief(ranked[0].candidate, profile));
