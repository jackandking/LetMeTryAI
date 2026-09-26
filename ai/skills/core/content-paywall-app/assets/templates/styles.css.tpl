/* {{APP_NAME}} - shared styles */
* { box-sizing: border-box; }

body {
    font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, #f0eaf8 0%, #e0dcf0 100%);
    color: #2a3a4a;
    min-height: 100vh;
    line-height: 1.6;
}

.site-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 16px;
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(6px);
    border-bottom: 1px solid rgba(106,63,160,0.2);
    position: sticky;
    top: 0;
    z-index: 10;
}

.site-header h1 { font-size: 22px; margin: 0; color: #6a3fa0; }
.back-link { color: #6a3fa0; text-decoration: none; font-weight: 600; font-size: 15px; }

.points-display {
    background: linear-gradient(135deg, #6a3fa0, #8f6cc0);
    color: #fff;
    padding: 6px 14px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 14px;
    white-space: nowrap;
}
.points-icon { margin-right: 2px; }

.points-notification {
    display: none;
    position: fixed;
    top: 70px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.8);
    color: #fff;
    padding: 10px 22px;
    border-radius: 999px;
    font-size: 14px;
    z-index: 1000;
}

/* Homepage entry grid */
.entry-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
    max-width: 960px;
    margin: 48px auto;
    padding: 0 16px;
}
.entry-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 34px 20px;
    background: #fff;
    border: 2px solid #e0d8f0;
    border-radius: 16px;
    text-decoration: none;
    color: #2a3a4a;
    box-shadow: 0 4px 12px rgba(106,63,160,0.12);
    transition: transform 0.3s, box-shadow 0.3s;
}
.entry-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(106,63,160,0.2); }
.entry-icon { font-size: 40px; }
.entry-title { font-weight: 700; font-size: 18px; color: #6a3fa0; }
.entry-desc { font-size: 13px; color: #5a6a7a; text-align: center; }

/* Ad bar */
.ad-bar {
    max-width: 960px;
    margin: 16px auto;
    padding: 12px 16px;
    text-align: center;
}
.ad-bar button {
    background: linear-gradient(135deg, #ff6b35, #ff8c5a);
    color: #fff;
    border: none;
    padding: 10px 22px;
    border-radius: 999px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
}

/* Image grid */
.image-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    max-width: 960px;
    margin: 20px auto 60px;
    padding: 0 16px;
}
.loading { grid-column: 1/-1; text-align: center; color: #7f8c8d; }

.image-card {
    background: #fff;
    border: 1px solid #e0d8f0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(106,63,160,0.1);
}
.thumb-wrap { position: relative; }
.thumb { width: 100%; height: 200px; object-fit: cover; display: block; cursor: pointer; }
.thumb.blurred { filter: blur(8px); }
.card-meta {
    padding: 10px;
    text-align: center;
    font-size: 13px;
    color: #5a6a7a;
}
.view-count { color: #e07b39; font-weight: 600; }
.unlock-btn {
    margin-top: 8px;
    background: linear-gradient(135deg, #6a3fa0, #8f6cc0);
    color: #fff;
    border: none;
    padding: 6px 16px;
    border-radius: 999px;
    font-size: 13px;
    cursor: pointer;
}

/* Modal */
.modal {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}
.modal-box {
    background: #fff;
    padding: 28px;
    border-radius: 16px;
    max-width: 360px;
    width: 90%;
    text-align: center;
}
.modal-box h3 { margin: 0 0 12px; color: #6a3fa0; }
.modal-box p { color: #5a6a7a; margin: 0 0 20px; }
.modal-box button {
    margin: 0 6px;
    padding: 9px 20px;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-size: 14px;
    background: linear-gradient(135deg, #6a3fa0, #8f6cc0);
    color: #fff;
}

/* Upload box */
.upload-box {
    max-width: 680px;
    margin: 24px auto;
    padding: 24px;
    background: #fff;
    border: 1px solid #e0d8f0;
    border-radius: 14px;
    box-shadow: 0 2px 8px rgba(106,63,160,0.1);
}
.upload-box label { font-weight: 600; color: #6a3fa0; display: block; margin-bottom: 8px; }
.upload-box input,
.upload-box textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ccd0dd;
    border-radius: 8px;
    font-size: 14px;
}
.upload-box textarea { resize: vertical; font-family: inherit; }
.upload-box button {
    margin-top: 12px;
    padding: 10px 22px;
    border: none;
    border-radius: 999px;
    background: linear-gradient(135deg, #6a3fa0, #8f6cc0);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
}
.upload-msg { color: #e07b39; font-weight: 600; }

.list-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px dashed #e0d8f0;
    font-size: 13px;
    word-break: break-all;
}
.list-item a { color: #6a3fa0; text-decoration: none; }

/* Responsive */
@media (max-width: 768px) {
    .entry-grid { grid-template-columns: 1fr; margin: 24px auto; }
    .image-grid { grid-template-columns: repeat(2, 1fr); }
    .site-header h1 { font-size: 19px; }
}
@media (max-width: 480px) {
    .image-grid { grid-template-columns: 1fr; }
}