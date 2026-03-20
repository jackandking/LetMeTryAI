export const parentToolsProfile = {
    id: 'parent-tools',
    name: '家长爱',
    audience: '家长教育与家庭决策人群',
    preferredCategories: ['教育', '家庭', '工具', '成长', '生活'],
    preferredFormats: ['投票', '清单', '选择题'],
    positiveSignals: ['教育', '决策', '省心', '实用', '可执行', '家庭沟通', '适合投票'],
    requiredQualities: ['实用', '可执行'],
    avoidSignals: ['纯八卦', '极端情绪', '空泛鸡汤'],
    hardBlocks: ['擦边', '暴力', '赌博'],
    titlePatterns: ['家长话题：{title}'],
    questionPatterns: ['站在家长视角，你会怎么选：{title}？'],
    assetHints: ['清晰图示', '家庭场景', '教育工具感'],

    // 主题约束 - 防止重复
    topicConstraints: {
        '教育学习': {
            maxPerWeek: 2, cooldownDays: 3,
            avoidKeywords: ['作业', '成绩', '考试', '补习', '课外班'],
            alternatives: ['阅读', '运动习惯', '社交能力', '劳动教育']
        },
        '数码管理': {
            maxPerWeek: 1, cooldownDays: 5,
            avoidKeywords: ['手机', '屏幕', '手机管理', '网瘾'],
            alternatives: ['户外活动', '亲子游', '家务分工', '家庭会议']
        },
        '相似主题冷却': { cooldownDays: 7, similarityThreshold: 0.7 }
    },

    // 轮换优先级
    rotationPriority: ['亲子沟通', '家庭生活', '实用工具', '成长决策', '教育学习'],

    // 主题创意库
    topicIdeas: {
        '亲子沟通': [
            '孩子发脾气怎么回应', '如何跟青春期孩子聊天',
            '表扬方式哪种更有效', '孩子说谎该怎么处理',
            '兄弟姐妹吵架谁来管', '如何让孩子主动分享学校事'
        ],
        '家庭生活': [
            '周末亲子活动怎么安排', '家务分工谁说了算',
            '家庭旅行目的地选择', '过年压岁钱怎么管',
            '二胎家庭资源分配', '全家运动方式推荐'
        ],
        '实用工具': [
            '儿童书包怎么选', '护眼台灯对比',
            '学习APP哪个好用', '儿童手表功能PK',
            '家庭打印机选购', '错题整理方法对比'
        ],
        '成长决策': [
            '几岁开始学英语合适', '兴趣班选择困难症',
            '住校vs走读怎么选', '零花钱该不该给',
            '孩子要不要出国留学', '学区房值不值得买'
        ],
        '教育学习': [
            '阅读习惯怎么养成', '运动对学习的帮助',
            '如何培养自律能力', '劳动教育的正确打开方式',
            '课外阅读书单推荐', '暑假计划怎么定'
        ]
    }
};

export { checkTopicDuplicate, getRecommendedCategory } from '../../../shared/topic-dedup.js';
