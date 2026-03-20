export const womanaiProfile = {
    id: 'womanai',
    name: '女人爱',
    audience: '女性娱乐与生活方式人群',
    preferredCategories: ['娱乐', '美妆', '时尚', '情感', '明星'],
    preferredFormats: ['投票', 'pk', '清单'],
    positiveSignals: ['美妆', '时尚', '显白', '种草', '可分享', '明星话题', '情感共鸣', '对比强'],
    requiredQualities: ['适合投票', '轻松'],
    avoidSignals: ['硬核军事', '参数党', '血腥', '过强说教'],
    hardBlocks: ['军武', '暴力', '成人擦边'],
    titlePatterns: ['女人爱热议：{title}'],
    questionPatterns: ['你会把这一票投给谁：{title}？'],
    assetHints: ['高质感封面', '妆造细节', '明亮配色'],

    // 主题约束 - 防止重复
    topicConstraints: {
        '美妆护肤': {
            maxPerWeek: 2, cooldownDays: 3,
            avoidKeywords: ['口红', '色号', '显白', '唇色', '粉底'],
            alternatives: ['眼妆', '美甲', '香水', '发型', '素颜']
        },
        '明星话题': {
            maxPerWeek: 2, cooldownDays: 3,
            avoidKeywords: ['穿搭PK', '机场', '红毯', '对决'],
            alternatives: ['综艺', '影视角色', '经典造型', '转型']
        },
        '相似主题冷却': { cooldownDays: 7, similarityThreshold: 0.7 }
    },

    // 轮换优先级
    rotationPriority: ['情感共鸣', '生活方式', '娱乐八卦', '时尚穿搭', '明星话题', '美妆护肤'],

    // 主题创意库
    topicIdeas: {
        '情感共鸣': [
            '恋爱中最不能忍的行为', '闺蜜翻脸的原因排行',
            '分手后最难忘的瞬间', '婚姻里最重要的品质',
            '异地恋能坚持多久', '最让人心动的告白方式'
        ],
        '生活方式': [
            '独居女生必备好物', '周末最解压的活动',
            '职场女性穿搭法则', '租房vs买房观念PK',
            '早睡早起vs夜猫子', '一个人旅行目的地推荐'
        ],
        '娱乐八卦': [
            '最有综艺感的女明星', '年度最佳荧幕CP',
            '最期待回归的综艺节目', '最会整活的女爱豆',
            '最想看谁演古装剧', '童年经典动画片排行'
        ],
        '时尚穿搭': [
            '通勤包包品牌推荐', '显瘦穿搭公式',
            '春季必入单品', '约会穿搭风格PK',
            '球鞋vs高跟鞋场合选择', '小个子显高穿搭'
        ],
        '明星话题': [
            '最会穿的女明星', '转型最成功的女演员',
            '最期待的影视作品', '综艺最佳女MC',
            '经典影视角色重演', '最想合作的荧幕搭档'
        ],
        '美妆护肤': [
            '平价替代大牌彩妆', '不同肤质防晒选择',
            '秋冬唇色趋势', '素颜也好看的秘诀',
            '眼影配色公式', '香水入门推荐'
        ]
    }
};

export { checkTopicDuplicate, getRecommendedCategory } from '../../../shared/topic-dedup.js';
