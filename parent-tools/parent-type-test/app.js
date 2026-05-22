/**
 * 测测你是哪种家长类型 - 家长爱支付测试
 */

const API_BASE = 'https://letmetry.cloud';
const PRODUCT_ID = 'parent-type-test';
const PRODUCT_NAME = '测测你是哪种家长类型';
const AMOUNT = 100; // 1元 = 100分

// 测试题目
const QUESTIONS = [
    {
        id: 1,
        text: '孩子考试成绩不理想，你会怎么做？',
        options: [
            { key: 'A', text: '一起分析原因，找到改进方法', type: 'guide' },
            { key: 'B', text: '告诉他已经很棒了，下次会更好', type: 'encourage' },
            { key: 'C', text: '制定详细的学习提升计划', type: 'plan' },
            { key: 'D', text: '让他自己总结，相信他能处理好', type: 'free' }
        ]
    },
    {
        id: 2,
        text: '周末你会怎么安排亲子时间？',
        options: [
            { key: 'A', text: '去博物馆、图书馆或户外探索', type: 'guide' },
            { key: 'B', text: '去游乐园、吃好吃的，尽情玩', type: 'encourage' },
            { key: 'C', text: '按计划上兴趣班和阅读时间', type: 'plan' },
            { key: 'D', text: '孩子想干嘛就干嘛，自由安排', type: 'free' }
        ]
    },
    {
        id: 3,
        text: '孩子沉迷手机游戏，你会？',
        options: [
            { key: 'A', text: '和他约定规则，一起找替代活动', type: 'guide' },
            { key: 'B', text: '买新玩具或带他出去玩转移注意力', type: 'encourage' },
            { key: 'C', text: '严格规定每天只能玩30分钟', type: 'plan' },
            { key: 'D', text: '相信他能自己控制，不过度干预', type: 'free' }
        ]
    },
    {
        id: 4,
        text: '选择兴趣班时，你会？',
        options: [
            { key: 'A', text: '观察孩子兴趣，引导他选择', type: 'guide' },
            { key: 'B', text: '多报几个，让孩子都试试', type: 'encourage' },
            { key: 'C', text: '根据长期发展系统规划', type: 'plan' },
            { key: 'D', text: '完全尊重孩子自己的决定', type: 'free' }
        ]
    },
    {
        id: 5,
        text: '孩子遇到困难哭泣时，你会？',
        options: [
            { key: 'A', text: '引导他思考解决办法', type: 'guide' },
            { key: 'B', text: '先抱抱他，给予情感支持', type: 'encourage' },
            { key: 'C', text: '直接教他具体的解决方法', type: 'plan' },
            { key: 'D', text: '让他自己冷静一下', type: 'free' }
        ]
    }
];

// 结果定义
const RESULTS = {
    guide: {
        name: '引导型家长',
        emoji: '💡',
        brief: '你像一盏明灯，善于引导孩子自己找到答案。',
        detail: '你重视孩子的思考能力培养，倾向于通过提问和讨论帮助孩子独立解决问题，而不是直接给出答案。你相信\"授人以鱼不如授人以渔\"。',
        tips: [
            '继续保持，但偶尔也可以直接给些提示，避免孩子挫败感太强',
            '多带孩子参加需要团队协作的活动，锻炼社交引导能力',
            '注意倾听孩子的情绪，引导不等于总是说道理'
        ],
        recs: [
            { name: '家长爱 亲子沟通小测试', url: '/parent-tools/' },
            { name: '家长爱 学习兴趣投票', url: '/parent-tools/' }
        ]
    },
    encourage: {
        name: '鼓励型家长',
        emoji: '💝',
        brief: '你是孩子最温暖的港湾，善于用爱和鼓励激发自信。',
        detail: '你相信好孩子是夸出来的，总是能看到孩子的闪光点。你的温暖让孩子充满安全感，敢于尝试和表达自己。',
        tips: [
            '鼓励的同时也要设立边界，避免孩子形成依赖性',
            '尝试让孩子独立完成一些小任务，培养自主性',
            '关注孩子的真实需求，不只是情绪安抚'
        ],
        recs: [
            { name: '家长爱 孩子自信心投票', url: '/parent-tools/' },
            { name: '家长爱 表扬方式投票', url: '/parent-tools/' }
        ]
    },
    plan: {
        name: '规划型家长',
        emoji: '📋',
        brief: '你是孩子人生的总设计师，善于制定计划和目标。',
        detail: '你相信凡事预则立，不预则废。你为孩子规划清晰的发展路径，注重效率和结果，希望孩子能赢在起跑线。',
        tips: [
            '给孩子留一些自由探索的空间，过度规划可能压抑创造力',
            '计划执行中多听听孩子的想法，让他有参与感',
            '适当降低完美主义标准，允许犯错和试错'
        ],
        recs: [
            { name: '家长爱 时间管理投票', url: '/parent-tools/' },
            { name: '家长爱 学习计划投票', url: '/parent-tools/' }
        ]
    },
    free: {
        name: '放手型家长',
        emoji: '🌱',
        brief: '你给予孩子最大的信任和自由，相信他有自我成长的能力。',
        detail: '你像园丁，只提供土壤和阳光，让孩子按照自己的节奏成长。你尊重孩子的独立性，相信经历是最好的老师。',
        tips: [
            '在关键节点给予适当引导，完全放手可能让孩子缺乏安全感',
            '建立基本规则和底线，自由不等于放任',
            '多关注孩子的情绪变化，及时给予支持'
        ],
        recs: [
            { name: '家长爱 独立性培养投票', url: '/parent-tools/' },
            { name: '家长爱 自由与规则投票', url: '/parent-tools/' }
        ]
    }
};

// 状态
let currentQuestion = 0;
let answers = [];
let openid = '';

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 尝试从 URL 获取 openid
    const urlParams = new URLSearchParams(window.location.search);
    openid = urlParams.get('openid') || 'unknown_' + Date.now();

    // 环境检测调试
    const hasKs = typeof ks !== 'undefined';
    const hasKsPay = hasKs && typeof ks.pay === 'function';
    const hasMiniProgram = hasKs && ks.miniProgram && typeof ks.miniProgram.requestPayment === 'function';
    const hasNavigateTo = hasKs && ks.miniProgram && typeof ks.miniProgram.navigateTo === 'function';
    console.log('[init] Environment:', { hasKs, hasKsPay, hasMiniProgram, hasNavigateTo, userAgent: navigator.userAgent.substring(0, 50) });

    // 在页面底部添加调试信息（仅开发阶段显示）
    const debugInfo = document.createElement('div');
    debugInfo.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:rgba(0,0,0,0.8);color:#0f0;padding:8px;font-size:11px;z-index:9999;text-align:center;';
    debugInfo.id = 'debug-info';
    debugInfo.innerHTML = `环境: ks=${hasKs ? '✅' : '❌'} pay=${hasKsPay ? '✅' : '❌'} nav=${hasNavigateTo ? '✅' : '❌'} | 点击关闭`;
    debugInfo.onclick = () => debugInfo.remove();
    document.body.appendChild(debugInfo);

    renderQuestion();
    updateProgress();
});

function updateProgress() {
    const progress = document.getElementById('progress');
    if (progress) {
        const pct = ((currentQuestion) / QUESTIONS.length) * 100;
        progress.style.width = pct + '%';
    }
}

function renderQuestion() {
    const container = document.getElementById('question-container');
    if (!container) return;

    if (currentQuestion >= QUESTIONS.length) {
        showBriefResult();
        return;
    }

    const q = QUESTIONS[currentQuestion];
    container.innerHTML = `
        <div class="question-number">问题 ${currentQuestion + 1} / ${QUESTIONS.length}</div>
        <div class="question-text">${q.text}</div>
        <div class="options">
            ${q.options.map(opt => `
                <div class="option" onclick="selectOption('${opt.type}')">
                    <strong>${opt.key}.</strong> ${opt.text}
                </div>
            `).join('')}
        </div>
    `;

    // 动画效果
    container.style.opacity = '0';
    container.style.transform = 'translateX(20px)';
    setTimeout(() => {
        container.style.transition = 'all 0.4s ease';
        container.style.opacity = '1';
        container.style.transform = 'translateX(0)';
    }, 50);
}

function selectOption(type) {
    answers.push(type);
    currentQuestion++;
    updateProgress();
    renderQuestion();
}

function calculateResult() {
    const counts = { guide: 0, encourage: 0, plan: 0, free: 0 };
    answers.forEach(a => counts[a]++);

    let maxType = 'guide';
    let maxCount = 0;
    for (const [type, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            maxType = type;
        }
    }
    return maxType;
}

function showBriefResult() {
    const resultType = calculateResult();
    const result = RESULTS[resultType];

    document.getElementById('quiz-section').classList.add('hidden');
    document.getElementById('brief-result').classList.remove('hidden');

    document.getElementById('brief-result').innerHTML = `
        <div class="result-type">
            <div class="emoji">${result.emoji}</div>
            <h2>你是【${result.name}】！</h2>
            <p class="brief">${result.brief}</p>
        </div>
        <div class="price-tag">
            <div class="price">¥1.00</div>
            <div class="unit">解锁完整分析报告</div>
        </div>
        <button class="btn btn-pay" onclick="unlockReport()">🔓 立即解锁完整报告
        </button>
        <p style="text-align:center;color:#999;font-size:0.85em;margin-top:15px;">已有 <strong>2,847</strong> 位家长解锁报告</p>
    `;
}

async function unlockReport() {
    const btn = document.querySelector('.btn-pay');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span> 正在创建订单...';
    }

    try {
        // 1. 创建订单
        const res = await fetch(`${API_BASE}/api/pay/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                openid: openid,
                productId: PRODUCT_ID,
                productName: PRODUCT_NAME,
                amount: AMOUNT
            })
        });
        const data = await res.json();

        if (!data.success) {
            throw new Error(data.error || '创建订单失败');
        }

        const order = data.data;
        console.log('[pay] Order created:', order.orderId);

        // 2. 检测支付环境
        const hasKs = typeof ks !== 'undefined';
        const hasKsPay = hasKs && typeof ks.pay === 'function';
        const hasMiniProgram = hasKs && ks.miniProgram && typeof ks.miniProgram.requestPayment === 'function';
        const hasNavigateTo = hasKs && ks.miniProgram && typeof ks.miniProgram.navigateTo === 'function';
        const hasPostMessage = hasKs && ks.miniProgram && typeof ks.miniProgram.postMessage === 'function';

        console.log('[pay] Environment check:', { hasKs, hasKsPay, hasMiniProgram, hasNavigateTo, hasPostMessage });

        // 构造返回 URL：当前页 + ?paid=1
        const currentUrl = window.location.href.split('?')[0];
        const returnUrl = currentUrl + '?paid=1';

        // 3. 调起支付 - 优先级：navigateTo > postMessage > ks.pay > requestPayment > 模拟
        if (hasNavigateTo) {
            // 方式1（推荐）：小程序 webview 跳转原生支付页
            console.log('[pay] Using ks.miniProgram.navigateTo → /pages/pay/pay');
            const payUrl = `/pages/pay/pay?orderId=${order.orderId}` +
                `&appId=${order.appId}` +
                `&prepayId=${order.prepayId}` +
                `&nonceStr=${order.nonceStr}` +
                `&timeStamp=${order.timeStamp}` +
                `&sign=${encodeURIComponent(order.sign)}` +
                `&returnUrl=${encodeURIComponent(returnUrl)}`;
            ks.miniProgram.navigateTo({ url: payUrl });
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '🔓 立即解锁完整报告';
            }
        } else if (hasPostMessage) {
            // 方式2：通过 postMessage 让 rewardedWebview 中转跳转到支付页
            console.log('[pay] Using ks.miniProgram.postMessage → rewardedWebview');
            ks.miniProgram.postMessage({
                type: 'REQUEST_PAYMENT',
                data: {
                    orderId: order.orderId,
                    appId: order.appId,
                    prepayId: order.prepayId,
                    nonceStr: order.nonceStr,
                    timeStamp: order.timeStamp,
                    sign: order.sign,
                    returnUrl: returnUrl
                }
            });
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '🔓 立即解锁完整报告';
            }
        } else if (hasKsPay) {
            // 方式3：ks.pay 原生调起
            console.log('[pay] Using ks.pay');
            ks.pay({
                orderInfo: {
                    appId: order.appId,
                    prepayId: order.prepayId,
                    nonceStr: order.nonceStr,
                    timeStamp: order.timeStamp,
                    sign: order.sign
                },
                success: (res) => {
                    console.log('[pay] ks.pay success:', res);
                    setTimeout(() => showFullReport(order.orderId), 500);
                },
                fail: (err) => {
                    console.error('[pay] ks.pay fail:', err);
                    alert('支付未完成: ' + (err.errMsg || '请重试'));
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '🔓 立即解锁完整报告';
                    }
                }
            });
        } else if (hasMiniProgram) {
            // 方式4：webview 桥接 ks.miniProgram.requestPayment
            console.log('[pay] Using ks.miniProgram.requestPayment');
            ks.miniProgram.requestPayment({
                appId: order.appId,
                prepayId: order.prepayId,
                nonceStr: order.nonceStr,
                timeStamp: order.timeStamp,
                sign: order.sign,
                success: (res) => {
                    console.log('[pay] miniProgram payment success:', res);
                    setTimeout(() => showFullReport(order.orderId), 500);
                },
                fail: (err) => {
                    console.error('[pay] miniProgram payment fail:', err);
                    alert('支付未完成: ' + (err.errMsg || '请重试'));
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '🔓 立即解锁完整报告';
                    }
                }
            });
        } else {
            // 方式3：模拟支付（浏览器或非小程序环境）
            console.log('[pay] No ks API available, showing mock payment dialog');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '🔓 立即解锁完整报告';
            }

            // 显示模拟支付弹窗
            const confirmed = confirm('【测试模式】\n\n当前环境未检测到快手支付 API。\n\n点击「确定」模拟支付成功，\n点击「取消」取消支付。');
            if (confirmed) {
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '处理中...';
                }
                // 模拟调用支付回调
                fetch(`${API_BASE}/api/pay/notify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ out_order_no: order.orderId, result: 'SUCCESS' })
                }).catch(() => {});
                setTimeout(() => showFullReport(order.orderId), 800);
            }
        }
    } catch (err) {
        console.error('解锁失败:', err);
        alert('解锁失败: ' + err.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🔓 立即解锁完整报告';
        }
    }
}

async function showFullReport(orderId) {
    document.getElementById('brief-result').classList.add('hidden');
    document.getElementById('full-report').classList.remove('hidden');

    const resultType = calculateResult();
    const result = RESULTS[resultType];

    document.getElementById('full-report').innerHTML = `
        <div class="result-type">
            <div class="emoji">${result.emoji}</div>
            <h2>你是【${result.name}】</h2>
        </div>

        <div class="report-section">
            <h3>📖 育儿风格深度解析</h3>
            <p>${result.detail}</p>
        </div>

        <div class="report-section">
            <h3>💡 3条针对性建议</h3>
            <ul>
                ${result.tips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
        </div>

        <div class="report-section">
            <h3>🔗 推荐相关投票</h3>
            ${result.recs.map(rec => `
                <a class="rec-card" href="${rec.url}">${rec.name} →</a>
            `).join('')}
        </div>

        <div class="share-section">
            <h3>💜 觉得有用？分享给其他家长</h3>
            <a class="share-btn" href="#" onclick="alert('分享功能开发中...');return false;">
                📱 分享给好友
            </a>
        </div>

        <div style="text-align:center;margin-top:30px;">
            <button class="btn btn-primary" onclick="location.reload()">🔄 再测一次</button>
        </div>
    `;

    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
