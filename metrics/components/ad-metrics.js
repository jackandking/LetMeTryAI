// Ad Metrics Component
function refreshAdMetrics() {
    const userId = document.getElementById('adUserFilter').value;
    const adType = document.getElementById('adTypeFilter').value;
    const dateRange = document.getElementById('adDateRange').value;

    let query = 'SELECT * FROM ad_metrics WHERE 1=1';
    const params = [];

    if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
    }
    if (adType) {
        query += ' AND ad_type = ?';
        params.push(adType);
    }
    if (dateRange) {
        const [startDate, endDate] = dateRange.split(' - ');
        query += ' AND created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    queryDatabase(query, params, (error, results) => {
        if (error) {
            console.error('Error fetching ad metrics:', error);
            return;
        }

        const tbody = document.querySelector('#adMetricsTable tbody');
        tbody.innerHTML = '';

        results.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.id}</td>
                <td>${row.user_id}</td>
                <td>${row.ad_type}</td>
                <td>${row.ad_id}</td>
                <td>${row.page_path}</td>
                <td>${row.event_type}</td>
                <td>${new Date(row.created_at).toLocaleString()}</td>
            `;
            tbody.appendChild(tr);
        });
    });
}

function updateAdMetricsSummary() {
    queryDatabase('SELECT COUNT(*) as total FROM ad_metrics WHERE event_type = "view"', [], (error, results) => {
        if (!error && results) {
            document.getElementById('totalAdViews').textContent = results[0].total;
        }
    });

    queryDatabase(`
        SELECT 
            ROUND(COUNT(CASE WHEN event_type = 'click' THEN 1 END) * 100.0 / 
            COUNT(CASE WHEN event_type = 'view' THEN 1 END), 2) as click_rate 
        FROM ad_metrics
    `, [], (error, results) => {
        if (!error && results) {
            document.getElementById('adClickRate').textContent = results[0].click_rate + '%';
        }
    });

    queryDatabase('SELECT ad_type, COUNT(*) as count FROM ad_metrics GROUP BY ad_type ORDER BY count DESC LIMIT 1', [], (error, results) => {
        if (!error && results && results.length > 0) {
            document.getElementById('commonAdType').textContent = results[0].ad_type;
        }
    });

    queryDatabase('SELECT COUNT(DISTINCT user_id) as active_users FROM ad_metrics', [], (error, results) => {
        if (!error && results) {
            document.getElementById('activeAdUsers').textContent = results[0].active_users;
        }
    });
}

// Export functions
window.refreshAdMetrics = refreshAdMetrics;
window.updateAdMetricsSummary = updateAdMetricsSummary;