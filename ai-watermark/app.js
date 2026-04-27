// AI Watermark Poll App
const questionConfig = {
    title: "AI水印公投",
    question: "是否应强制为 AI 生成的图片/视频添加明显的识别水印？",
    options: [
        { value: "mandate", label: "强制添加明显水印（支持）" },
        { value: "optin", label: "应由平台/作者自主选择（非强制）" },
        { value: "no", label: "不应强制，会限制创作自由" },
        { value: "unsure", label: "不确定/需要更多讨论" }
    ],
    storageKey: "ai_watermark_v1.data"
};

let voteData = {};


const EVENT_ENDPOINT = 'https://letmetry.cloud/api/track';
const pageStartTime = Date.now();

function logEvent(event, data = {}) {
    const payload = {
        event,
        appId: questionConfig.storageKey.replace(/\.data$/, ''),
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0],
        ...data
    };
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(EVENT_ENDPOINT, JSON.stringify(payload));
    } else if (typeof fetch !== 'undefined') {
        fetch(EVENT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(() => {});
    }
}

function initializeApp() {
    try {
        initializeVoteData();
        attachHandlers();
    } catch (e) {
        console.error(e);
    }
}

function initializeVoteData() {
    questionConfig.options.forEach(o => voteData[o.label] = 0);
}

function attachHandlers() {
    const radios = document.querySelectorAll('input[name="vote"]');
    radios.forEach(r => r.addEventListener('change', (e) => {
        const selected = e.target.value;
        const matched = questionConfig.options.find(o => o.value === selected);
        if (matched) processVote(matched.label);
    }));
}

function processVote(label) {
    getConfig(questionConfig.storageKey, (data) => {
        if (data && typeof data === 'object') voteData = { ...data };
        voteData[label] = (voteData[label] || 0) + 1;
        updateConfig(questionConfig.storageKey, voteData);
        const questionArea = document.getElementById('questionArea'); if (questionArea) questionArea.style.display = 'none';
        const showResultBtn = document.getElementById('showResultBtn'); if (showResultBtn) showResultBtn.style.display = 'block';
    });
}

function displayResults() {
    const result = document.getElementById('result');
    if (result) {
        getConfig(questionConfig.storageKey, (data) => {
            const d = data || voteData;
            result.style.display = 'block';
            result.innerHTML = '<h2>投票结果</h2>' + JSON.stringify(d, null, 2);
        });
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
