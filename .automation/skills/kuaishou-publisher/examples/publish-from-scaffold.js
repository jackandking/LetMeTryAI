import { buildPublishPlan } from '../scripts/publisher.js';

const plan = buildPublishPlan({
    appId: 'spring-lipstick',
    appName: '春季显白色号',
    description: '投票选出春季最显白的热门色号',
    deployedUrl: 'https://letmetryai.cn/spring-lipstick/'
});

console.log(plan.command);
console.log(plan.checklist);
console.log(plan.dependencies);
