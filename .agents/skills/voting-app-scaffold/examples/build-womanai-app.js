import { getBrandProfile } from '../../brand-profiles/scripts/profile-loader.js';
import { buildTopicBrief } from '../../topic-selector/scripts/topic-selector.js';
import { buildScaffoldPlan } from '../scripts/scaffold.js';

const profile = getBrandProfile('womanai');
const brief = buildTopicBrief(
    {
        title: '春季口红新色大 PK',
        category: '美妆',
        format: '投票',
        keywords: ['口红', '显白', '种草']
    },
    profile
);

const plan = buildScaffoldPlan({
    appId: 'spring-lipstick',
    appName: '春季显白色号',
    category: '娱乐',
    topicBrief: brief,
    brandProfile: profile,
    options: [
        { value: 'milk-tea', label: '奶茶裸调', image: 'milk-tea.jpg' },
        { value: 'rose', label: '玫瑰豆沙', image: 'rose.jpg' },
        { value: 'berry', label: '莓果红棕', image: 'berry.jpg' }
    ],
    coverImage: 'spring-lipstick/images/cover.jpg',
    tags: ['美妆', '显白', '种草'],
    inputName: 'lipstick'
});

console.log(plan.files.appJsQuestionConfig);
console.log(plan.files.indexOptionsMarkup);
console.log(plan.metadataEntry);
