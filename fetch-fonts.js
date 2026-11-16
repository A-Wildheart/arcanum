/* Arcanum desktop kit: bundle the fonts into the app, so the installed app never needs the web for them.
   Runs by itself before each build (npm run dist…). Needs a connection once, on the computer doing the build.
   If it cannot reach the font server the build still works; the app then fetches fonts the first time it is online, as before. */
const fs=require('fs'), path=require('path');
(async()=>{ try{
  const appDir=path.join(__dirname,'app'), html=fs.readFileSync(path.join(appDir,'index.html'),'utf8');
  const m=html.match(/VN_FONT_HREF\s*=\s*(["'])(https:\/\/fonts\.googleapis\.com\/[^"']+)\1/); if(!m){ console.log('fonts: no font list found in the app; skipping.'); return; }
  const href=m[2].replace(/&amp;/g,'&'), out=path.join(appDir,'fonts'); fs.mkdirSync(out,{recursive:true});
  const stamp=path.join(out,'source.txt'); if(fs.existsSync(stamp)&&fs.readFileSync(stamp,'utf8')===href&&fs.existsSync(path.join(out,'fonts.css'))){ console.log('fonts: already bundled.'); return; }
  if(typeof fetch!=='function'){ console.log('fonts: this Node.js is too old to download them (needs version 18 or newer); skipping.'); return; }
  const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
  const r=await fetch(href,{headers:{'User-Agent':UA}}); if(!r.ok) throw new Error('font list '+r.status); let css=await r.text();
  const urls=[...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(x=>x[1]))]; if(!urls.length) throw new Error('no font files listed');
  let n=0, bytes=0; for(const u of urls){ const name='f'+String(n++).padStart(3,'0')+(path.extname(new URL(u).pathname)||'.woff2'); const fr=await fetch(u,{headers:{'User-Agent':UA}}); if(!fr.ok) throw new Error('font file '+fr.status); const buf=Buffer.from(await fr.arrayBuffer()); fs.writeFileSync(path.join(out,name),buf); bytes+=buf.length; css=css.split(u).join(name); }
  fs.writeFileSync(path.join(out,'fonts.css'),css); fs.writeFileSync(stamp,href);
  console.log('fonts: bundled '+urls.length+' files ('+(bytes/1048576).toFixed(1)+' MB) into app/fonts.');
}catch(e){ console.log('fonts: could not bundle them ('+(e&&e.message||e)+'). The build continues; the app will fetch its fonts the first time it is online.'); } })();
