/**
 * Database Initialization Script for Back View Killer Feature
 * 
 * This script creates the back_view_images table in the MySQL database.
 * Run this script once to set up the database schema.
 */

const BASE_URL = 'https://letmetry.cloud';
const API_ENDPOINTS = {
    MYSQL_QUERY: `${BASE_URL}/mysql/query`
};

/**
 * Execute SQL query using the MySQL API
 */
async function executeSQL(sql, params = []) {
    const response = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sql: sql,
            params: params
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SQL execution failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
}

/**
 * Initialize the back_view_images table
 */
async function initializeBackViewImagesTable() {
    console.log('🚀 Initializing back_view_images table...');

    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS back_view_images (
            id INT AUTO_INCREMENT PRIMARY KEY,
            back_image_url VARCHAR(2048) NOT NULL COMMENT 'URL of the back view image',
            front_image_url VARCHAR(2048) NOT NULL COMMENT 'URL of the front view image',
            click_count INT DEFAULT 0 NOT NULL COMMENT 'Number of times the back view has been clicked to reveal front',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_created_at (created_at),
            INDEX idx_click_count (click_count),
            UNIQUE INDEX idx_back_image (back_image_url(255)),
            UNIQUE INDEX idx_front_image (front_image_url(255))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    try {
        await executeSQL(createTableSQL);
        console.log('✅ Table back_view_images created successfully!');
        return true;
    } catch (error) {
        console.error('❌ Failed to create table:', error.message);
        return false;
    }
}

/**
 * Verify table structure
 */
async function verifyTableStructure() {
    console.log('🔍 Verifying table structure...');

    try {
        const result = await executeSQL('DESCRIBE back_view_images');
        console.log('✅ Table structure verified:');
        console.table(result);
        return true;
    } catch (error) {
        console.error('❌ Failed to verify table structure:', error.message);
        return false;
    }
}

/**
 * Main initialization function
 */
async function main() {
    console.log('═══════════════════════════════════════════════');
    console.log('  Back View Killer - Database Initialization');
    console.log('═══════════════════════════════════════════════\n');

    // Step 1: Create table
    const tableCreated = await initializeBackViewImagesTable();
    if (!tableCreated) {
        console.error('\n❌ Initialization failed!');
        process.exit(1);
    }

    // Step 2: Verify table structure
    const tableVerified = await verifyTableStructure();
    if (!tableVerified) {
        console.error('\n⚠️  Warning: Could not verify table structure');
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ Database initialization complete!');
    console.log('═══════════════════════════════════════════════');
}

// Run in Node.js environment
if (typeof module !== 'undefined' && require.main === module) {
    // For Node.js, we need to use node-fetch
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    globalThis.fetch = fetch;
    
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeBackViewImagesTable,
        verifyTableStructure,
        executeSQL
    };
}
