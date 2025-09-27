// Page Performance Component
function updatePagePerformanceCharts() {
    // Query for finish events by page
    const finishQuery = `
        SELECT page_path, COUNT(*) as count 
        FROM ad_metrics 
        WHERE event_type = 'finish'
        GROUP BY page_path 
        ORDER BY count DESC 
        LIMIT 5
    `;
    
    // Query for show events by page
    const showQuery = `
        SELECT page_path, COUNT(*) as count 
        FROM ad_metrics 
        WHERE event_type = 'show'
        GROUP BY page_path 
        ORDER BY count DESC 
        LIMIT 5
    `;

    // Update finish events chart
    queryDatabase(finishQuery, [], (error, finishResults) => {
        if (!error && finishResults) {
            const ctx = document.getElementById('pageFinishChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: finishResults.map(row => row.page_path),
                    datasets: [{
                        label: 'Finish Events',
                        data: finishResults.map(row => row.count),
                        backgroundColor: '#28a745'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y'
                }
            });
        }
    });

    // Update show events chart
    queryDatabase(showQuery, [], (error, showResults) => {
        if (!error && showResults) {
            const ctx = document.getElementById('pageShowChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: showResults.map(row => row.page_path),
                    datasets: [{
                        label: 'Show Events',
                        data: showResults.map(row => row.count),
                        backgroundColor: '#007bff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y'
                }
            });
        }
    });

    // Update summary metrics
    const summaryQuery = `
        SELECT 
            page_path,
            SUM(CASE WHEN event_type = 'show' THEN 1 ELSE 0 END) as show_count,
            SUM(CASE WHEN event_type = 'finish' THEN 1 ELSE 0 END) as finish_count,
            ROUND(SUM(CASE WHEN event_type = 'finish' THEN 1 ELSE 0 END) * 100.0 / 
                  NULLIF(SUM(CASE WHEN event_type = 'show' THEN 1 ELSE 0 END), 0), 2) as completion_rate
        FROM ad_metrics
        GROUP BY page_path
        HAVING show_count > 0
        ORDER BY completion_rate DESC
        LIMIT 1
    `;

    queryDatabase(summaryQuery, [], (error, results) => {
        if (!error && results && results.length > 0) {
            document.getElementById('mostEngagingPage').textContent = results[0].page_path;
            document.getElementById('engagingPageRate').textContent = `${results[0].completion_rate}% completion rate`;
            document.getElementById('totalShowEvents').textContent = results[0].show_count;
            document.getElementById('totalFinishEvents').textContent = results[0].finish_count;
        }
    });
}

// Export functions
window.updatePagePerformanceCharts = updatePagePerformanceCharts;