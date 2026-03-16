import './style.css'

const queries = [
  { 
    text: "Ambient study lofi low energy focus", 
    videoId: "Q89Dzox4jAE" 
  },
  { 
    text: "Deep focus binaural beats for concentration", 
    videoId: "n4YghVcjbpw" 
  },
  { 
    text: "Classical piano for deep work low intensity", 
    videoId: "sAcj8me7wGI" 
  },
  { 
    text: "Cinematic textures focus ambient minimal", 
    videoId: "nPRrp-3sFgQ" 
  },
  { 
    text: "Brown noise for long study session focus", 
    videoId: "RqzGzwTY-6w" 
  }
];

let player;
let activeVideoId = null;
let activeCard = null;

// YouTube API Callback
window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player('youtube-player', {
    height: '0',
    width: '0',
    videoId: '',
    playerVars: {
      'autoplay': 0,
      'controls': 0,
      'showinfo': 0,
      'modestbranding': 1,
      'loop': 1,
      'fs': 0,
      'cc_load_policy': 0,
      'iv_load_policy': 3,
      'autohide': 0
    },
    events: {
      'onStateChange': onPlayerStateChange,
      'onError': (e) => console.error('YouTube Player Error:', e)
    }
  });
};

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    if (activeCard) stopPlaybackUI(activeCard);
  }
}

function stopPlaybackUI(card) {
  if (!card) return;
  card.classList.remove('playing');
  const status = card.querySelector('.play-status');
  if (status) {
    status.style.opacity = '0';
    status.innerText = 'PLAYING';
  }
}

function startPlaybackUI(card) {
  if (!card) return;
  card.classList.add('playing');
  const status = card.querySelector('.play-status');
  if (status) {
    status.style.opacity = '1';
    status.innerText = 'PLAYING';
  }
}

function setupUI() {
  const container = document.querySelector('#query-container');
  const notification = document.querySelector('#notification');

  queries.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'query-card';
    card.style.animationDelay = `${0.4 + (index * 0.1)}s`;
    card.style.opacity = '0';
    card.style.transform = 'translateY(10px)';
    card.style.animation = 'fadeInUp 0.5s forwards';

    card.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span class="query-text">${item.text}</span>
        <div class="visualizer-mini">
          <div class="visualizer-bar" style="height: 30%;"></div>
          <div class="visualizer-bar" style="height: 30%;"></div>
          <div class="visualizer-bar" style="height: 30%;"></div>
          <div class="visualizer-bar" style="height: 30%;"></div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 1rem;">
        <span class="play-status" style="font-size: 0.7rem; color: var(--accent-secondary); opacity: 0; font-weight: 700;">PLAYING</span>
        <span class="copy-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        </span>
      </div>
    `;

    card.addEventListener('click', () => {
      handleYouTubePlayback(item.videoId, card, item.text);
    });

    container.appendChild(card);
  });

  function handleYouTubePlayback(videoId, card, text) {
    if (!player || typeof player.getPlayerState !== 'function') {
      notification.innerText = "Initializing Audio Engine... Try again in a second.";
      notification.classList.add('show');
      setTimeout(() => notification.classList.remove('show'), 2000);
      return;
    }

    if (activeVideoId === videoId) {
      const state = player.getPlayerState();
      if (state === YT.PlayerState.PLAYING) {
        player.pauseVideo();
        stopPlaybackUI(card);
        card.querySelector('.play-status').innerText = 'PAUSED';
        card.querySelector('.play-status').style.opacity = '1';
      } else {
        player.playVideo();
        startPlaybackUI(card);
      }
      return;
    }

    // Switch video
    if (activeCard) {
      stopPlaybackUI(activeCard);
    }

    activeVideoId = videoId;
    activeCard = card;

    player.loadVideoById(videoId);
    player.playVideo();
    startPlaybackUI(card);

    copyToClipboard(text);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      notification.innerText = "Query copied & Tuning in...";
      notification.classList.add('show');
      setTimeout(() => {
        notification.classList.remove('show');
      }, 2000);
    });
  }
}

document.addEventListener('DOMContentLoaded', setupUI);
