#!/usr/bin/env node

/**
 * Script to upload viproom configuration to kvstore
 * This uploads the sample configuration to the viproom.conf key
 */

// Sample configuration data
const viproomConfig = [
    {
        "imgUrl": "https://p3-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/0b2ff364c29c41a9af3ad231b4dc82cc~tplv-tb4s082cfz-aigc_resize:2400:2400.webp?lk3s=4fa96020&x-expires=1767744000&x-signature=M8YrzjHRC4VEmkO965JBVbUPHrQ%3D",
        "videoUrl": "https://v.kuaishou.com/KL337Hat"
    }
];

const API_URL = "https://rlyhccdr2g.execute-api.us-west-2.amazonaws.com/default/keyValueStore";
const CONFIG_KEY = "viproom.conf";
const TIMESTAMP_2124 = 4866674732;

async function uploadConfig() {
    console.log('Uploading viproom configuration to kvstore...');
    console.log('Configuration:', JSON.stringify(viproomConfig, null, 2));

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: CONFIG_KEY,
                sortKey: 'None',
                value: JSON.stringify(viproomConfig),
                expireAt: TIMESTAMP_2124
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Configuration uploaded successfully!');
        console.log('Response:', data);
        
        // Verify by reading back
        await verifyConfig();
    } catch (error) {
        console.error('❌ Error uploading configuration:', error.message);
        process.exit(1);
    }
}

async function verifyConfig() {
    console.log('\nVerifying configuration...');
    
    try {
        const url = `${API_URL}?key=${encodeURIComponent(CONFIG_KEY)}&sortKey=None`;
        const response = await fetch(url, {
            method: "GET"
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Configuration verified!');
        console.log('Retrieved data:', JSON.stringify(JSON.parse(data.value), null, 2));
    } catch (error) {
        console.error('⚠️ Warning: Could not verify configuration:', error.message);
    }
}

// Run the upload
uploadConfig();
