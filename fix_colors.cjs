const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else {
            if (file.endsWith('.jsx') || file.endsWith('.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walkDir('c:\\interviewiq\\src');
let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Fix missing color names
    content = content.replace(/text--(\d+)/g, 'text-indigo-$1');
    content = content.replace(/bg--(\d+)/g, 'bg-indigo-$1');
    
    // Fix dangling slashes on borders
    content = content.replace(/border--(\d+)\//g, 'border-indigo-$1/20');
    content = content.replace(/border--(\d+)/g, 'border-indigo-$1');

    // Any other -- missing colors?
    content = content.replace(/from--(\d+)/g, 'from-indigo-$1');
    content = content.replace(/to--(\d+)/g, 'to-indigo-$1');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changedFiles++;
    }
});

console.log(`Updated ${changedFiles} files with correct color names.`);
