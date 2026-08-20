const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (let file of list) {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      getFiles(file, files);
    } else if (file.endsWith('.tsx')) {
      files.push(file);
    }
  }
  return files;
}

const files = getFiles('apps/web/src');
let changedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Find <input ... > using a regex that matches across newlines
  content = content.replace(/<input([^>]*?)>/g, (match, innerProps) => {
    // Only target number inputs
    if (innerProps.includes('type="number"') || innerProps.includes("type='number'")) {
      // If it already has onFocus, skip it to prevent duplicates
      if (innerProps.includes('onFocus=')) {
        return match;
      }
      
      // If it doesn't have onFocus, append it
      return match.replace(/type=["']number["']/, 'type="number" onFocus={(e) => e.target.select()}');
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    changedFiles++;
    console.log('Fixed:', file);
  }
}
console.log('Total fixed files:', changedFiles);
