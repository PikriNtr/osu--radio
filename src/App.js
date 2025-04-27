import React, { useState, useEffect } from 'react';
import { Howl } from 'howler';

const { ipcRenderer } = window.electron;

function App() {
  const [songsFolder, setSongsFolder] = useState('');
  const [beatmapSets, setBeatmapSets]   = useState([]);
  const [beatmapInfo, setBeatmapInfo]   = useState(null);
  const [audioPlayer, setAudioPlayer]   = useState(null);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [volume, setVolume]             = useState(0.7);


  const [currentIndex, setCurrentIndex] = useState(null);


  useEffect(() => {
    return () => { if (audioPlayer) audioPlayer.unload(); };
  }, [audioPlayer]);


  useEffect(() => {
    const iv = setInterval(() => {
      if (audioPlayer && isPlaying) setCurrentTime(audioPlayer.seek());
    }, 500);
    return () => clearInterval(iv);
  }, [audioPlayer, isPlaying]);


  useEffect(() => {
    if (audioPlayer) audioPlayer.volume(volume);
  }, [volume, audioPlayer]);

  const pickFolder = async () => {
    const result = await ipcRenderer.invoke('pick-songs-folder');
    if (result) {
      setSongsFolder(result.folderPath);
      setBeatmapSets(result.subfolders);
      setBeatmapInfo(null);
      setCurrentIndex(null);
    }
  };

  const loadInfo = async (name, index) => {
    const info = await ipcRenderer.invoke('get-beatmap-info', songsFolder, name);
    if (info.error) return console.error(info.error);


    if (audioPlayer) audioPlayer.stop();
    setBeatmapInfo(info);
    setCurrentTime(0);
    setCurrentIndex(index);


    const player = new Howl({
      src:   [info.mp3Url],
      html5: true,
      volume,
      onplay:  () => setIsPlaying(true),
      onpause: () => setIsPlaying(false),
      onstop:  () => { setIsPlaying(false); setCurrentTime(0); },
      onend:   () => { setIsPlaying(false); setCurrentTime(0); },
      onseek:  () => setCurrentTime(player.seek()),
    });
    player.play();
    setAudioPlayer(player);
  };

  const handlePlay = () => {
    if (audioPlayer && !isPlaying) audioPlayer.play();
  };

  const handlePause = () => {
    if (audioPlayer && isPlaying) audioPlayer.pause();
  };

  const handleStop = () => {
    if (audioPlayer) audioPlayer.stop();
  };

  const handleShuffle = () => {
    if (beatmapSets.length === 0) return;
    const randIndex = Math.floor(Math.random() * beatmapSets.length);
    loadInfo(beatmapSets[randIndex], randIndex);
  };

  const handleVolumeChange = e => {
    const v = parseFloat(e.target.value);
    setVolume(v);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>osu!radio</h1>
      <button onClick={pickFolder}>Pick osu! Songs Folder</button>

      {songsFolder && (
        <>
          <h2>Folder: {songsFolder}</h2>
          <ul>
            {beatmapSets.map((name, idx) => (
              <li
                key={name}
                onClick={() => loadInfo(name, idx)}
                style={{ cursor: 'pointer', margin: '4px 0' }}
              >
                {name}
              </li>
            ))}
          </ul>
        </>
      )}

      {beatmapInfo && (
        <div style={{ marginTop: 20 }}>
          <h2>Now Playing</h2>
          <p><strong>Artist:</strong> {beatmapInfo.beatmapInfo.artist}</p>
          <p><strong>Title:</strong>  {beatmapInfo.beatmapInfo.title}</p>

          {beatmapInfo.albumCoverData && (
            <img
              src={beatmapInfo.albumCoverData}
              alt="Cover"
              style={{ maxWidth: '100%', marginTop: 10 }}
            />
          )}

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handlePlay}>Play</button>
            <button onClick={handlePause}>Pause</button>
            <button onClick={handleStop}>Stop</button>
            <button onClick={handleShuffle}>Shuffle</button>
            <label>
              Volume:
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                style={{ marginLeft: 5 }}
              />
            </label>
          </div>

          <div style={{ marginTop: 10 }}>
            <input
              type="range"
              value={currentTime}
              max={audioPlayer ? audioPlayer.duration() : 0}
              onChange={e => audioPlayer.seek(e.target.value)}
              style={{ width: 300 }}
            />
            <span style={{ marginLeft: 8 }}>
              {Math.floor(currentTime)} / {Math.floor(audioPlayer ? audioPlayer.duration() : 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;