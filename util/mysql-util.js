// MySQL utility functions

import { API_ENDPOINTS } from './config.js';

const log = (message) => {
  console.log(message);
};

// Function to query MySQL database
const queryDatabase = (query, params, callback) => {
  fetch(API_ENDPOINTS.MYSQL_QUERY, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql: query, params: params })
  })
  .then(response => response.json())
  .then(data => {
    log('Query executed successfully');
    callback(null, data);
  })
  .catch(error => {
    log('Error executing query: ' + error);
    callback(error);
  });
}

// Function to get record by ID
const getById = (table, id, callback) => {
  fetch(API_ENDPOINTS.MYSQL_GET_BY_ID, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ table, id })
  })
  .then(response => response.json())
  .then(data => {
    log('Record retrieved successfully');
    callback(null, data);
  })
  .catch(error => {
    log('Error retrieving record: ' + error);
    callback(error);
  });
}

// Function to insert record
const insertRecord = (table, data, callback) => {
  fetch(API_ENDPOINTS.MYSQL_INSERT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ table, data })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text().then(text => {
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid JSON response: ' + text);
      }
    });
  })
  .then(data => {
    log('Record inserted successfully');
    callback(null, data.insertId);
  })
  .catch(error => {
    log('Error inserting record: ' + error);
    callback(error);
  });
}

// Function to update record
const updateRecord = (table, id, data, callback) => {
  fetch(API_ENDPOINTS.MYSQL_UPDATE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ table, id, data })
  })
  .then(response => response.json())
  .then(data => {
    log('Record updated successfully');
    callback(null, data.affectedRows);
  })
  .catch(error => {
    log('Error updating record: ' + error);
    callback(error);
  });
}

// Function to delete record
const deleteRecord = (table, id, callback) => {
  fetch(API_ENDPOINTS.MYSQL_DELETE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ table, id })
  })
  .then(response => response.json())
  .then(data => {
    log('Record deleted successfully');
    callback(null, data.affectedRows);
  })
  .catch(error => {
    log('Error deleting record: ' + error);
    callback(error);
  });
}

// Export all database utility functions
export { queryDatabase, getById, insertRecord, updateRecord, deleteRecord };