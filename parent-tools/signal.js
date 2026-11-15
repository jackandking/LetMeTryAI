/**
 * 家长爱 · 轻量信号采集器（零依赖）
 *
 * 设计约束：
 * - 只发匿名事件（会话级随机 sessionId，跨天不可追踪），不收集孩子姓名/照片/学校。
 * - 不依赖任何业务代码；新页面加一行 <script src="/parent-tools/signal.js"></script> 即接入。
 * - appId 约定 pl.<ideaId>.<topic>，由 <meta name="pl-app"> 指定，缺省从路径推断。
 *
 * 用法：
 *   <meta name="pl-app" content="pl.06.parent-chat-teen">
 *   <div data-pl-event="tool_open" data-pl-tool="parent-type-test">...</div>
 *   <div id="brief-result" class="hidden" data-pl-result data-pl-idea="01">...</div>
 *   window.PL.track('card_saved', { idea: '06' });
 */
(function () {
    'use strict';

    var ENDPOINT = 'https://letmetry.cn/api/track';
    var PREFIX = 'pl.';
    var BLOCKED_KEYS = ['name', 'phone', 'school', 'class', 'address', 'childName', 'studentId'];

    /**
     * @returns {string} 当前页面的匿名 appId
     */
    function getAppId() {
        var meta = document.querySelector('meta[name="pl-app"]');
        if (meta && meta.content) {
            return meta.content;
        }
        var segments = (window.location.pathname || '/').split('/').filter(Boolean);
        return PREFIX + 'web.' + (segments.length ? segments.join('.') : 'home');
    }

    /**
     * @returns {string} 会话级匿名 ID
     */
    function getSessionId() {
        try {
            var sid = window.sessionStorage.getItem('pl_sid');
            if (!sid) {
                sid = 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
                window.sessionStorage.setItem('pl_sid', sid);
            }
            return sid;
        } catch (e) {
            return 'anonymous';
        }
    }

    /**
     * @returns {string} 渠道标识，只取 utm_source / referrer 的 origin
     */
    function getChannel() {
        var params = new URLSearchParams(window.location.search);
        var utm = params.get('utm_source');
        if (utm) {
            return utm;
        }
        if (params.get('pl_from') === 'share') {
            return 'share';
        }
        try {
            return document.referrer ? new URL(document.referrer).origin : 'direct';
        } catch (e) {
            return 'direct';
        }
    }

    /**
     * 上报一个匿名事件。
     * @param {string} event 事件名，取值见 flywheel/config.json
     * @param {Object} data 附加枚举字段，身份类 key 会被丢弃
     */
    function track(event, data) {
        var payload = {
            event: event,
            appId: getAppId(),
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0],
            sessionId: getSessionId(),
            channel: getChannel()
        };
        Object.keys(data || {}).forEach(function (key) {
            if (BLOCKED_KEYS.indexOf(key) === -1) {
                payload[key] = data[key];
            }
        });
        var body = JSON.stringify(payload);
        try {
            if (navigator.sendBeacon) {
                navigator.sendBeacon(ENDPOINT, body);
            } else if (window.fetch) {
                window.fetch(ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: body,
                    keepalive: true
                }).catch(function () {});
            }
        } catch (e) {
            // 埋点失败不得影响页面主流程
        }
    }

    function setupClick() {
        document.addEventListener('click', function (e) {
            var el = e.target && e.target.closest ? e.target.closest('[data-pl-event]') : null;
            if (!el) {
                return;
            }
            var data = {};
            ['tool', 'idea', 'choice', 'option'].forEach(function (key) {
                var value = el.getAttribute('data-pl-' + key);
                if (value) {
                    data[key] = value;
                }
            });
            track(el.getAttribute('data-pl-event'), data);
        }, true);
    }

    function setupResults() {
        var nodes = document.querySelectorAll('[data-pl-result]');
        Array.prototype.forEach.call(nodes, function (node) {
            var fired = false;
            function check() {
                if (fired) {
                    return;
                }
                var hidden = node.classList.contains('hidden') ||
                    window.getComputedStyle(node).display === 'none';
                if (!hidden) {
                    fired = true;
                    var idea = node.getAttribute('data-pl-idea');
                    track('result_shown', idea ? { idea: idea } : {});
                }
            }
            check();
            if (typeof MutationObserver !== 'undefined') {
                var observer = new MutationObserver(check);
                observer.observe(node, { attributes: true, attributeFilter: ['class', 'style'] });
                if (node.parentNode) {
                    observer.observe(node.parentNode, {
                        childList: true,
                        attributes: true,
                        attributeFilter: ['class', 'style']
                    });
                }
            }
        });
    }

    window.PL = { track: track, appId: getAppId() };
    track('page_load', {});

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setupClick();
            setupResults();
        });
    } else {
        setupClick();
        setupResults();
    }
})();
