// 替换为浏览器原生console.log
const TIMESTAMP_2124=4866674732;
function log(message) {
  console.log(message);
}

// 替换为fetch API发起请求
function updateKeyValueStore(key, value, sortKey = 'None', expireAt = TIMESTAMP_2124) {
  log("updateKeyValueStore with key:" + key);
  log("updateKeyValueStore with value:" + value);

  fetch("https://rlyhccdr2g.execute-api.us-west-2.amazonaws.com/default/keyValueStore", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key,
      sortKey,
      value,
      expireAt
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    log("updateKeyValueStore success for key:" + key);
  })
  .catch(error => {
    log(error);
  });
}

function readKeyValueStore(key, callback, sortKey = 'None') {
  console.log("readKeyValueStore for key=" + key + " sortKey=" + sortKey);

  const url = `https://rlyhccdr2g.execute-api.us-west-2.amazonaws.com/default/keyValueStore?key=${key}&sortKey=${sortKey}`;

  fetch(url, {
      method: "GET"
  })
  .then(response => {
      if (!response.ok) {
          throw new Error('Network response was not ok ' + response.statusText);
      }
      return response.json();
  })
  .then(data => {
      console.log(data);
      callback(data.value);
  })
  .catch(error => {
      console.error('There has been a problem with your fetch operation:', error);
      callback(null);
  });
}


function updateConfig(configName, configValue){
    const key = configName;
    const jsonValue = JSON.stringify(configValue);
    console.log("update config for key:", key, "value:", jsonValue);
    updateKeyValueStore(key, jsonValue);
}

function getConfig(configName, callback){
    console.log("get config for key:", configName);
    readKeyValueStore(configName, (config)=>{
        try {
            const jsonConfig = JSON.parse(config);
            console.log("get config:", jsonConfig);
            callback(jsonConfig);
        } catch(err) {
            console.log("error parsing config:", err);
            callback(null);
        }
    });
}

function uploadFirework(fireworkId, fireworkType, x, y, fireworkString) {
    const fireworkData = {
        id: fireworkId,
        type: fireworkType,
        x: x,
        y: y,
        string: fireworkString,
        timestamp: Date.now()
    };
    
    const oneMinuteLater = Math.floor(Date.now() / 1000) + 60; // Current time in seconds + 60 seconds
    const oneHourLater = Math.floor(Date.now() / 1000) + 3600; // Current time in seconds + 60 seconds
    
    updateKeyValueStore(
        'firework', 
        JSON.stringify(fireworkData), 
        fireworkId, 
        oneHourLater
    );
}

function downloadFireworks(callback) {
    readKeyValueStore('firework', (rawdata) => {
      data=JSON.parse(rawdata);
        if (data && Array.isArray(data)) {
            try {
                const fireworksData = data.map(item => {
                    if (typeof item.value === 'string') {
                        return JSON.parse(item.value);
                    }
                    return item.value;
                });
                console.log('Downloaded fireworks:', fireworksData);
                callback(fireworksData);
            } catch (err) {
                console.error('Error parsing fireworks data:', err);
                callback([]);
            }
        } else if (data) {
          console.log('Downloaded firework:', data);  // No fireworks found, return empty array
            try {
                // Handle single firework data
                const fireworkData = typeof data === 'string' ? JSON.parse(data) : data;
                callback([fireworkData]);
            } catch (err) {
                console.error('Error parsing single firework data:', err);
                callback([]);
            }
        } else {
            callback([]);
        }
    }, '*');
}
