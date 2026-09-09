import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {root} from './lib.mjs';
const port = Number(process.env.PORT || 4175);
const publicRoot = path.join(root, 'dist');
const allowed = new Map([['/','index.html'],['/index.html','index.html'],['/app.js','app.js'],['/style.css','style.css'],['/data.json','data.json']]);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const server = http.createServer(async (req,res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let pathname;
  try { pathname = new URL(req.url,'http://localhost').pathname; }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  const filename = allowed.get(pathname);
  if (!filename) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const body = await readFile(path.join(publicRoot,filename));
    res.writeHead(200, {'Content-Type':types[path.extname(filename)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' https:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'"});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('Build the site first: npm run build'); }
});
server.listen(port,'127.0.0.1',()=>console.log(`预览：http://127.0.0.1:${server.address().port}`));
