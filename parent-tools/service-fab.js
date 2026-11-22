/**
 * 家长爱 · H5 悬浮客服入口（零依赖）
 *
 * 背景：web-view 是原生组件、层级最高，把 <button open-type=contact> 嵌在
 * web-view 内部会被盖住不显示（1.0.5 真机实测：只有原生 pay 页按钮可见）。
 * 方案：H5 渲染一个悬浮按钮，点击调 ks.navigateTo 跳到原生 pages/service
 * 客服页，由原生页里的 open-type=contact 按钮唤起客服会话（100% 可见）。
 *
 * 引入：<script src="/parent-tools/service-fab.js"></script>（绝对路径，子目录页通用）
 */
(function () {
    'use strict';

    var FAB_ID = 'pl-service-fab';

    function showToast(msg) {
        var t = document.createElement('div');
        t.style.cssText = 'position:fixed;left:50%;bottom:100px;transform:translateX(-50%);' +
            'z-index:100000;background:rgba(0,0,0,.75);color:#fff;padding:10px 16px;' +
            'border-radius:20px;font-size:13px;white-space:nowrap;';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function () {
            if (t.parentNode) t.parentNode.removeChild(t);
        }, 2200);
    }

    function inject() {
        if (document.getElementById(FAB_ID) || !document.body) return;

        var fab = document.createElement('div');
        fab.id = FAB_ID;
        fab.setAttribute('role', 'button');
        fab.setAttribute('aria-label', '联系客服');
        fab.style.cssText = 'position:fixed;right:16px;bottom:28px;z-index:99999;' +
            'width:56px;height:56px;box-sizing:border-box;padding-top:7px;' +
            'border-radius:28px;background:linear-gradient(135deg,#ff9a44 0%,#fc6076 100%);' +
            'color:#fff;box-shadow:0 3px 10px rgba(252,96,118,.45);' +
            'text-align:center;font-size:11px;font-weight:bold;cursor:pointer;';
        fab.innerHTML = '<div style="font-size:20px;line-height:24px;">💬</div>客服';

        fab.addEventListener('click', function (e) {
            e.stopPropagation();
            if (typeof ks !== 'undefined' && ks.navigateTo) {
                ks.navigateTo({ url: '/pages/service/service' });
            } else {
                // 浏览器预览环境：无小程序宿主，给明确提示（审核在小程序内走上面分支）
                showToast('请在家长爱小程序内联系客服');
            }
        });

        document.body.appendChild(fab);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject);
    } else {
        inject();
    }
})();
