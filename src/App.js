import React, { useState, useEffect } from 'react';
import { Howl } from 'howler';
import './App.css'; // Make sure to import the CSS file

// Import heroicons (which are used by Flowbite)
// Note: You should install the heroicons package
// npm install @heroicons/react or yarn add @heroicons/react
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon, 
  BackwardIcon, // Fixed capitalization
  ForwardIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon, 
  CheckIcon 
} from '@heroicons/react/24/solid';

const ipcRenderer = window?.electron?.ipcRenderer ?? {
  invoke: async () => { throw new Error('Electron ipcRenderer not available'); },
  on: () => {} 
};

function App() {
  const [songsFolder, setSongsFolder] = useState('');
  const [beatmapSets, setBeatmapSets] = useState([]);
  const [beatmapInfo, setBeatmapInfo] = useState(null);
  const [audioPlayer, setAudioPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('title');

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
      src: [info.mp3Url],
      html5: true,
      volume,
      onplay: () => setIsPlaying(true),
      onpause: () => setIsPlaying(false),
      onstop: () => { setIsPlaying(false); setCurrentTime(0); },
      onend: () => { setIsPlaying(false); setCurrentTime(0); handleNext(); },
      onseek: () => setCurrentTime(player.seek()),
    });
    player.play();
    setAudioPlayer(player);
  };

  const handleNext = () => {
    if (beatmapSets.length === 0) return;

    if (shuffleMode) {
      const randIndex = Math.floor(Math.random() * beatmapSets.length);
      loadInfo(beatmapSets[randIndex], randIndex);
    } else {
      const nextIndex = (currentIndex + 1) % beatmapSets.length;
      loadInfo(beatmapSets[nextIndex], nextIndex);
    }
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

  const handlePrevious = () => {
    if (beatmapSets.length === 0) return;
    const prevIndex = (currentIndex - 1 + beatmapSets.length) % beatmapSets.length;
    loadInfo(beatmapSets[prevIndex], prevIndex);
  };

  const handleVolumeChange = e => {
    const v = parseFloat(e.target.value);
    setVolume(v);
  };

  // Helper function to format time in MM:SS
  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Filter and sort beatmaps
  const filteredBeatmapSets = beatmapSets.filter(name => {
    return name.toLowerCase().includes(searchText.toLowerCase());
  });

  const sortedBeatmapSets = filteredBeatmapSets.sort((a, b) => {
    switch (sortBy) {
      case 'artist':
        const artistA = a.split(' - ')[0].toLowerCase();
        const artistB = b.split(' - ')[0].toLowerCase();
        return artistA.localeCompare(artistB);
      case 'title':
      default:
        const titleA = a.split(' - ')[1]?.toLowerCase() || '';
        const titleB = b.split(' - ')[1]?.toLowerCase() || '';
        return titleA.localeCompare(titleB);
    }
  });

  return (
    <div className="app-container">
      <header className="header">
        <h1>osu!radio</h1>
      </header>

      <div className="main-content">
        {/* Left Side: Song List */}
        <div className="sidebar">
          <div className="sidebar-content">
            <button className="btn" onClick={pickFolder}>
              Pick osu! Songs Folder
            </button>

            {songsFolder && (
              <>
                <div className="folder-header">FOLDER</div>
                <div className="truncate">{songsFolder}</div>

                <input
                  type="text"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="Search songs..."
                  className="input-field"
                />

                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="select-field"
                >
                  <option value="title">Sort by Title</option>
                  <option value="artist">Sort by Artist</option>
                </select>

                <div className="folder-header">SONGS</div>
                <ul className="song-list">
                  {sortedBeatmapSets.map((name, idx) => (
                    <li
                      key={name}
                      onClick={() => loadInfo(name, idx)}
                      className={`song-item ${idx === currentIndex ? 'active' : ''}`}
                    >
                      <span className="truncate">{name}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Player */}
        <div className="player-container">
          {beatmapInfo && beatmapInfo.albumCoverData && (
            <div 
              className="player-background"
              style={{ backgroundImage: `url(${beatmapInfo.albumCoverData})` }}
            />
          )}
          
          {beatmapInfo ? (
            <div className="player-card">
              <h2>Now Playing</h2>

              {beatmapInfo.albumCoverData && (
                <img
                  src={beatmapInfo.albumCoverData}
                  alt="Album Cover"
                  className="album-cover"
                />
              )}

              <div>
                <p className="song-artist">{beatmapInfo.beatmapInfo.artist}</p>
                <h3 className="song-title">{beatmapInfo.beatmapInfo.title}</h3>
              </div>

              {/* Progress Bar */}
              <div className="progress-container">
                <div className="time-display">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(audioPlayer ? audioPlayer.duration() : 0)}</span>
                </div>
                <input
                  type="range"
                  value={currentTime}
                  max={audioPlayer ? audioPlayer.duration() : 0}
                  onChange={e => audioPlayer.seek(e.target.value)}
                  className="progress-bar"
                />
              </div>

              {/* Controls - Using Heroicons */}
              {/* All controls in one container */}
              <div className="all-controls-container">
  {/* Volume Control - MOVED TO LEFT SIDE */}
              <div className="volume-container">
                <span className="volume-icon">
                  {volume > 0 ? (
                    <SpeakerWaveIcon width="16" height="16" />
                  ) : (
                    <SpeakerXMarkIcon width="16" height="16" />
                  )}
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                />
              </div>
              
              {/* Playback Controls */}
              <div className="controls">
                <button className="control-btn" onClick={handlePrevious}>
                  <BackwardIcon className="control-icon" />
                </button>
                
                {!isPlaying ? (
                  <button className="control-btn primary" onClick={handlePlay}>
                    <PlayIcon className="control-icon" />
                  </button>
                ) : (
                  <button className="control-btn primary" onClick={handlePause}>
                    <PauseIcon className="control-icon" />
                  </button>
                )}
                
                <button className="control-btn" onClick={handleNext}>
                  <ForwardIcon className="control-icon" />
                </button>
              </div>

              {/* Stop button */}
              <button className="control-btn" onClick={handleStop}>
                <StopIcon className="control-icon" />
              </button>
              
              {/* Shuffle Checkbox - MOVED TO RIGHT OF STOP BUTTON */}
              <div className={`shuffle-checkbox ${shuffleMode ? 'active' : ''}`} onClick={() => setShuffleMode(!shuffleMode)}>
                <div className={`checkbox-square ${shuffleMode ? 'checked' : ''}`}>
                  {shuffleMode && <CheckIcon className="w-2.5 h-2.5" />}
                </div>
                <span>Shuffle</span>
              </div>
            </div>
            </div>
          ) : (
            <div className="empty-state">
              <h2>Welcome to osu!radio</h2>
              <p>Select a song from the list or pick an osu! songs folder</p>
              {!songsFolder && (
                <button className="btn" onClick={pickFolder}>
                  Pick osu! Songs Folder
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;