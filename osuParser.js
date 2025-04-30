// osuParser.js
async function parseOsuMetadata(fileContent) {
    const lines = fileContent.split(/\r?\n/);
    const metadata = {};
    let inMetadata = false;
  
    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//')) continue;
  
      if (line.startsWith('[Metadata]')) {
        inMetadata = true;
        continue;
      }
      if (inMetadata) {
        if (line.startsWith('[')) break; // New section starts
        const [key, ...rest] = line.split(':');
        if (key && rest.length > 0) {
          metadata[key.trim()] = rest.join(':').trim();
        }
      }
    }
  
    return metadata;
  }
  
  module.exports = { parseOsuMetadata };
  