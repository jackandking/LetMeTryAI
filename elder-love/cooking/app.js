/**
 * Love Cooking Application
 * Allows users to share dishes and Kuaishou video links
 */

/**
 * Configuration
 */
const cookingConfig = {
    dishesKey: "elder-love-dishes",
    votingKey: "elder-love-dishes-votes"
};

/**
 * Application state
 */
let dishes = [];

/**
 * Initialize the page
 */
function initializePage() {
    setupFormSubmission();
    loadDishes();
}

/**
 * Setup form submission handler
 */
function setupFormSubmission() {
    const form = document.getElementById('uploadForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const dishName = document.getElementById('dishName').value.trim();
    const videoLink = document.getElementById('videoLink').value.trim();
    const description = document.getElementById('description').value.trim();
    
    if (!dishName || !videoLink) {
        alert('请填写菜名和视频链接！');
        return;
    }
    
    // Create dish object with unique ID
    const dish = {
        id: `dish-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: dishName,
        videoLink: videoLink,
        description: description,
        timestamp: Date.now(),
        votes: 0
    };
    
    // Add to dishes array
    dishes.push(dish);
    
    // Save to storage
    try {
        await saveDishes();
        alert('提交成功！感谢您的分享！');
        
        // Clear form
        document.getElementById('uploadForm').reset();
        
        // Reload dishes
        loadDishes();
    } catch (error) {
        console.error('Error saving dish:', error);
        alert('提交失败，请稍后重试！');
    }
}

/**
 * Save dishes to storage
 */
async function saveDishes() {
    const dishesData = JSON.stringify(dishes);
    return new Promise((resolve, reject) => {
        updateKeyValueStore(cookingConfig.dishesKey, dishesData)
            .then(() => {
                console.log('Dishes saved successfully');
                resolve();
            })
            .catch((error) => {
                console.error('Error saving dishes:', error);
                reject(error);
            });
    });
}

/**
 * Load dishes from storage
 */
function loadDishes() {
    const loadingMessage = document.getElementById('loadingMessage');
    const dishesList = document.getElementById('dishesList');
    
    if (loadingMessage) {
        loadingMessage.style.display = 'block';
    }
    
    readKeyValueStore(cookingConfig.dishesKey, (data) => {
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
        
        if (data) {
            try {
                dishes = JSON.parse(data);
                displayDishes(dishes);
            } catch (error) {
                console.error('Error parsing dishes data:', error);
                dishesList.innerHTML = '<p style="text-align: center; color: #888;">暂无数据</p>';
            }
        } else {
            // Initialize with empty array
            dishes = [];
            dishesList.innerHTML = '<p style="text-align: center; color: #888;">还没有人分享菜谱，快来做第一个吧！</p>';
        }
    });
}

/**
 * Display dishes
 */
function displayDishes(dishesArray) {
    const dishesList = document.getElementById('dishesList');
    
    if (!dishesArray || dishesArray.length === 0) {
        dishesList.innerHTML = '<p style="text-align: center; color: #888;">还没有人分享菜谱，快来做第一个吧！</p>';
        return;
    }
    
    // Sort by votes and timestamp
    const sortedDishes = [...dishesArray].sort((a, b) => {
        if (b.votes !== a.votes) {
            return b.votes - a.votes;
        }
        return b.timestamp - a.timestamp;
    });
    
    dishesList.innerHTML = '';
    
    sortedDishes.forEach(dish => {
        const dishCard = createDishCard(dish);
        dishesList.appendChild(dishCard);
    });
}

/**
 * Create a dish card element
 */
function createDishCard(dish) {
    const card = document.createElement('div');
    card.className = 'dish-card';
    
    const title = document.createElement('h3');
    title.textContent = dish.name;
    card.appendChild(title);
    
    const videoLink = document.createElement('a');
    videoLink.href = dish.videoLink;
    videoLink.target = '_blank';
    videoLink.className = 'video-link';
    videoLink.textContent = '观看视频 →';
    card.appendChild(videoLink);
    
    if (dish.description) {
        const description = document.createElement('p');
        description.className = 'description';
        description.textContent = dish.description;
        card.appendChild(description);
    }
    
    if (dish.votes !== undefined && dish.votes > 0) {
        const votes = document.createElement('div');
        votes.className = 'votes';
        votes.textContent = `❤️ ${dish.votes} 票`;
        card.appendChild(votes);
    }
    
    return card;
}

/**
 * Get dishes for voting
 * Utility function that can be called by voting page if needed in future
 * Currently the voting page reads directly from storage for data consistency
 */
function getDishesForVoting() {
    return dishes.filter(dish => dish.name && dish.name.trim());
}

// Export for potential use by voting page
if (typeof window !== 'undefined') {
    window.getDishesForVoting = getDishesForVoting;
}
