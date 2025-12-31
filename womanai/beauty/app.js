/**
 * 爱美容 页面脚本
 * 参考 elder-love/dancing 的存储实现
 */

const beautyConfig = {
    postsKey: "womanai-beauty"
};

let posts = [];

function extractUrl(text) {
    if (!text) return '';
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlPattern);
    if (matches && matches.length > 0) {
        return matches[0].replace(/[.,;:!?]+$/, '');
    }
    return text.trim();
}

function initializePage() {
    setupFormSubmission();
    loadPosts();
}

function setupFormSubmission() {
    const form = document.getElementById('uploadForm');
    const imageLinkInput = document.getElementById('imageLink');
    if (form) form.addEventListener('submit', handleFormSubmit);
    if (imageLinkInput) {
        imageLinkInput.addEventListener('blur', function() {
            const u = extractUrl(this.value);
            if (u !== this.value) this.value = u;
        });
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const title = document.getElementById('postTitle').value.trim();
    let imageLink = document.getElementById('imageLink').value.trim();
    const description = document.getElementById('description').value.trim();

    imageLink = extractUrl(imageLink);

    if (!title) {
        alert('请填写标题！');
        return;
    }

    const post = {
        id: `beauty-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
        title,
        imageLink,
        description,
        timestamp: Date.now()
    };

    posts.push(post);

    try {
        await savePosts();
        alert('提交成功，感谢分享！');
        document.getElementById('uploadForm').reset();
        loadPosts();
    } catch (err) {
        console.error('保存失败', err);
        alert('提交失败，请稍后重试');
    }
}

function savePosts() {
    const data = JSON.stringify(posts);
    return updateKeyValueStore(beautyConfig.postsKey, data);
}

function loadPosts() {
    const loadingMessage = document.getElementById('loadingMessage');
    const postsList = document.getElementById('postsList');
    if (loadingMessage) loadingMessage.style.display = 'block';

    readKeyValueStore(beautyConfig.postsKey, (data) => {
        if (loadingMessage) loadingMessage.style.display = 'none';

        if (data) {
            try {
                posts = JSON.parse(data);
                displayPosts(posts);
            } catch (err) {
                console.error('解析数据失败', err);
                postsList.innerHTML = '<p style="text-align:center;color:#888;">暂无数据</p>';
            }
        } else {
            posts = [];
            postsList.innerHTML = '<p style="text-align:center;color:#888;">还没有分享，快来做第一个吧！</p>';
        }
    });
}

function displayPosts(postsArray) {
    const postsList = document.getElementById('postsList');
    if (!postsArray || postsArray.length === 0) {
        postsList.innerHTML = '<p style="text-align:center;color:#888;">还没有分享，快来做第一个吧！</p>';
        return;
    }

    const sorted = [...postsArray].sort((a,b) => b.timestamp - a.timestamp);
    postsList.innerHTML = '';
    sorted.forEach(p => {
        const card = createPostCard(p);
        postsList.appendChild(card);
    });
}

function createPostCard(post) {
    const card = document.createElement('div');
    card.className = 'dish-card';

    const title = document.createElement('h3');
    title.textContent = post.title;
    card.appendChild(title);

    if (post.description) {
        const desc = document.createElement('p');
        desc.className = 'description';
        desc.textContent = post.description;
        card.appendChild(desc);
    }

    if (post.imageLink) {
        const view = document.createElement('a');
        view.href = post.imageLink;
        view.target = '_blank';
        view.className = 'video-link';
        view.textContent = '查看视频 →';
        card.appendChild(view);
    }

    return card;
}

if (typeof window !== 'undefined') {
    window.extractUrl = extractUrl;
}
