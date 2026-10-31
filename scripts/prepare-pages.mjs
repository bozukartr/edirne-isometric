// Keep the GitHub Pages root entry in sync with the application in dist/.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const html=await readFile(new URL('dist/index.html',root),'utf8');
const entry=html.replace(/\b(src|href)="\.\/([^\"]+)"/g,(_,attribute,target)=>`${attribute}="./dist/${target}"`);
await writeFile(new URL('index.html',root),entry);
await writeFile(new URL('.nojekyll',root),'');
console.log(`GitHub Pages entry prepared at ${fileURLToPath(new URL('index.html',root))}`);
