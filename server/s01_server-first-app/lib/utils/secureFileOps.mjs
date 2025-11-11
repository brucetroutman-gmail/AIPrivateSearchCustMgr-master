/* eslint-disable security/detect-non-literal-fs-filename */
 

import fs from 'fs-extra';
import path from 'path';

const ALLOWED_DIRS = [
    path.resolve('./sources/local-documents'),
    path.resolve('./data'),
    path.resolve('./lib'),
    path.resolve('../../client/c01_client-first-app/config'),
    '/Users/Shared/AIPrivateSearch/data',
    '/Users/Shared/AIPrivateSearch/sources',
    '/Users/Shared/AIPrivateSearch/config',
    '/Users/Shared/AIPrivateSearch/logs'
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
    
    async mkdir(dirPath, options) {
        const safePath = validatePath(dirPath);
        return fs.mkdir(safePath, options);
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
