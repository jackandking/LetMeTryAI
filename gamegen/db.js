// Database operations for game generator

const TASKS_TABLE = 'game_tasks';

// Import MySQL utilities
import { queryDatabase, getById, insertRecord, updateRecord, deleteRecord } from '../util/mysql-util.js';

// Create a new task
function createTask(filename, inputPath, callback) {
  const now = new Date();
  const mysqlDatetime = now.toISOString().slice(0, 19).replace('T', ' ');
  const taskData = {
    filename: filename,
    input_path: inputPath,
    status: 'pending',
    created_at: mysqlDatetime,
    updated_at: mysqlDatetime
  };

  insertRecord(TASKS_TABLE, taskData, (err, taskId) => {
    if (err) {
      console.error('Error creating task:', err);
      callback(err);
      return;
    }
    callback(null, taskId);
  });
}

// Get task by ID
function getTask(taskId, callback) {
  getById(TASKS_TABLE, taskId, (err, task) => {
    if (err) {
      console.error('Error getting task:', err);
      callback(err);
      return;
    }
    callback(null, task);
  });
}

// Get all tasks
function getAllTasks(callback) {
  const query = 'SELECT * FROM ' + TASKS_TABLE + ' ORDER BY created_at DESC';
  queryDatabase(query, [], (err, tasks) => {
    if (err) {
      console.error('Error getting tasks:', err);
      callback(err);
      return;
    }
    callback(null, tasks);
  });
}

// Update task status and output
function updateTaskStatus(taskId, status, outputPath, errorMessage, callback) {
  // Validate status enum
  const validStatuses = ['pending', 'processing', 'completed', 'failed'];
  if (!validStatuses.includes(status)) {
    callback(new Error('Invalid status value'));
    return;
  }

  const updateData = {
    status: status,
    output_path: outputPath,
    error_message: errorMessage,
    updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
  };

  updateRecord(TASKS_TABLE, taskId, updateData, (err, affectedRows) => {
    if (err) {
      console.error('Error updating task:', err);
      callback(err);
      return;
    }
    callback(null, affectedRows > 0);
  });
}

// Delete task
function deleteTask(taskId, callback) {
  deleteRecord(TASKS_TABLE, taskId, (err, affectedRows) => {
    if (err) {
      console.error('Error deleting task:', err);
      callback(err);
      return;
    }
    callback(null, affectedRows > 0);
  });
}

// Export functions
export {
  createTask,
  getTask,
  getAllTasks,
  updateTaskStatus,
  deleteTask
};