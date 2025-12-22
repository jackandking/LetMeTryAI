/**
 * Dish Voting Application
 * Allows users to vote for their favorite home-cooked dishes
 */

/**
 * Configuration
 */
const voteConfig = {
    dishesKey: "elder-love-dishes",
    votingKey: "elder-love-dishes-votes",
    numberOfDishes: 5
};

/**
 * Application state
 */
let allDishes = [];
let selectedDishes = [];
let selectedDishIndex = null;

/**
 * Initialize voting page
 */
function initializeVoting() {
    try {
        checkUrlParameters();
        handleResultDisplay();
    } catch (error) {
        console.error('Error initializing voting:', error);
        showError('初始化失败，请刷新页面重试');
    }
}

/**
 * Check URL parameters for navigation control
 */
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if ad is finished - navigate back if not
    if (urlParams.get('finishedAd') === 'false') {
        if (typeof ks !== 'undefined' && ks.navigateBack) {
            ks.navigateBack();
        }
    }
}

/**
 * Handle result display or load dishes for voting
 */
function handleResultDisplay() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if ad is finished and should show results
    if (urlParams.get('finishedAd') === 'true' || urlParams.get('showResults') === 'true') {
        displayResults();
    } else {
        loadDishesAndSetupVoting();
    }
}

/**
 * Load dishes from storage and setup voting interface
 */
function loadDishesAndSetupVoting() {
    readKeyValueStore(voteConfig.dishesKey, (data) => {
        if (data) {
            try {
                allDishes = JSON.parse(data);
                console.log(`Loaded ${allDishes.length} dishes`);
                
                if (allDishes.length < voteConfig.numberOfDishes) {
                    showError(`菜品数量不足，至少需要${voteConfig.numberOfDishes}道菜`);
                    return;
                }
                
                // Select random dishes and display them
                selectedDishes = getRandomDishes(allDishes, voteConfig.numberOfDishes);
                displayDishes(selectedDishes);
                
                // Hide loading message and show voting section
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('votingSection').style.display = 'block';
            } catch (error) {
                console.error('Error processing dishes:', error);
                showError('加载菜品失败，请刷新页面重试');
            }
        } else {
            showError('暂无菜品数据，请先在爱做饭页面添加菜品');
        }
    });
}

/**
 * Get random dishes from the dish list using Fisher-Yates shuffle
 */
function getRandomDishes(dishList, count) {
    const shuffled = [...dishList];
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

/**
 * Display dishes in the gallery
 */
function displayDishes(dishes) {
    const gallery = document.getElementById('dishGallery');
    gallery.innerHTML = '';
    
    dishes.forEach((dish, index) => {
        const container = createDishContainer(dish, index);
        gallery.appendChild(container);
    });
}

/**
 * Create a dish container element
 */
function createDishContainer(dish, index) {
    const container = document.createElement('div');
    container.className = 'dish-container';
    container.onclick = () => selectDish(index);
    
    const name = document.createElement('div');
    name.className = 'dish-name';
    name.textContent = dish.name;
    container.appendChild(name);
    
    if (dish.description) {
        const description = document.createElement('div');
        description.className = 'dish-description';
        description.textContent = dish.description;
        container.appendChild(description);
    }
    
    return container;
}

/**
 * Handle dish selection
 */
function selectDish(index) {
    const containers = document.querySelectorAll('.dish-container');
    containers.forEach(c => c.classList.remove('selected'));
    
    containers[index].classList.add('selected');
    selectedDishIndex = index;
    
    // Show result button
    const showResultBtn = document.getElementById('showResultBtn');
    if (showResultBtn) {
        showResultBtn.style.display = 'block';
    }
}

/**
 * Show ad before displaying results
 */
function showAd() {
    if (selectedDishIndex === null) {
        alert('请先选择一道菜！');
        return;
    }
    
    // Save vote
    saveVote();
    
    // Check if running in Kuaishou environment
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=elder-love/cooking",
        });
    } else {
        // If not in Kuaishou environment, directly show results
        console.warn('Mini-program navigation not available');
        window.location.href = 'vote.html?showResults=true';
    }
}

/**
 * Save vote to storage
 */
function saveVote() {
    const selectedDish = selectedDishes[selectedDishIndex];
    
    // Create a Map for O(1) lookup if dish has ID, otherwise fallback to findIndex
    if (selectedDish.id) {
        const dishMap = new Map(allDishes.map(d => [d.id, d]));
        const dish = dishMap.get(selectedDish.id);
        if (dish) {
            dish.votes = (dish.votes || 0) + 1;
        }
    } else {
        // Fallback for dishes without IDs (backward compatibility)
        const dishIndex = allDishes.findIndex(d => d.name === selectedDish.name && d.timestamp === selectedDish.timestamp);
        if (dishIndex !== -1) {
            allDishes[dishIndex].votes = (allDishes[dishIndex].votes || 0) + 1;
        }
    }
    
    // Save updated dishes
    const dishesData = JSON.stringify(allDishes);
    updateKeyValueStore(voteConfig.dishesKey, dishesData)
        .then(() => {
            console.log('Vote saved successfully');
        })
        .catch((error) => {
            console.error('Error saving vote:', error);
        });
}

/**
 * Display voting results
 */
function displayResults() {
    readKeyValueStore(voteConfig.dishesKey, (data) => {
        if (data) {
            try {
                const dishes = JSON.parse(data);
                
                // Sort by votes
                const sortedDishes = [...dishes].sort((a, b) => (b.votes || 0) - (a.votes || 0));
                
                // Hide voting section, show results
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('votingSection').style.display = 'none';
                document.getElementById('resultsContainer').style.display = 'block';
                
                // Show winner
                if (sortedDishes.length > 0) {
                    const winner = sortedDishes[0];
                    document.getElementById('winnerSection').style.display = 'block';
                    document.getElementById('winnerDish').textContent = winner.name;
                    document.getElementById('winnerVotes').textContent = `获得 ${winner.votes || 0} 票`;
                }
                
                // Show all results
                document.getElementById('resultsSection').style.display = 'block';
                displayResultsList(sortedDishes);
                
                // Display statistics
                const totalVotes = sortedDishes.reduce((sum, dish) => sum + (dish.votes || 0), 0);
                document.getElementById('totalVotes').textContent = `总投票数：${totalVotes}`;
                document.getElementById('timestamp').textContent = `更新时间：${new Date().toLocaleString('zh-CN')}`;
                
            } catch (error) {
                console.error('Error displaying results:', error);
                showError('显示结果失败');
            }
        } else {
            showError('无法加载投票结果');
        }
    });
}

/**
 * Display results list
 */
function displayResultsList(dishes) {
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';
    
    dishes.forEach((dish, index) => {
        const item = document.createElement('div');
        item.className = 'result-item';
        
        const info = document.createElement('div');
        info.className = 'result-info';
        
        const rank = document.createElement('div');
        rank.className = 'result-rank';
        rank.textContent = `${index + 1}.`;
        info.appendChild(rank);
        
        const name = document.createElement('div');
        name.className = 'result-name';
        name.textContent = dish.name;
        info.appendChild(name);
        
        item.appendChild(info);
        
        const votes = document.createElement('div');
        votes.className = 'result-votes';
        votes.textContent = `${dish.votes || 0} 票`;
        item.appendChild(votes);
        
        resultsList.appendChild(item);
    });
}

/**
 * Retry voting
 */
function retryVote() {
    window.location.href = 'vote.html';
}

/**
 * Show error message
 */
function showError(message) {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.textContent = message;
        loadingMessage.style.display = 'block';
        loadingMessage.style.color = '#e74c3c';
    } else {
        alert(message);
    }
}

/**
 * Jump to index page (for compatibility)
 */
function jumpToIndex() {
    window.location.href = 'index.html';
}
