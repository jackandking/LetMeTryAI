/**
 * 家长爱 · 06 少数派身份卡
 *
 * 比例全部实时读取 AWS KV 的真实投票数，绝不硬编码、不推断。
 * 失败时显示错误，不生成卡、不发 card_saved。
 */
(function () {
    'use strict';

    var KV_URL = 'https://rlyhccdr2g.execute-api.us-west-2.amazonaws.com/default/keyValueStore';
    var STORAGE_KEY = 'parent_chat_teen_v1.data';
    var QUESTION = '孩子放学回家不太想说话，你通常怎么做？';
    var COLORS = ['#ffd166', '#ff8c69', '#9d7bc9', '#5ec8c8'];

    var state = { votes: null, total: 0, choice: null, dataUrl: null, shareCompleteSent: false };

    /**
     * 读取真实票数。
     * @returns {Promise<Object>} 选项 -> 票数
     */
    function fetchVotes() {
        var url = KV_URL + '?key=' + encodeURIComponent(STORAGE_KEY) + '&sortKey=None';
        return fetch(url, { method: 'GET' }).then(function (response) {
            if (!response.ok) {
                throw new Error('票数服务返回 HTTP ' + response.status);
            }
            return response.json();
        }).then(function (data) {
            var value = data && data.value;
            if (typeof value === 'string') {
                value = JSON.parse(value);
            }
            if (!value || typeof value !== 'object') {
                throw new Error('票数数据为空');
            }
            var votes = {};
            var total = 0;
            Object.keys(value).forEach(function (key) {
                var count = Number(value[key]);
                if (!isNaN(count) && count > 0) {
                    votes[key] = count;
                    total += count;
                }
            });
            if (total < 30) {
                throw new Error('票数不足（' + total + '），暂不生成比例卡');
            }
            state.votes = votes;
            state.total = total;
            return votes;
        });
    }

    /**
     * 渲染选项按钮。
     * @param {Object} votes 选项 -> 票数
     */
    function renderOptions(votes) {
        var container = document.getElementById('options');
        container.innerHTML = '';
        Object.keys(votes).forEach(function (option) {
            var button = document.createElement('button');
            button.className = 'opt';
            button.type = 'button';
            button.textContent = option;
            button.setAttribute('data-choice', option);
            button.addEventListener('click', function () {
                choose(option);
            });
            container.appendChild(button);
        });
    }

    /**
     * 选中一派并出结果。
     * @param {string} option 选项文本
     */
    function choose(option) {
        if (!state.votes || !state.votes.hasOwnProperty(option)) {
            return;
        }
        state.choice = option;
        var buttons = document.querySelectorAll('.opt');
        Array.prototype.forEach.call(buttons, function (button) {
            button.classList.toggle('selected', button.getAttribute('data-choice') === option);
        });

        var percent = (state.votes[option] / state.total * 100);
        var isMinority = percent <= 25;
        var verdict = document.getElementById('verdict');
        verdict.innerHTML = isMinority
            ? '只有 ' + percent.toFixed(1) + '% 的家长<br>和你选了一样'
            : percent.toFixed(1) + '% 的家长<br>和你选了一样';

        var bars = document.getElementById('bars');
        bars.innerHTML = '';
        var sorted = Object.keys(state.votes).sort(function (a, b) {
            return state.votes[b] - state.votes[a];
        });
        sorted.forEach(function (name, index) {
            var pct = state.votes[name] / state.total * 100;
            var row = document.createElement('div');
            row.className = 'bar-row' + (name === option ? ' mine' : '');
            row.innerHTML =
                '<div class="bar-label"><span>' + escapeHtml(name) + '</span><span>' + pct.toFixed(1) + '%</span></div>' +
                '<div class="bar-track"><div class="bar-fill" style="width:' + pct.toFixed(1) + '%"></div></div>';
            bars.appendChild(row);
        });
        document.getElementById('source').textContent =
            '基于 ' + state.total + ' 位家长的真实投票 · ' + new Date().toISOString().slice(0, 10);

        state.dataUrl = createCardCanvas(option, percent, isMinority).toDataURL('image/png');
        document.getElementById('card-image').src = state.dataUrl;
        document.getElementById('result-section').classList.remove('hidden');

        // 分享回环判据：pl_from=share 进来的人完成首次选择，才是外环真正闭合
        if (!state.shareCompleteSent && isFromShare()) {
            state.shareCompleteSent = true;
            sendSignal('share_open_first_complete', { idea: '06', choice: option });
        }

        // 分享落地页保留对方的选择，别人点进来直接落在同一派
        try {
            var url = new URL(window.location.href);
            url.searchParams.set('choice', option);
            url.searchParams.set('pl_from', url.searchParams.get('pl_from') || 'direct');
            window.history.replaceState({}, '', url.toString());
        } catch (error) {
            // 不影响主流程
        }
    }

    /**
     * 生成 750x1100 结果卡画布。
     * @param {string} option 用户选择
     * @param {number} percent 该选项比例
     * @param {boolean} isMinority 是否为少数派
     * @returns {HTMLCanvasElement} 画布
     */
    function createCardCanvas(option, percent, isMinority) {
        var canvas = document.createElement('canvas');
        canvas.width = 750;
        canvas.height = 1100;
        var ctx = canvas.getContext('2d');
        var font = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';

        var gradient = ctx.createLinearGradient(0, 0, 750, 1100);
        gradient.addColorStop(0, '#1d1b3a');
        gradient.addColorStop(0.5, '#3a2b5f');
        gradient.addColorStop(1, '#6d4b8f');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 750, 1100);

        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = '22px ' + font;
        ctx.fillText('家长爱 · 少数派身份卡', 375, 90);

        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 62px ' + font;
        if (isMinority) {
            ctx.fillText('只有 ' + percent.toFixed(1) + '%', 375, 205);
            ctx.font = 'bold 40px ' + font;
            ctx.fillText('的家长和你一样', 375, 265);
        } else {
            ctx.fillText(percent.toFixed(1) + '%', 375, 205);
            ctx.font = 'bold 40px ' + font;
            ctx.fillText('的家长和你一样', 375, 265);
        }

        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = '26px ' + font;
        wrapText(ctx, QUESTION, 375, 345, 640, 40);

        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 34px ' + font;
        wrapText(ctx, '我选了：' + option, 375, 470, 640, 48);

        var sorted = Object.keys(state.votes).sort(function (a, b) {
            return state.votes[b] - state.votes[a];
        });
        var top = 570;
        sorted.forEach(function (name, index) {
            var pct = state.votes[name] / state.total * 100;
            var mine = name === option;
            ctx.textAlign = 'left';
            ctx.fillStyle = mine ? '#ffd166' : 'rgba(255,255,255,0.88)';
            ctx.font = (mine ? 'bold ' : '') + '22px ' + font;
            ctx.fillText(name, 80, top);
            ctx.textAlign = 'right';
            ctx.fillText(pct.toFixed(1) + '%', 670, top);
            ctx.fillStyle = 'rgba(255,255,255,0.14)';
            ctx.fillRect(80, top + 10, 590, 8);
            ctx.fillStyle = mine ? '#ffd166' : COLORS[index % COLORS.length];
            ctx.fillRect(80, top + 10, 590 * pct / 100, 8);
            top += 80;
        });

        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.font = '19px ' + font;
        ctx.fillText('基于 ' + state.total + ' 位家长的真实投票 · ' + new Date().toISOString().slice(0, 10), 375, 1015);
        ctx.fillText('letmetryai.cn 家长爱', 375, 1060);
        return canvas;
    }

    /**
     * 画布内自动换行。
     */
    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        var line = '';
        for (var i = 0; i < text.length; i++) {
            var test = line + text[i];
            if (ctx.measureText(test).width > maxWidth && line) {
                ctx.fillText(line, x, y);
                line = text[i];
                y += lineHeight;
            } else {
                line = test;
            }
        }
        if (line) {
            ctx.fillText(line, x, y);
        }
    }

    /**
     * 存图：H5 直接下载；小程序走原生相册。
     */
    function saveImage() {
        if (!state.dataUrl) {
            return;
        }
        var fileName = '家长爱-少数派身份卡.png';
        if (typeof ks === 'undefined') {
            var link = document.createElement('a');
            link.download = fileName;
            link.href = state.dataUrl;
            link.click();
            sendSignal('card_saved', { idea: '06' });
            return;
        }
        // 小程序内先上传拿到 URL，再走原生存图页
        var button = document.getElementById('save-btn');
        button.disabled = true;
        button.textContent = '正在生成…';
        fetch(state.dataUrl).then(function (response) {
            return response.blob();
        }).then(function (blob) {
            var formData = new FormData();
            formData.append('file', new File([blob], fileName, { type: 'image/png' }));
            return fetch('https://letmetry.cn/image/upload', { method: 'POST', body: formData });
        }).then(function (response) {
            return response.json();
        }).then(function (json) {
            var imageUrl = json.url || (json.data && json.data.url);
            if (!imageUrl) {
                throw new Error('图片上传未返回地址');
            }
            var returnUrl = window.location.href;
            ks.navigateTo({
                url: '/pages/save-image/save-image?imageUrl=' + encodeURIComponent(imageUrl) +
                    '&returnUrl=' + encodeURIComponent(returnUrl)
            });
            sendSignal('card_saved', { idea: '06' });
        }).catch(function (error) {
            button.textContent = '保存失败，请重试';
            sendSignal('card_save_failed', { reason: String(error.message || error).slice(0, 60) });
        }).then(function () {
            button.disabled = false;
            button.textContent = '保存这张卡';
        });
    }

    /**
     * 分享：H5 用系统分享/复制；小程序提示用右上角转发。
     */
    function shareCard() {
        var url = window.location.href;
        sendSignal('share_intent');
        if (typeof ks !== 'undefined') {
            document.getElementById('share-tip').textContent =
                '点右上角「…」转发给同样的人 —— 对方会直接看到你选的那一派。';
            return;
        }
        var shareData = {
            title: '只有 ' + (state.votes[state.choice] / state.total * 100).toFixed(1) + '% 的家长和我选了一样',
            text: '跟青春期孩子聊天，你选哪种？',
            url: url
        };
        if (navigator.share) {
            navigator.share(shareData).catch(function () {});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(function () {
                document.getElementById('share-tip').textContent = '链接已复制，发给同样的人看看。';
            });
        }
    }

    /**
     * 判断本次进入是否来自分享。
     * @returns {boolean} 是否来自分享
     */
    function isFromShare() {
        try {
            return new URLSearchParams(window.location.search).get('pl_from') === 'share';
        } catch (error) {
            return false;
        }
    }

    /**
     * 发送补充信号（主漏斗信号由 signal.js 的 data-pl-event 负责）。
     */
    function sendSignal(event, data) {
        if (window.PL && typeof window.PL.track === 'function') {
            window.PL.track(event, data || { idea: '06' });
        }
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 启动。
     */
    function init() {
        document.getElementById('save-btn').addEventListener('click', saveImage);
        document.getElementById('share-btn').addEventListener('click', shareCard);

        fetchVotes().then(function (votes) {
            renderOptions(votes);
            var params = new URLSearchParams(window.location.search);
            var incoming = params.get('choice');
            if (incoming && votes.hasOwnProperty(incoming)) {
                choose(incoming);
            }
        }).catch(function (error) {
            var box = document.getElementById('error-box');
            box.textContent = '暂时拿不到真实票数：' + (error.message || error) + '。不生成比例卡，请稍后再来。';
            box.classList.remove('hidden');
            sendSignal('votes_unavailable', { reason: String(error.message || error).slice(0, 60) });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
