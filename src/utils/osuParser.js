const path = require('path');
const fs = require('fs');
const osuParser = require('osu-parser');

async function parseBeatmapFolder(folderPath) {
  if (typeof folderPath !== 'string' || folderPath.trim() === '') {
    throw new Error('Invalid path provided to parseBeatmapFolder');
  }

  // Check if the folderPath is a directory
  if (!fs.existsSync(folderPath) || !fs.lstatSync(folderPath).isDirectory()) {
    throw new Error('Provided path is not a directory: ' + folderPath);
  }

  // Find the first .osu file
  const osuFileName = fs.readdirSync(folderPath).find(file => file.endsWith('.osu'));
  if (!osuFileName) {
    throw new Error('No .osu file found in folder: ' + folderPath);
  }

  const osuFilePath = path.join(folderPath, osuFileName);


  const parsed = await osuParser.parseFile(osuFilePath);

  const beatmapInfo = {
    title: parsed.metadata.Title || 'Unknown Title',
    artist: parsed.metadata.Artist || 'Unknown Artist',
    audioPath: path.join(folderPath, parsed.general.AudioFilename || 'audio.mp3'),
    coverPath: null, 
  };

  return beatmapInfo;
}

module.exports = { parseBeatmapFolder };
