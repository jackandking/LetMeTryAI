/**
 * Utility functions for LetMeTryAI application
 * Provides logging, key-value storage, configuration management, and fireworks functionality
 */

// Default timestamp for data expiration (2124)
const TIMESTAMP_2124 = 4866674732;

/**
 * Logs a message to the console
 * @param {string|Object} message - The message to log
 */
function log(message) {
  if (typeof message === 'object') {
    console.log(JSON.stringify(message, null, 2));
  } else {
    console.log(message);
  }
}

/**
 * Updates a key-value pair in the remote storage
 * @param {string} key - The storage key
 * @param {any} value - The value to store
 * @param {string} [sortKey='None'] - Optional sort key for organization
 * @param {number} [expireAt=TIMESTAMP_2124] - Expiration timestamp
 * @returns {Promise<Object>} Promise that resolves with the response data
 */
async function updateKeyValueStore(key, value, sortKey = 'None', expireAt = TIMESTAMP_2124) {
  if (!key || typeof key !== 'string') {
    throw new Error('Key must be a non-empty string');
  }

  log(`updateKeyValueStore with key: ${key}`);
  log(`updateKeyValueStore with value: ${value}`);

  try {
    const response = await fetch("https://rlyhccdr2g.execute-api.us-west-2.amazonaws.com/default/keyValueStore", {
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
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    log(`updateKeyValueStore success for key: ${key}`);
    return data;
  } catch (error) {
    log(`Error updating key-value store: ${error.message}`);
    throw error;
  }
}

/**
 * Reads a value from the remote key-value storage
 * @param {string} key - The storage key to read
 * @param {Function} callback - Callback function to handle the result
 * @param {string} [sortKey='None'] - Optional sort key for organization
 */
function readKeyValueStore(key, callback, sortKey = 'None') {
  if (!key || typeof key !== 'string') {
    callback(null);
    return;
  }

  if (typeof callback !== 'function') {
    throw new Error('Callback must be a function');
  }

  console.log(`readKeyValueStore for key=${key} sortKey=${sortKey}`);

  const url = `https://rlyhccdr2g.execute-api.us-west-2.amazonaws.com/default/keyValueStore?key=${encodeURIComponent(key)}&sortKey=${encodeURIComponent(sortKey)}`;

  fetch(url, {
      method: "GET"
  })
  .then(response => {
      if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      return response.json();
  })
  .then(data => {
      console.log(data);
      callback(data.value);
  })
  .catch(error => {
      console.error('Error in readKeyValueStore:', error);
      callback(null);
  });
}


/**
 * Updates a configuration value in storage
 * @param {string} configName - The configuration key name
 * @param {any} configValue - The configuration value to store
 */
function updateConfig(configName, configValue) {
    if (!configName || typeof configName !== 'string') {
        console.error('Configuration name must be a non-empty string');
        return;
    }

    const key = configName;
    const jsonValue = JSON.stringify(configValue);
    console.log("update config for key:", key, "value:", jsonValue);
    
    // Note: updateKeyValueStore is now async but this function maintains backward compatibility
    updateKeyValueStore(key, jsonValue).catch(error => {
        console.error('Error updating config:', error);
    });
}

/**
 * Retrieves a configuration value from storage
 * @param {string} configName - The configuration key name
 * @param {Function} callback - Callback function to handle the result
 */
function getConfig(configName, callback) {
    if (!configName || typeof configName !== 'string') {
        console.error('Configuration name must be a non-empty string');
        if (typeof callback === 'function') {
            callback(null);
        }
        return;
    }

    if (typeof callback !== 'function') {
        console.error('Callback must be a function');
        return;
    }

    console.log("get config for key:", configName);
    
    readKeyValueStore(configName, (config) => {
        if (config === null || config === undefined) {
            console.log("config not found for key:", configName);
            callback(null);
            return;
        }

        try {
            const jsonConfig = JSON.parse(config);
            console.log("get config:", jsonConfig);
            callback(jsonConfig);
        } catch (err) {
            console.log("error parsing config:", err);
            callback(null);
        }
    });
}

/**
 * Uploads firework data to the remote storage
 * @param {string} fireworkId - Unique identifier for the firework
 * @param {string} fireworkType - Type/category of the firework
 * @param {number} x - X coordinate position
 * @param {number} y - Y coordinate position
 * @param {string} fireworkString - Display string for the firework
 */
function uploadFirework(fireworkId, fireworkType, x, y, fireworkString) {
    // Input validation
    if (!fireworkId || typeof fireworkId !== 'string') {
        console.error('Firework ID must be a non-empty string');
        return;
    }

    if (typeof x !== 'number' || typeof y !== 'number') {
        console.error('Coordinates x and y must be numbers');
        return;
    }

    const fireworkData = {
        id: fireworkId,
        type: fireworkType || 'default',
        x: x,
        y: y,
        string: fireworkString || '',
        timestamp: Date.now()
    };
    
    // Set expiration to 1 hour from now
    const oneHourLater = Math.floor(Date.now() / 1000) + 3600;
    
    updateKeyValueStore(
        'firework', 
        JSON.stringify(fireworkData), 
        fireworkId, 
        oneHourLater
    ).catch(error => {
        console.error('Error uploading firework:', error);
    });
}

/**
 * Downloads all firework data from remote storage
 * @param {Function} callback - Callback function to handle the fireworks data array
 */
function downloadFireworks(callback) {
    if (typeof callback !== 'function') {
        console.error('Callback must be a function');
        return;
    }

    readKeyValueStore('firework', (rawdata) => {
        if (!rawdata) {
            console.log('No fireworks data found');
            callback([]);
            return;
        }

        try {
            const data = JSON.parse(rawdata);
            
            if (Array.isArray(data)) {
                // Handle array of fireworks
                const fireworksData = data.map(item => {
                    try {
                        return typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
                    } catch (parseError) {
                        console.warn('Error parsing individual firework item:', parseError);
                        return null;
                    }
                }).filter(item => item !== null); // Remove failed parsing attempts
                
                console.log('Downloaded fireworks:', fireworksData);
                callback(fireworksData);
            } else {
                // Handle single firework data
                console.log('Downloaded single firework:', data);
                const fireworkData = typeof data === 'string' ? JSON.parse(data) : data;
                callback([fireworkData]);
            }
        } catch (err) {
            console.error('Error parsing fireworks data:', err);
            callback([]);
        }
    }, '*');
}
