// Event Metrics Component
function refreshEventMetrics() {
    const userId = document.getElementById('eventUserFilter').value;
    const eventType = document.getElementById('eventTypeFilter').value;
    const dateRange = document.getElementById('eventDateRange').value;

    let query = 'SELECT * FROM event_metrics WHERE 1=1';
    const params = [];

    if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
    }
    if (eventType) {
        query += ' AND event_type = ?';
        params.push(eventType);
    }
    if (dateRange) {
        const [startDate, endDate] = dateRange.split(' - ');
        query += ' AND created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    queryDatabase(query, params, (error, results) => {
        if (error) {
            console.error('Error fetching event metrics:', error);
            return;
        }

        const tbody = document.querySelector('#eventMetricsTable tbody');
        tbody.innerHTML = '';

        results.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.id}</td>
                <td>${row.user_id}</td>
                <td>${row.event_type}</td>
                <td>${row.event_data}</td>
                <td>${new Date(row.created_at).toLocaleString()}</td>
            `;
            tbody.appendChild(tr);
        });
    });
}

function updateEventMetricsSummary() {
    queryDatabase('SELECT COUNT(*) as total FROM event_metrics', [], (error, results) => {
        if (!error && results) {
            document.getElementById('totalEvents').textContent = results[0].total;
        }
    });

    queryDatabase('SELECT COUNT(*) as today FROM event_metrics WHERE DATE(created_at) = CURDATE()', [], (error, results) => {
        if (!error && results) {
            document.getElementById('eventsToday').textContent = results[0].today;
        }
    });

    queryDatabase('SELECT event_type, COUNT(*) as count FROM event_metrics GROUP BY event_type ORDER BY count DESC LIMIT 1', [], (error, results) => {
        if (!error && results && results.length > 0) {
            document.getElementById('topEventType').textContent = results[0].event_type;
        }
    });

    queryDatabase('SELECT COUNT(DISTINCT user_id) as active_users FROM event_metrics', [], (error, results) => {
        if (!error && results) {
            document.getElementById('activeEventUsers').textContent = results[0].active_users;
        }
    });
}

// Export functions
window.refreshEventMetrics = refreshEventMetrics;
window.updateEventMetricsSummary = updateEventMetricsSummary;