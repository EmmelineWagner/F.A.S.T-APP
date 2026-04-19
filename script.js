const TMDB_KEY = 'a41dc0592a165a6fda7e056496a917ee';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let state = {
    library: JSON.parse(localStorage.getItem('fast_lib')) || [],
    favorites: JSON.parse(localStorage.getItem('fast_favs')) || [],
    currentFilter: 'all'
};

// --- MENU UTILISATEUR ---
const userAvatar = document.getElementById('userAvatar');
const userDropdown = document.getElementById('userDropdown');

userAvatar.onclick = (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('active');
};

document.onclick = () => userDropdown.classList.remove('active');


// --- RECHERCHE ---
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    if (query.length > 2) {
        performSearch(query);
    } else {
        searchResults.style.display = 'none';
    }
});

async function performSearch(query) {
    const r = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=fr-FR`);
    const data = await r.json();
    displaySearch(data.results);
}

function displaySearch(results) {
    searchResults.innerHTML = '';
    const filtered = results.filter(i => i.poster_path).slice(0, 6);
    if (filtered.length > 0) {
        searchResults.style.display = 'block';
        filtered.forEach(item => {
            const div = document.createElement('div');
            div.style = "display:flex; align-items:center; gap:15px; padding:12px; border-bottom:1px solid #222; cursor:pointer;";
            div.innerHTML = `
                <img src="${IMG_URL + item.poster_path}" style="width:45px; border-radius:8px;">
                <div>
                    <div style="font-weight:800; font-size:0.9rem; color:white;">${(item.title || item.name).toUpperCase()}</div>
                    <div style="font-size:0.7rem; color:#888;">${item.release_date || item.first_air_date || ''}</div>
                </div>
            `;
            div.onclick = () => { openDetails(item); searchResults.style.display = 'none'; searchInput.value = ''; };
            searchResults.appendChild(div);
        });
    }
}

function quickSearch(genre) {
    searchInput.value = genre;
    performSearch(genre);
    window.scrollTo({top: 0, behavior: 'smooth'});
}

// --- RENDU UI ---
function renderUI() {
    renderWatchingRow();
    renderGrid();
    renderRecommendations();
}

function renderRecommendations() {
    const section = document.getElementById('recommendationsSection');
    const row = document.getElementById('recommendationsRow');
    
    if (state.library.length === 0 && state.favorites.length === 0) {
        section.style.display = 'none';
        return;
    }

    // IA Simplifiée : Trouver les genres les plus fréquents
    // Pour cet exemple, on propose du contenu basé sur les derniers ajouts
    section.style.display = 'block';
    // Simulation de recommandations (on pourrait appeler TMDB discovery)
    row.innerHTML = `<p style="padding:20px; color:#666;">Analyse de vos goûts en cours... Basé sur vos ${state.library.length} titres.</p>`;
}

function renderWatchingRow() {
    const row = document.getElementById('watchingRow');
    const watching = state.library.filter(m => m.status === 'watching');
    
    if (watching.length === 0) {
        row.innerHTML = `<p style="color:#444; padding:20px; font-style:italic;">Rien en cours. Explore le catalogue !</p>`;
        return;
    }

    row.innerHTML = watching.map(item => `
        <div class="card" onclick='openDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
            <img src="${IMG_URL + item.poster}">
            <div style="position:absolute; bottom:0; width:100%; padding:20px; background:linear-gradient(transparent, black);">
                <div style="font-weight:800; font-size:0.9rem;">${item.title}</div>
                <div style="width:100%; height:4px; background:#333; margin-top:8px; border-radius:2px;">
                    <div style="width:60%; height:100%; background:var(--primary); border-radius:2px;"></div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderGrid() {
    const grid = document.getElementById('mainGrid');
    grid.innerHTML = '';
    const filtered = state.currentFilter === 'all' ? state.library : state.library.filter(m => m.status === state.currentFilter);
    
    grid.innerHTML = filtered.map(item => `
        <div class="card" onclick='openDetails(${JSON.stringify(item).replace(/'/g, "&apos;")})'>
            <img src="${IMG_URL + item.poster}">
        </div>
    `).join('');
}

// --- MODALE ---
async function openDetails(item) {
    const modal = document.getElementById('detailsModal');
    const body = document.getElementById('modalBody');
    modal.style.display = 'block';
    
    const isTV = item.media_type === 'tv' || item.type === 'tv' || item.first_air_date;
    const libItem = state.library.find(m => m.id === item.id);
    const isFav = state.favorites.includes(item.id);

    const stars = Math.round(item.vote_average / 2) || 0;
    const starHtml = '★'.repeat(stars) + '☆'.repeat(5 - stars);

    body.innerHTML = `
        <img src="${item.backdrop_path ? 'https://image.tmdb.org/t/p/original' + item.backdrop_path : IMG_URL + (item.poster_path || item.poster)}" class="modal-header-img">
        <button class="fav-btn ${isFav ? 'active' : ''}" onclick='toggleFav(${item.id})'>❤</button>
        <div class="modal-info">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <h1 style="font-size:2.5rem; font-weight:800;">${item.title || item.name}</h1>
                    <div class="star-rating">${starHtml} <span style="font-size:0.9rem; color:#666; margin-left:10px;">(${item.release_date || item.first_air_date || 'N/A'})</span></div>
                </div>
            </div>

            <p style="color:#ccc; margin:20px 0; font-size:1.1rem; line-height:1.6;">${item.overview || 'Pas de résumé.'}</p>
            
            <div class="progress-container">
                <label style="font-weight:700; display:block; margin-bottom:10px;">Statut & Progression</label>
                <select onchange='updateStatus(${JSON.stringify(item).replace(/'/g, "&apos;")}, this.value)' style="width:100%; padding:12px; border-radius:12px; background:#000; color:white; border:1px solid var(--primary); font-weight:700; margin-bottom:15px;">
                    <option value="none">-- Modifier le statut --</option>
                    <option value="watchlist" ${libItem?.status === 'watchlist' ? 'selected' : ''}>À voir</option>
                    <option value="watching" ${libItem?.status === 'watching' ? 'selected' : ''}>En cours</option>
                    <option value="finished" ${libItem?.status === 'finished' ? 'selected' : ''}>Terminé</option>
                    <option value="delete" style="color:#ff4d4d;">Retirer de la liste</option>
                </select>

                ${libItem?.status === 'watching' ? `
                    <div class="progress-controls">
                        <span>Saison</span>
                        <input type="number" value="${libItem.season || 1}" class="progress-btn" style="width:50px" onchange="updateProgression(${item.id}, 'season', this.value)">
                        <span>Épisode</span>
                        <input type="number" value="${libItem.episode || 1}" class="progress-btn" style="width:50px" onchange="updateProgression(${item.id}, 'episode', this.value)">
                    </div>
                ` : ''}
            </div>

            <div id="episodesArea" style="margin-top:40px;"></div>
        </div>
    `;
    if (isTV) fetchEpisodes(item.id);
}

function toggleFav(id) {
    const idx = state.favorites.indexOf(id);
    if (idx > -1) state.favorites.splice(idx, 1);
    else state.favorites.push(id);
    localStorage.setItem('fast_favs', JSON.stringify(state.favorites));
    const btn = document.querySelector('.fav-btn');
    btn.classList.toggle('active');
}

function updateProgression(id, field, value) {
    const item = state.library.find(m => m.id === id);
    if (item) {
        item[field] = parseInt(value);
        localStorage.setItem('fast_lib', JSON.stringify(state.library));
    }
}


async function fetchEpisodes(id) {
    const area = document.getElementById('episodesArea');
    const r = await fetch(`https://api.themoviedb.org/3/tv/${id}/season/1?api_key=${TMDB_KEY}&language=fr-FR`);
    const data = await r.json();
    area.innerHTML = `<h3 style="margin-bottom:20px; font-size:1.4rem;">Saison 1</h3>` + data.episodes.map(ep => `
        <div style="display:flex; gap:20px; background:rgba(255,255,255,0.03); padding:15px; border-radius:20px; margin-bottom:15px; align-items:center; border:1px solid #222;">
            <img src="${ep.still_path ? IMG_URL + ep.still_path : 'https://via.placeholder.com/130x80'}" style="width:140px; border-radius:12px;">
            <div>
                <div style="font-weight:800; font-size:1rem; color:var(--primary);">${ep.episode_number}. ${ep.name}</div>
                <p style="font-size:0.8rem; color:#999; margin-top:5px;">${ep.overview ? ep.overview.substring(0, 100) + '...' : 'Pas de résumé.'}</p>
            </div>
        </div>
    `).join('');
}

function updateStatus(item, status) {
    if (status === 'delete') {
        state.library = state.library.filter(m => m.id !== item.id);
    } else {
        const exists = state.library.find(m => m.id === item.id);
        if (exists) {
            exists.status = status;
        } else {
            state.library.push({ 
                id: item.id, 
                title: item.title || item.name, 
                poster: item.poster_path || item.poster, 
                status: status, 
                type: item.media_type || (item.name ? 'tv' : 'movie'),
                season: 1,
                episode: 1
            });
        }
    }
    localStorage.setItem('fast_lib', JSON.stringify(state.library));
    renderUI();
}


// Filtres
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelector('.nav-btn.active').classList.remove('active');
        btn.classList.add('active');
        state.currentFilter = btn.dataset.tab;
        renderGrid();
    };
});

document.querySelector('.close-btn').onclick = () => document.getElementById('detailsModal').style.display = 'none';

renderUI();