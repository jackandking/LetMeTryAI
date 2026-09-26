// Centralized configuration for {{APP_NAME}}
// apiBase: MySQL/API 服务地址
// contentTable: 内容图片表名
// allowAd: 是否启用赞助广告赚积分
(function (global) {
    const config = {
        appId: '{{APP_ID}}',
        appName: '{{APP_NAME}}',
        category: '{{CATEGORY}}',
        description: '{{DESCRIPTION}}',
        apiBase: '{{API_BASE}}',
        contentTable: '{{CONTENT_TABLE}}',
        allowAd: {{ALLOW_AD}},
        mysqlPath: '/mysql/query'
    };

    config.mysqlQueryUrl = config.apiBase + config.mysqlPath;

    if (typeof global !== 'undefined') global.APP_CONFIG = config;
    if (typeof window !== 'undefined') window.APP_CONFIG = config;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));