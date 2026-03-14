#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Validate a voting app bundle by file contents.
 *
 * @param {{ indexHtml: string, appJs: string }} files Voting app file contents.
 * @returns {{ valid: boolean, errors: string[] }} Validation result.
 */
export function validateVotingAppFiles(files) {
    const indexHtml = typeof files?.indexHtml === 'string' ? files.indexHtml : '';
    const appJs = typeof files?.appJs === 'string' ? files.appJs : '';
    const errors = [];

    const optionCount = (indexHtml.match(/<input type="radio"/g) || []).length;
    const imageCount = (indexHtml.match(/<img src="images\//g) || []).length;

    if (optionCount === 0) {
        errors.push('No radio options found in index.html');
    }
    if (imageCount < optionCount) {
        errors.push('Not every option has a local image in index.html');
    }
    if (!indexHtml.includes('id="showResultBtn"')) {
        errors.push('Missing showResultBtn in index.html');
    }
    if (!indexHtml.includes('id="result"')) {
        errors.push('Missing result container in index.html');
    }
    if (!appJs.includes('function initializeApp()')) {
        errors.push('Missing initializeApp() in app.js');
    }
    if (!appJs.includes('function showAd()')) {
        errors.push('Missing showAd() in app.js');
    }
    if (!appJs.includes('function displayResults()')) {
        errors.push('Missing displayResults() in app.js');
    }
    if (!appJs.includes('function showResult(')) {
        errors.push('Missing showResult() in app.js');
    }
    if (!appJs.includes("document.addEventListener('DOMContentLoaded', initializeApp)")) {
        errors.push('Missing DOMContentLoaded bootstrap in app.js');
    }
    if (!appJs.includes('storageKey')) {
        errors.push('Missing storageKey in app.js');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate a voting app directory by reading index.html and app.js.
 *
 * @param {string} appDir Application directory path.
 * @returns {{ valid: boolean, errors: string[] }} Validation result.
 */
export function validateVotingAppDirectory(appDir) {
    const resolvedDir = path.resolve(appDir);
    const indexPath = path.join(resolvedDir, 'index.html');
    const appJsPath = path.join(resolvedDir, 'app.js');

    if (!fs.existsSync(indexPath) || !fs.existsSync(appJsPath)) {
        return {
            valid: false,
            errors: ['Missing index.html or app.js in target directory']
        };
    }

    return validateVotingAppFiles({
        indexHtml: fs.readFileSync(indexPath, 'utf-8'),
        appJs: fs.readFileSync(appJsPath, 'utf-8')
    });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
    const appDir = process.argv[2];

    if (!appDir) {
        console.error('Usage: node scripts/validate-voting-app.js <app-directory>');
        process.exit(1);
    }

    const result = validateVotingAppDirectory(appDir);
    if (!result.valid) {
        console.error('❌ Voting app validation failed:');
        result.errors.forEach(error => console.error(`- ${error}`));
        process.exit(1);
    }

    console.log('✅ Voting app validation passed');
}
