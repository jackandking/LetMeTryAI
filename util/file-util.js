// File utility functions

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

// Function to upload a file with optional target path
async function uploadFile(fileObject, targetPath, uuid = null) {
  const startTime = Date.now();
  log(`Starting upload for file: ${fileObject.name} (${fileObject.size} bytes)`);
  
  // Use provided UUID or generate a new one
  const fileExtension = fileObject.name.split('.').pop();
  const newFileName = `${uuid || crypto.randomUUID()}.${fileExtension}`;
  const renamedFile = new File([fileObject], newFileName, { type: fileObject.type });
  
  const formData = new FormData();
  
  if (targetPath) {
    // 添加基础校验（如路径长度、非法字符等）
    if (typeof targetPath !== 'string' || targetPath.includes('..')) {
      throw new Error('Invalid targetPath');
    }
    formData.append('targetPath', targetPath);
  }

  formData.append('file', renamedFile);
    // 打印 FormData 内容的方法
    const formDataEntries = Array.from(formData.entries());
    log(`formData contents: ${formDataEntries
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? '[File Object]' : value}`)
      .join(', ')}`);
  try {
    const response = await fetch('https://letmetryai.cn/lws/file/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    log(`File uploaded successfully in ${duration}ms`);
    return data;
  } catch (error) {
    log(`Error uploading file: ${error.message}`, 'error');
    throw error;
  }
}

// Function to delete a file
async function deleteFile(filename) {
  const startTime = Date.now();
  log(`Starting deletion of file: ${filename}`);

  try {
    const response = await fetch('https://letmetryai.cn/lws/file/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    log(`File deleted successfully in ${duration}ms`);
    return data;
  } catch (error) {
    log(`Error deleting file: ${error.message}`, 'error');
    throw error;
  }
}

// Function to get file information
async function getFileInfo(filename) {
  const startTime = Date.now();
  log(`Retrieving info for file: ${filename}`);

  try {
    const response = await fetch(`https://letmetryai.cn/lws/file/info/${filename}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    log(`File info retrieved successfully in ${duration}ms`);
    return data;
  } catch (error) {
    log(`Error getting file info: ${error.message}`, 'error');
    throw error;
  }
}

// Function to list all files
async function listFiles() {
  const startTime = Date.now();
  log('Starting file list retrieval');

  try {
    const response = await fetch('https://letmetryai.cn/lws/file/list');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    log(`File list retrieved successfully in ${duration}ms. Found ${data.length || 0} files`);
    return data;
  } catch (error) {
    log(`Error listing files: ${error.message}`, 'error');
    throw error;
  }
}

// Function to download a file
async function downloadFile(filename) {
  const startTime = Date.now();
  log(`Starting download of file: ${filename}`);

  try {
    const response = await fetch(`https://letmetryai.cn/lws/file/download/${filename}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const blob = await response.blob();
    const duration = Date.now() - startTime;
    log(`File downloaded successfully in ${duration}ms. Size: ${blob.size} bytes`);
    return blob;
  } catch (error) {
    log(`Error downloading file: ${error.message}`, 'error');
    throw error;
  }
}

// Export all file utility functions
export { uploadFile, deleteFile, getFileInfo, listFiles, downloadFile };