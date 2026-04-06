export async function postSql(endpoint, sql, params = [], fetchImpl = fetch) {
    const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql, params })
    });

    if (!response.ok) {
        throw new Error(`Database request failed with HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result && result.error) {
        throw new Error(result.error);
    }

    return result;
}

export function normalizeRows(result) {
    if (Array.isArray(result)) {
        return result;
    }

    if (result && Array.isArray(result.rows)) {
        return result.rows;
    }

    if (result && Array.isArray(result.data)) {
        return result.data;
    }

    return [];
}

export function extractAffectedRows(result) {
    return Number(result?.affectedRows || result?.changedRows || 0);
}

export function extractInsertId(result) {
    return result?.insertId ?? null;
}
