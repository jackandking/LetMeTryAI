// ======================================================
// User OAuth: let end-users authorize and publish their own videos
// Add this AFTER the existing /oauth/kuaishou/refresh route
// ======================================================

const { execSync } = require('child_process');

// User authorize - redirect to Kuaishou OAuth page
app.get('/oauth/kuaishou/user-authorize', (req, res) => {
    const { state } = req.query;
    if (!state) {
        return res.status(400).json({ error: 'Missing state parameter' });
    }

    const redirectUri = encodeURIComponent('https://letmetry.cloud/oauth/kuaishou/user-callback');
    const scope = 'user_info,user_video_publish';
    const authUrl = `https://open.kuaishou.com/oauth2/authorize?client_id=${KUAISHOU_APP_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${encodeURIComponent(state)}`;

    console.log('[user-oauth] Redirecting to Kuaishou auth:', state.substring(0, 50));
    res.redirect(authUrl);
});

// User callback - exchange code, generate video from image, publish
app.get('/oauth/kuaishou/user-callback', async (req, res) => {
    // Note: this overrides the existing callback. We check for state param to distinguish.
    const { code, state } = req.query;

    // If no state, fall through to existing single-creator callback logic
    if (!state) {
        // --- existing callback logic (single creator) ---
        if (!code) return res.status(400).json({ error: 'Missing code parameter' });
        console.log('[kuaishou-oauth] Received code (creator):', code);
        try {
            const tokenUrl = 'https://open.kuaishou.com/oauth2/access_token'
                + '?app_id=' + KUAISHOU_APP_ID
                + '&app_secret=' + KUAISHOU_APP_SECRET
                + '&code=' + code
                + '&grant_type=authorization_code';
            const resp = await fetch(tokenUrl);
            const data = await resp.json();
            if (data.result === 1) {
                const tokenData = {
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    open_id: data.open_id,
                    expires_at: Date.now() + data.expires_in * 1000,
                    refresh_expires_at: Date.now() + data.refresh_token_expires_in * 1000,
                    scopes: data.scopes,
                    updated_at: new Date().toISOString(),
                };
                fs.writeFileSync(KUAISHOU_TOKEN_FILE, JSON.stringify(tokenData, null, 2));
                res.send('<h1>授权成功！</h1><p>access_token 已保存。</p>');
            } else {
                res.status(400).json({ error: data.error_msg || 'Failed' });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
        return;
    }

    // --- User OAuth callback with state ---
    if (!code) {
        return res.redirect('https://letmetryai.cn/quguona/?published=error&msg=' + encodeURIComponent('授权取消'));
    }

    let stateData;
    try {
        stateData = JSON.parse(state);
    } catch {
        return res.redirect('https://letmetryai.cn/quguona/?published=error&msg=' + encodeURIComponent('state无效'));
    }

    console.log('[user-oauth] Callback for user, state:', JSON.stringify(stateData).substring(0, 100));

    try {
        // 1. Exchange code for user token
        const tokenUrl = 'https://open.kuaishou.com/oauth2/access_token'
            + '?app_id=' + KUAISHOU_APP_ID
            + '&app_secret=' + KUAISHOU_APP_SECRET
            + '&code=' + code
            + '&grant_type=authorization_code';
        const tokenResp = await fetch(tokenUrl);
        const tokenData = await tokenResp.json();
        if (tokenData.result !== 1) {
            throw new Error('Token exchange failed: ' + (tokenData.error_msg || 'unknown'));
        }
        const userToken = tokenData.access_token;
        console.log('[user-oauth] Got user token, open_id:', tokenData.open_id);

        // 2. Get user info
        const userResp = await fetch(`https://open.kuaishou.com/openapi/user_info?access_token=${userToken}&app_id=${KUAISHOU_APP_ID}`);
        const userData = await userResp.json();
        const userName = userData.user_info?.name || stateData.nickname || '用户';
        console.log('[user-oauth] User name:', userName);

        // 3. Download the uploaded image
        const imageUrl = stateData.image_url;
        const tmpDir = path.join(__dirname, 'data', 'user_publish_' + Date.now());
        fs.mkdirSync(tmpDir, { recursive: true });
        const imgPath = path.join(tmpDir, 'map.png');
        const imgResp = await fetch(imageUrl);
        const imgBuf = Buffer.from(await imgResp.arrayBuffer());
        fs.writeFileSync(imgPath, imgBuf);

        // 4. Convert image to 5-second video with ffmpeg
        const videoPath = path.join(tmpDir, 'output.mp4');
        execSync(`ffmpeg -y -loop 1 -i "${imgPath}" -c:v libx264 -t 5 -pix_fmt yuv420p -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:white" "${videoPath}"`, { timeout: 30000 });
        console.log('[user-oauth] Video generated:', videoPath);

        // 5. Upload video to Kuaishou
        const startResp = await fetch(`https://open.kuaishou.com/openapi/photo/start_upload?access_token=${userToken}&app_id=${KUAISHOU_APP_ID}`, { method: 'POST' });
        const startData = await startResp.json();
        if (startData.result !== 1) throw new Error('start_upload failed: ' + JSON.stringify(startData));

        const videoBuffer = fs.readFileSync(videoPath);
        const uploadResp = await fetch(`http://${startData.endpoint}/api/upload?upload_token=${startData.upload_token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'video/mp4' },
            body: videoBuffer,
        });
        const uploadData = await uploadResp.json();
        if (uploadData.result !== 1) throw new Error('upload failed');

        // 6. Publish video
        const caption = `${stateData.nickname || userName}去过${stateData.count}个省！\n\n#去过哪 #中国足迹地图 #旅行打卡\n\n快来标记你的足迹 → letmetryai.cn/quguona`;
        const boundary = '----FormBoundary' + Date.now();
        const CRLF = '\r\n';
        const coverHeader = Buffer.from('--' + boundary + CRLF + 'Content-Disposition: form-data; name="cover"; filename="cover.png"' + CRLF + 'Content-Type: image/png' + CRLF + CRLF);
        const captionBuf = Buffer.from(CRLF + '--' + boundary + CRLF + 'Content-Disposition: form-data; name="caption"' + CRLF + CRLF + caption + CRLF + '--' + boundary + '--' + CRLF);
        const body = Buffer.concat([coverHeader, imgBuf, captionBuf]);

        const publishResp = await fetch(
            `https://open.kuaishou.com/openapi/photo/publish?access_token=${userToken}&app_id=${KUAISHOU_APP_ID}&upload_token=${startData.upload_token}`,
            { method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary }, body }
        );
        const publishData = await publishResp.json();
        console.log('[user-oauth] Publish result:', JSON.stringify(publishData));

        if (publishData.result !== 1) throw new Error('Publish failed: ' + (publishData.error_msg || 'unknown'));
        const photoId = publishData.video_info?.photo_id;

        // 7. Cleanup temp files
        try { fs.rmSync(tmpDir, { recursive: true }); } catch {}

        // 8. Redirect back to app with success
        res.redirect(`https://letmetryai.cn/quguona/?published=success&photo_id=${photoId}`);

    } catch (err) {
        console.error('[user-oauth] Error:', err.message);
        res.redirect('https://letmetryai.cn/quguona/?published=error&msg=' + encodeURIComponent(err.message));
    }
});
