(function (globalScope) {
    function generateUuidFilename(extension = 'png') {
        const uuid = globalScope.crypto && typeof globalScope.crypto.randomUUID === 'function'
            ? globalScope.crypto.randomUUID()
            : `img-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
        return `${uuid}.${extension.replace(/^\./, '')}`;
    }

    async function dataUrlToFile(dataUrl, filename) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        return new File([blob], filename, {
            type: blob.type || 'image/png',
            lastModified: Date.now()
        });
    }

    function extractImageUrlFromResponse(json) {
        if (!json) return null;
        if (json.url) return json.url;
        if (json.path) return json.path.startsWith('http') ? json.path : `https://letmetry.cloud${json.path.startsWith('/') ? '' : '/'}${json.path}`;
        if (json.data && json.data.url) return json.data.url;
        if (json.data && json.data.path) {
            const path = json.data.path;
            return path.startsWith('http') ? path : `https://letmetry.cloud${path.startsWith('/') ? '' : '/'}${path}`;
        }
        for (const value of Object.values(json)) {
            if (typeof value === 'string' && value.startsWith('http')) return value;
        }
        return null;
    }

    async function uploadImageFile(file, uploadEndpoint) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(uploadEndpoint, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let errorText = '';
            try {
                errorText = await response.text();
            } catch (err) {
                errorText = '';
            }
            throw new Error(errorText || `图片上传失败: HTTP ${response.status}`);
        }

        let json;
        try {
            json = await response.json();
        } catch (err) {
            throw new Error('图片上传后解析响应失败');
        }

        const imageUrl = extractImageUrlFromResponse(json);
        if (!imageUrl) {
            throw new Error('图片上传成功但未返回图片地址');
        }

        return {
            response: json,
            imageUrl
        };
    }

    const exported = {
        generateUuidFilename,
        dataUrlToFile,
        extractImageUrlFromResponse,
        uploadImageFile
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exported;
    }

    globalScope.ChildTravelMapImageUpload = exported;
})(typeof window !== 'undefined' ? window : globalThis);
