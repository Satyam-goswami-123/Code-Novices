const fs = require('fs');
const path = require('path');

const emojiMap = {
  '🗂️': 'LayoutDashboard',
  '💬': 'MessageCircle',
  '🕵️': 'Search',
  '🧾': 'Camera',
  '🧭': 'Compass',
  '📈': 'TrendingUp',
  '🕸️': 'Network',
  '🔔': 'BellRing',
  '🚔': 'Route',
  '🧪': 'FlaskConical',
  '🎙️': 'Mic',
  '🛡️': 'ShieldCheck',
  '🧠': 'Brain',
  '🎤': 'Mic',
  '📊': 'BarChart',
  '🔎': 'Search',
  '🇰🇳': 'MapPinned',
  '📸': 'Camera',
  '🔍': 'Search',
  '🎯': 'Target',
  '🔫': 'Crosshair',
  '🚗': 'Car',
  '👥': 'Users',
  '📍': 'MapPin',
  '🔇': 'MicOff',
  '👂': 'Ear',
  '⏸': 'Pause',
  '■': 'Square',
  '▶': 'Play',
  '🗺': 'Map',
  '👮': 'Shield',
  '🤝': 'Handshake',
  '🎚': 'Sliders',
  '📷': 'Camera',
  '📋': 'ClipboardList',
  '👤': 'User',
  '🔁': 'RefreshCw',
  '₹': 'IndianRupee'
};

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  let imports = new Set();

  for (const [emoji, comp] of Object.entries(emojiMap)) {
    if (content.includes(emoji)) {
      // Special check for ternary operators or strings containing emojis
      const regex = new RegExp(emoji, 'g');
      content = content.replace(regex, (match, offset, string) => {
        // If it looks like it's inside quotes that are inside a JS expression block
        const prev = string.substring(Math.max(0, offset - 20), offset);
        const next = string.substring(offset + match.length, Math.min(string.length, offset + 20));
        if ((prev.includes("'") || prev.includes('"')) && (next.includes("'") || next.includes('"'))) {
           // We'll leave these for manual fix if needed or wrap them properly
           console.log(`Potential string literal issue in ${file} at offset ${offset}`);
        }
        imports.add(comp);
        return `<${comp} size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}/>`;
      });
      changed = true;
    }
  }

  // Quick fix for Chat.jsx specific syntax errors
  if (file === 'Chat.jsx' && changed) {
      content = content.replace(/'<Brain size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}\/> Agents collaborating…'/g, "<><Brain size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}/> Agents collaborating…</>");
      content = content.replace(/'<Mic size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}\/> Speak'/g, "<><Mic size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}/> Speak</>");
      content = content.replace(/'<Square size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}\/> Stop'/g, "<><Square size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}/> Stop</>");
  }

  // Quick fix for Patrol.jsx specific syntax errors
  if (file === 'Patrol.jsx' && changed) {
      content = content.replace(/'<MicOff size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}\/>'/g, "<MicOff size={48} />");
      content = content.replace(/'<Ear size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}\/>'/g, "<Ear size={48} />");
      content = content.replace(/'<Mic size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}\/>'/g, "<Mic size={48} />");
      content = content.replace(/'<Pause size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}\/>'/g, "<Pause size={48} />");
      content = content.replace(/'<Play size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}\/> Start listening'/g, "<><Play size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}/> Start listening</>");
      content = content.replace(/'<Square size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}\/> Stop'/g, "<><Square size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}/> Stop</>");
  }

  if (file === 'WhatIf.jsx' && changed) {
      content = content.replace(/'<Play size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}\/> Simulate'/g, "<><Play size={18} style={{marginRight:8, verticalAlign:'text-bottom'}}/> Simulate</>");
  }

  if (changed) {
    if (imports.size > 0) {
      const importStr = `\nimport { ${Array.from(imports).join(', ')} } from 'lucide-react';\n`;
      const importMatches = [...content.matchAll(/^import .* from .*$/gm)];
      if (importMatches.length > 0) {
        const lastMatch = importMatches[importMatches.length - 1];
        const insertPos = lastMatch.index + lastMatch[0].length;
        content = content.substring(0, insertPos) + importStr + content.substring(insertPos);
      } else {
        content = importStr + content;
      }
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
