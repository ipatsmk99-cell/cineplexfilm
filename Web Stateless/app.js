/* ═══════════════════════════════════════════════════════════
   CINEPLEX — JavaScript App
   TMDB API Integration | Full Features
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ── CONFIG ──────────────────────────────────────────────────
const CONFIG = {
  API_KEY: '4783dd9ce734631581f19cace98e345b',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMG_BASE: 'https://image.tmdb.org/t/p/',
  IMG_SIZES: { poster: 'w342', backdrop: 'w1280', cast: 'w185', small: 'w92' },
  PLACEHOLDER_POSTER: 'https://via.placeholder.com/342x513/0f0f1a/a855f7?text=No+Image',
  PLACEHOLDER_BACKDROP: 'https://via.placeholder.com/1280x720/030305/4a1080?text=CINEPLEX',
  PLACEHOLDER_CAST: 'https://via.placeholder.com/185x185/0f0f1a/6d28d9?text=?',
};

// ── STATE ────────────────────────────────────────────────────
const state = {
  heroMovie: null,
  heroType: 'movie',
  searchTimeout: null,
  searchActive: false,
  watchlist: JSON.parse(localStorage.getItem('cineplex_watchlist') || '[]'),
  liked: JSON.parse(localStorage.getItem('cineplex_liked') || '[]'),
  currentModal: null,
};

// Genres map
const GENRES = {
  28: 'Aksi', 12: 'Petualangan', 16: 'Animasi', 35: 'Komedi', 80: 'Kriminal',
  99: 'Dokumenter', 18: 'Drama', 10751: 'Keluarga', 14: 'Fantasi', 36: 'Sejarah',
  27: 'Horor', 10402: 'Musik', 9648: 'Misteri', 10749: 'Romantis', 878: 'Fiksi Ilmiah',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'Perang', 37: 'Barat',
  10759: 'Aksi & Petualangan', 10762: 'Anak-anak', 10763: 'Berita', 10764: 'Realita',
  10765: 'Sci-Fi & Fantasi', 10766: 'Sabun', 10767: 'Bincang', 10768: 'Perang & Politik',
};

// ── API ──────────────────────────────────────────────────────
const api = {
  async fetch(endpoint, params = {}) {
    const url = new URL(`${CONFIG.BASE_URL}${endpoint}`);
    url.searchParams.set('api_key', CONFIG.API_KEY);
    url.searchParams.set('language', 'id-ID');
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('[CINEPLEX API]', e);
      return null;
    }
  },

  imgUrl(path, size = 'poster') {
    if (!path) return CONFIG.PLACEHOLDER_POSTER;
    return `${CONFIG.IMG_BASE}${CONFIG.IMG_SIZES[size]}${path}`;
  },

  getTrending: () => api.fetch('/trending/all/week'),
  getMovies: (cat) => api.fetch(`/movie/${cat}`),
  getTVPopular: () => api.fetch('/tv/popular'),
  getMovieDetail: (id) => api.fetch(`/movie/${id}`),
  getTVDetail: (id) => api.fetch(`/tv/${id}`),
  getMovieCredits: (id) => api.fetch(`/movie/${id}/credits`),
  getTVCredits: (id) => api.fetch(`/tv/${id}/credits`),
  getSimilarMovies: (id) => api.fetch(`/movie/${id}/similar`),
  getSimilarTV: (id) => api.fetch(`/tv/${id}/similar`),
  search: (q) => api.fetch('/search/multi', { query: q, include_adult: false }),
};

// ── UTILS ────────────────────────────────────────────────────
const utils = {
  formatRating: (v) => v ? Number(v).toFixed(1) : 'N/A',
  formatYear: (d) => d ? d.split('-')[0] : '—',
  formatRuntime: (m) => {
    if (!m) return '—';
    const h = Math.floor(m / 60), min = m % 60;
    return h > 0 ? `${h}j ${min}m` : `${min}m`;
  },
  truncate: (str, n) => str && str.length > n ? str.slice(0, n) + '...' : (str || ''),
  mapGenres: (ids) => ids?.slice(0,3).map(id => GENRES[id]).filter(Boolean).join(', ') || '—',
  getTitle: (item) => item.title || item.name || 'Judul Tidak Tersedia',
  getDate: (item) => item.release_date || item.first_air_date || '',
  getType: (item) => item.media_type === 'tv' ? 'tv' : (item.title ? 'movie' : 'tv'),
};

// ── DOM ──────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const $q = (sel) => document.querySelector(sel);

// ── TOAST ────────────────────────────────────────────────────
function showToast(msg, icon = '💜') {
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('exit');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3200);
}

// ── PARTICLES ───────────────────────────────────────────────
function spawnParticles() {
  const container = $('hero-particles');
  if (!container) return;
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size}px;
      --dur: ${Math.random() * 12 + 8}s;
      --delay: ${Math.random() * 10}s;
      --op: ${Math.random() * 0.5 + 0.1};
    `;
    container.appendChild(p);
  }
}

// ── HERO ─────────────────────────────────────────────────────
function setHero(movies) {
  if (!movies?.length) return;
  const movie = movies[Math.floor(Math.random() * Math.min(8, movies.length))];
  state.heroMovie = movie;
  state.heroType = utils.getType(movie);

  const title = utils.getTitle(movie);
  const year = utils.formatYear(utils.getDate(movie));
  const rating = utils.formatRating(movie.vote_average);
  const genres = utils.mapGenres(movie.genre_ids);
  const overview = utils.truncate(movie.overview || 'Deskripsi tidak tersedia.', 200);

  $('hero-title').textContent = title;
  $('hero-rating-val').textContent = rating;
  $('hero-year').textContent = year;
  $('hero-genre').textContent = genres;
  $('hero-overview').textContent = overview;

  const bg = $('hero-bg');
  if (movie.backdrop_path) {
    bg.style.backgroundImage = `url(${api.imgUrl(movie.backdrop_path, 'backdrop')})`;
    bg.classList.add('loaded');
  }
}

// ── MOVIE CARD ────────────────────────────────────────────────
function createCard(item, index = null) {
  const type = utils.getType(item);
  const title = utils.getTitle(item);
  const year = utils.formatYear(utils.getDate(item));
  const rating = utils.formatRating(item.vote_average);
  const poster = api.imgUrl(item.poster_path, 'poster');

  const card = document.createElement('div');
  card.className = 'movie-card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${title} (${year})`);
  card.innerHTML = `
    ${index !== null ? `<div class="card-rank">#${index + 1}</div>` : ''}
    <img
      class="card-poster"
      src="${poster}"
      alt="${title} poster"
      loading="lazy"
      onerror="this.src='${CONFIG.PLACEHOLDER_POSTER}'"
    />
    <div class="card-overlay">
      <div class="card-title">${title}</div>
      <div class="card-meta">
        <span class="card-rating">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#a855f7"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          ${rating}
        </span>
        <span class="card-year">${year}</span>
        <button class="card-play-btn" aria-label="Putar ${title}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
      </div>
    </div>
  `;

  // Click: open detail modal
  card.addEventListener('click', () => openModal(item.id, type));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(item.id, type); }
  });

  // Play btn
  const playBtn = card.querySelector('.card-play-btn');
  if (playBtn) {
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPlayer(utils.getTitle(item));
    });
  }

  return card;
}

// ── SLIDERS ──────────────────────────────────────────────────
function populateSlider(sliderId, items, showRank = false) {
  const slider = $(sliderId);
  if (!slider) return;
  slider.innerHTML = '';
  if (!items?.length) { slider.innerHTML = '<p style="color: var(--text-muted); padding: 20px;">Gagal memuat data.</p>'; return; }
  items.slice(0, 20).forEach((item, i) => {
    slider.appendChild(createCard(item, showRank ? i : null));
  });
}

function addSkeletons(sliderId, count = 8) {
  const slider = $(sliderId);
  if (!slider) return;
  slider.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'card-skeleton';
    slider.appendChild(s);
  }
}

function setupSliderControls(prefix, sliderId) {
  const slider = $(sliderId);
  const prev = $(`prev-${prefix}`);
  const next = $(`next-${prefix}`);
  if (!slider || !prev || !next) return;
  const scrollAmount = () => slider.clientWidth * 0.75;
  prev.addEventListener('click', () => slider.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }));
  next.addEventListener('click', () => slider.scrollBy({ left: scrollAmount(), behavior: 'smooth' }));
}

// ── MODAL ────────────────────────────────────────────────────
async function openModal(id, type = 'movie') {
  const overlay = $('modal-overlay');
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  state.currentModal = { id, type };

  // Reset
  $('modal-title').textContent = 'Memuat...';
  $('modal-overview').textContent = '';
  $('modal-cast-grid').innerHTML = '';
  $('modal-similar-slider').innerHTML = '';
  $('modal-backdrop').src = CONFIG.PLACEHOLDER_BACKDROP;
  $('modal-poster').src = CONFIG.PLACEHOLDER_POSTER;

  const isMovie = type === 'movie';
  const [detail, credits, similar] = await Promise.all([
    isMovie ? api.getMovieDetail(id) : api.getTVDetail(id),
    isMovie ? api.getMovieCredits(id) : api.getTVCredits(id),
    isMovie ? api.getSimilarMovies(id) : api.getSimilarTV(id),
  ]);

  if (!detail) { showToast('Gagal memuat detail film.', '❌'); closeModal(); return; }

  const title = detail.title || detail.name || '—';
  const year = utils.formatYear(detail.release_date || detail.first_air_date);
  const runtime = isMovie ? utils.formatRuntime(detail.runtime) : (detail.number_of_seasons ? `${detail.number_of_seasons} Musim` : '—');
  const genres = detail.genres?.map(g => g.name).join(', ') || '—';
  const lang = (detail.original_language || '').toUpperCase();

  $('modal-title').textContent = title;
  $('modal-rating-val').textContent = utils.formatRating(detail.vote_average);
  $('modal-year').textContent = year;
  $('modal-runtime').textContent = runtime;
  $('modal-lang').textContent = lang;
  $('modal-overview').textContent = detail.overview || 'Deskripsi tidak tersedia.';
  $('modal-genres').textContent = genres;
  $('modal-status').textContent = detail.status || '—';
  $('modal-popularity').textContent = detail.popularity ? Math.round(detail.popularity).toLocaleString('id') : '—';
  $('modal-votes').textContent = detail.vote_count ? detail.vote_count.toLocaleString('id') : '—';

  if (detail.backdrop_path) {
    $('modal-backdrop').src = api.imgUrl(detail.backdrop_path, 'backdrop');
    $('modal-backdrop').alt = title;
  }
  if (detail.poster_path) {
    $('modal-poster').src = api.imgUrl(detail.poster_path, 'poster');
    $('modal-poster').alt = title;
  }

  // Watchlist state
  const wlBtn = $('modal-watchlist-btn');
  const isInWL = state.watchlist.some(x => x.id === id && x.type === type);
  wlBtn.classList.toggle('active', isInWL);

  // Like state
  const likeBtn = $('modal-like-btn');
  const isLiked = state.liked.some(x => x.id === id && x.type === type);
  likeBtn.classList.toggle('active', isLiked);
  if (isLiked) likeBtn.querySelector('svg').setAttribute('fill', '#a855f7');

  // Play
  $('modal-play-btn').onclick = () => openPlayer(title);
  $('hero-play-btn').onclick = () => openPlayer(utils.getTitle(state.heroMovie));

  // Watchlist toggle
  wlBtn.onclick = () => {
    const idx = state.watchlist.findIndex(x => x.id === id && x.type === type);
    if (idx === -1) {
      state.watchlist.push({ id, type, title, poster: detail.poster_path });
      showToast(`Ditambahkan ke Watchlist: ${title}`, '🔖');
      wlBtn.classList.add('active');
    } else {
      state.watchlist.splice(idx, 1);
      showToast(`Dihapus dari Watchlist`, '🗑️');
      wlBtn.classList.remove('active');
    }
    localStorage.setItem('cineplex_watchlist', JSON.stringify(state.watchlist));
  };

  // Like toggle
  likeBtn.onclick = () => {
    const idx = state.liked.findIndex(x => x.id === id && x.type === type);
    if (idx === -1) {
      state.liked.push({ id, type });
      showToast(`Disukai: ${title}`, '💜');
      likeBtn.classList.add('active');
      likeBtn.querySelector('svg').setAttribute('fill', '#a855f7');
    } else {
      state.liked.splice(idx, 1);
      showToast(`Batal disukai`, '🤍');
      likeBtn.classList.remove('active');
      likeBtn.querySelector('svg').setAttribute('fill', 'none');
    }
    localStorage.setItem('cineplex_liked', JSON.stringify(state.liked));
  };

  // Cast
  const castGrid = $('modal-cast-grid');
  const cast = credits?.cast?.slice(0, 12) || [];
  castGrid.innerHTML = cast.length ? cast.map(p => `
    <div class="cast-card">
      <img 
        class="cast-img"
        src="${p.profile_path ? api.imgUrl(p.profile_path, 'cast') : CONFIG.PLACEHOLDER_CAST}"
        alt="${p.name}"
        loading="lazy"
        onerror="this.src='${CONFIG.PLACEHOLDER_CAST}'"
      />
      <div class="cast-name">${p.name}</div>
    </div>
  `).join('') : '<p style="color: var(--text-muted); font-size: 13px;">Data pemeran tidak tersedia.</p>';

  // Similar
  const similarSlider = $('modal-similar-slider');
  const similars = similar?.results?.slice(0, 12) || [];
  similarSlider.innerHTML = similars.length ? similars.map(m => `
    <div class="similar-card" onclick="openModal(${m.id}, '${type}')" role="button" tabindex="0" aria-label="${utils.getTitle(m)}">
      <img 
        src="${api.imgUrl(m.poster_path, 'small')}" 
        alt="${utils.getTitle(m)}"
        loading="lazy"
        onerror="this.src='${CONFIG.PLACEHOLDER_POSTER}'"
      />
    </div>
  `).join('') : '<p style="color: var(--text-muted); font-size: 13px;">Tidak ada rekomendasi.</p>';

  // Scroll to top
  $('modal').scrollTop = 0;
}

function closeModal() {
  const overlay = $('modal-overlay');
  overlay.hidden = true;
  document.body.style.overflow = '';
  state.currentModal = null;
}

// ── PLAYER ──────────────────────────────────────────────────
function openPlayer(title = '') {
  $('player-overlay').hidden = false;
  $('player-title').textContent = title;
  $('player-msg').textContent = 'Menyambungkan ke server streaming...';
  document.body.style.overflow = 'hidden';

  // Simulate loading
  const msgs = [
    'Memeriksa kualitas video...',
    'Mengatur resolusi 4K HDR...',
    'Memutar konten...',
  ];
  let i = 0;
  const interval = setInterval(() => {
    if (i < msgs.length) {
      $('player-msg').textContent = msgs[i++];
    } else {
      clearInterval(interval);
      $('player-msg').textContent = '▶ Sedang memutar dalam demo mode';
    }
  }, 1200);
}

function closePlayer() {
  $('player-overlay').hidden = true;
  document.body.style.overflow = '';
}

// ── SEARCH ──────────────────────────────────────────────────
async function doSearch(query) {
  if (!query.trim()) { clearSearch(); return; }
  state.searchActive = true;

  $('hero-section').style.display = 'none';
  $('main-content').style.display = 'none';
  const section = $('search-results-section');
  section.hidden = false;
  $('search-query-display').textContent = `"${query}"`;

  const grid = $('search-results-grid');
  $('search-no-results').hidden = true;
  grid.innerHTML = '';
  for (let i = 0; i < 12; i++) {
    const sk = document.createElement('div');
    sk.style.cssText = 'aspect-ratio:2/3;border-radius:12px;background:var(--bg-card);animation:shimmer 1.8s infinite;background-size:200% 100%;background-image:linear-gradient(90deg,var(--bg-card) 25%,rgba(168,85,247,0.05) 50%,var(--bg-card) 75%)';
    grid.appendChild(sk);
  }

  const data = await api.search(query);
  grid.innerHTML = '';

  if (!data?.results?.length) {
    $('search-no-results').hidden = false;
    return;
  }

  const results = data.results.filter(r => r.media_type !== 'person' && r.poster_path);
  if (!results.length) { $('search-no-results').hidden = false; return; }

  results.slice(0, 24).forEach(item => {
    const type = item.media_type === 'tv' ? 'tv' : 'movie';
    const card = createCard(item);
    card.style.cssText = 'flex: none;'; 
    card.onclick = () => openModal(item.id, type);
    grid.appendChild(card);
  });
}

function clearSearch() {
  state.searchActive = false;
  $('search-results-section').hidden = true;
  $('hero-section').style.display = '';
  $('main-content').style.display = '';
  $('search-input').value = '';
  $('search-container').classList.remove('expanded');
}

// ── NAVBAR SCROLL ────────────────────────────────────────────
function initNavbar() {
  const navbar = $('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });
}

// ── EVENT LISTENERS ──────────────────────────────────────────
function initEventListeners() {
  // Modal close
  $('modal-close').addEventListener('click', closeModal);
  $('modal-overlay').addEventListener('click', (e) => {
    if (e.target === $('modal-overlay')) closeModal();
  });

  // Player close
  $('player-close').addEventListener('click', closePlayer);
  $('player-overlay').addEventListener('click', (e) => {
    if (e.target === $('player-overlay')) closePlayer();
  });

  // Hero play
  $('hero-play-btn').addEventListener('click', () => {
    if (state.heroMovie) openPlayer(utils.getTitle(state.heroMovie));
  });

  // Hero info
  $('hero-info-btn').addEventListener('click', () => {
    if (state.heroMovie) openModal(state.heroMovie.id, state.heroType);
  });

  // Search toggle
  const searchContainer = $('search-container');
  const searchInput = $('search-input');
  const searchBtn = $('search-btn');

  searchBtn.addEventListener('click', () => {
    searchContainer.classList.toggle('expanded');
    if (searchContainer.classList.contains('expanded')) {
      searchInput.focus();
    } else {
      clearSearch();
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { clearSearch(); }
    if (e.key === 'Enter') { doSearch(searchInput.value); }
  });

  searchInput.addEventListener('input', () => {
    clearTimeout(state.searchTimeout);
    state.searchTimeout = setTimeout(() => doSearch(searchInput.value), 500);
  });

  // Hamburger
  const hamburger = $('hamburger');
  const mobileMenu = $('mobile-menu');
  hamburger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
  });

  mobileMenu.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // Notification
  $('notification-btn').addEventListener('click', () => {
    showToast('Tidak ada notifikasi baru', '🔔');
  });

  // Avatar
  $('user-avatar').addEventListener('click', () => {
    showToast(`Watchlist: ${state.watchlist.length} film`, '👤');
  });

  // See all buttons
  document.querySelectorAll('.see-all-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;
      showToast(`Menampilkan semua ${btn.parentElement.querySelector('.section-title').textContent.trim().split(' ').slice(1).join(' ')}`, '📋');
    });
  });

  // Nav links
  document.querySelectorAll('.nav-link, .mobile-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      const matchingNav = document.querySelector(`.nav-link[data-section="${link.dataset.section}"]`);
      if (matchingNav) matchingNav.classList.add('active');
      const section = link.dataset.section;
      if (section === 'home') { clearSearch(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else if (section === 'trending') { document.getElementById('section-trending')?.scrollIntoView({ behavior: 'smooth' }); }
      else if (section === 'series') { document.getElementById('section-series')?.scrollIntoView({ behavior: 'smooth' }); }
      else if (section === 'movies') { document.getElementById('section-nowplaying')?.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  // Keyboard: Escape closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('player-overlay').hidden) closePlayer();
      else if (!$('modal-overlay').hidden) closeModal();
      else if (state.searchActive) clearSearch();
    }
  });

  // Logo click
  $('nav-logo-link').addEventListener('click', () => {
    clearSearch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ── INIT ─────────────────────────────────────────────────────
async function init() {
  spawnParticles();
  initNavbar();
  initEventListeners();
  setupSliderControls();

  // Show skeletons
  ['trending', 'nowplaying', 'toprated', 'popular', 'series', 'upcoming'].forEach(id => {
    addSkeletons(`slider-${id}`);
  });

  // Fetch all data in parallel
  const [trending, nowPlaying, topRated, popular, tvPopular, upcoming] = await Promise.all([
    api.getTrending(),
    api.getMovies('now_playing'),
    api.getMovies('top_rated'),
    api.getMovies('popular'),
    api.getTVPopular(),
    api.getMovies('upcoming'),
  ]);

  // Hero
  setHero(trending?.results || popular?.results);

  // Sliders
  populateSlider('slider-trending', trending?.results, true);
  populateSlider('slider-nowplaying', nowPlaying?.results);
  populateSlider('slider-toprated', topRated?.results);
  populateSlider('slider-popular', popular?.results);
  populateSlider('slider-series', tvPopular?.results);
  populateSlider('slider-upcoming', upcoming?.results);

  // Welcome toast
  setTimeout(() => showToast('Selamat datang di CINEPLEX! 🎬', '💜'), 1000);
}

// Setup slider controls
function setupSliderControls() {
  [
    ['trending', 'slider-trending'],
    ['nowplaying', 'slider-nowplaying'],
    ['toprated', 'slider-toprated'],
    ['popular', 'slider-popular'],
    ['series', 'slider-series'],
    ['upcoming', 'slider-upcoming'],
  ].forEach(([prefix, sliderId]) => {
    const slider = $(sliderId);
    const prev = $(`prev-${prefix}`);
    const next = $(`next-${prefix}`);
    if (!slider || !prev || !next) return;
    const amt = () => slider.clientWidth * 0.72;
    prev.addEventListener('click', () => slider.scrollBy({ left: -amt(), behavior: 'smooth' }));
    next.addEventListener('click', () => slider.scrollBy({ left: amt(), behavior: 'smooth' }));
  });
}

// ── START ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
