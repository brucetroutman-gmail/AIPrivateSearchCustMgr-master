#!/usr/bin/env node
/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable security/detect-unsafe-regex */

import fs from 'fs/promises';
import path from 'path';

// Security utility functions
export function sanitizeHtml(html) {
    return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

export function validatePath(filePath, allowedDir) {
    const normalizedPath = path.normalize(filePath);
    const resolvedPath = path.resolve(normalizedPath);
    const allowedPath = path.resolve(allowedDir);
    
    if (!resolvedPath.startsWith(allowedPath)) {
        throw new Error('Path traversal attempt detected');
    }
    return resolvedPath;
}

export function safeReadFile(filePath, allowedDir) {
    const safePath = validatePath(filePath, allowedDir);
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return fs.readFile(safePath, 'utf8');
}

export function safeWriteFile(filePath, data, allowedDir) {
    const safePath = validatePath(filePath, allowedDir);
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    return fs.writeFile(safePath, data);
}

// Apply security fixes to client files
async function fixClientSecurity() {
    console.log('Fixing client-side security issues...');
    
    // Fix multi-mode-search.js XSS issues
    const multiSearchPath = './client/c01_client-first-app/multi-mode-search.js';
    let content = await fs.readFile(multiSearchPath, 'utf8');
    
    // Replace unsafe innerHTML assignments with safe alternatives
    content = content.replace(
        /container\.insertAdjacentHTML\('beforeend', resultsHtml\)/g,
        'container.insertAdjacentHTML(\'beforeend\', sanitizeHtml(resultsHtml))'
    );
    
    content = content.replace(
        /performanceTableBody\.insertAdjacentHTML\('beforeend', tableRows\)/g,
        'performanceTableBody.insertAdjacentHTML(\'beforeend\', sanitizeHtml(tableRows))'
    );
    
    // Add sanitization function at the top
    const sanitizeFunction = `
// Security: HTML sanitization function
function sanitizeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

`;
    
    content = sanitizeFunction + content;
    await fs.writeFile(multiSearchPath, content);
    
    // Fix common.js XSS issues
    const commonPath = './client/c01_client-first-app/shared/common.js';
    let commonContent = await fs.readFile(commonPath, 'utf8');
    
    commonContent = commonContent.replace(
        /\.innerHTML\s*=\s*([^;]+);/g,
        '.textContent = $1;'
    );
    
    await fs.writeFile(commonPath, commonContent);
    
    console.log('✓ Client security fixes applied');
}

// Create secure file operations wrapper
async function createSecureFileWrapper() {
    const wrapperPath = './server/s01_server-first-app/lib/utils/secureFileOps.mjs';
    
    const wrapperContent = `
import fs from 'fs-extra';
import path from 'path';

const ALLOWED_DIRS = [
    path.resolve('./sources/local-documents'),
    path.resolve('./data'),
    path.resolve('./lib')
];

function validatePath(filePath) {
    const normalizedPath = path.normalize(filePath);
    const resolvedPath = path.resolve(normalizedPath);
    
    const isAllowed = ALLOWED_DIRS.some(allowedDir => 
        resolvedPath.startsWith(allowedDir)
    );
    
    if (!isAllowed) {
        throw new Error('Path traversal attempt detected: ' + filePath);
    }
    return resolvedPath;
}

export const secureFs = {
    async readFile(filePath, options) {
        const safePath = validatePath(filePath);
        return fs.readFile(safePath, options);
    },
    
    async writeFile(filePath, data, options) {
        const safePath = validatePath(filePath);
        return fs.writeFile(safePath, data, options);
    },
    
    async readdir(dirPath, options) {
        const safePath = validatePath(dirPath);
        return fs.readdir(safePath, options);
    },
    
    async stat(filePath) {
        const safePath = validatePath(filePath);
        return fs.stat(safePath);
    },
    
    createReadStream(filePath, options) {
        const safePath = validatePath(filePath);
        return fs.createReadStream(safePath, options);
    },
    
    createWriteStream(filePath, options) {
        const safePath = validatePath(filePath);
        return fs.createWriteStream(safePath, options);
    }
};
`;
    
    await fs.mkdir(path.dirname(wrapperPath), { recursive: true });
    await fs.writeFile(wrapperPath, wrapperContent);
    console.log('✓ Secure file operations wrapper created');
}

// Main execution
async function main() {
    try {
        console.log('🔒 Applying security fixes...\n');
        
        await fixClientSecurity();
        await createSecureFileWrapper();
        
        console.log('\n✅ Security fixes completed!');
        console.log('\n📋 Next steps:');
        console.log('1. Replace fs-extra imports with secureFs in server files');
        console.log('2. Add CSRF protection to API endpoints');
        console.log('3. Move hardcoded credentials to environment variables');
        console.log('4. Run: npm run lint:security to verify fixes');
        
    } catch (error) {
        console.error('❌ Error applying security fixes:', error);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}