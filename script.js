/** * CONFIGURATION : Remplace par ta clé API TMDB
 */
const API_KEY = 'a41dc0592a165a6fda7e056496a917ee'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

// État de l'application
let myLibrary = JSON.parse(localStorage.getItem('fast_library')) || [];
let currentFilter = 'all';

// --- 1. GESTION DU THÈME ---
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    themeToggle.innerText = newTheme === 'dark' ? '🌓' : '☀️';
});

// --- 2. RECHERCHE FONCTIONNELLE ---
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

searchInput.addEventListener('input', async (e) => {
    const query = e.target.value;
    if (query.length < 3) {
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
        return;
    }

    try {
        const resp = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=fr-FR`);
        const data = await resp.json();
        displaySearchResults(data.results);
    } catch (error) {
        console.error("Erreur API:", error);
    }
});

function displaySearchResults(results) {
    searchResults.innerHTML = '';
    if (!results || results.length === 0) return;

    searchResults.style.display = 'block';
    
    results.slice(0, 6).forEach(item => {
        if (!item.poster_path) return; // Ignore ceux sans image pour le look

        const div = document.createElement('div');
        div.className = 'search-item';
        div.innerHTML = `
            <img src="${IMG_URL + item.poster_path}" style="width: 40px; border-radius: 5px;">
            <div class="search-item-info">
                <div style="font-weight: 600; font-size: 0.9rem;">${item.title || item.name}</div>
                <div style="font-size: 0.7rem; color: #888;">${item.media_type === 'tv' ? 'Série' : 'Film'}</div>
            </div>
        `;
        div.onclick = () => {
            openDetailedModal(item, false);
            searchResults.style.display = 'none';
            searchInput.value = '';
        };
        searchResults.appendChild(div);
    });
}

// --- 3. GESTION BIBLIOTHÈQUE ---
function addToLibrary(item, status) {
    const exists = myLibrary.find(m => m.id === item.id);
    if (!exists) {
        myLibrary.push({
            id: item.id,
            title: item.title || item.name,
            poster: item.poster_path,
            overview: item.overview,
            type: item.media_type || (item.first_air_date ? 'tv' : 'movie'),
            status: status,
            genres: item.genre_ids,
            isFavorite: false,
            tracking: { season: 1, episode: 1 }
        });
    } else {
        exists.status = status;
    }
    saveAndRender();
}

// --- 4. AFFICHAGE DE LA GRILLE ---
function renderGrid() {
    const grid = document.getElementById('mainGrid');
    grid.innerHTML = '';

    const filtered = currentFilter === 'all' 
        ? myLibrary 
        : myLibrary.filter(m => m.status === currentFilter);

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${IMG_URL + item.poster}" alt="${item.title}">
            <div class="card-overlay">
                <span class="status-badge" style="color: var(--accent); font-size: 0.7rem; font-weight: 800;">${item.status.toUpperCase()}</span>
                <strong style="display:block; margin-bottom: 5px;">${item.title}</strong>
                <p class="overlay-desc">${item.overview || 'Pas de description'}</p>
                <button class="info-btn">PLUS D'INFOS</button>
            </div>
        `;
        card.onclick = () => openDetailedModal(item, true);
        grid.appendChild(card);
    });
}

// --- 5. MODALE DÉTAILLÉE ---
async function openDetailedModal(item, isFromLibrary) {
    const modal = document.getElementById('detailsModal');
    const body = document.getElementById('modalBody');
    modal.style.display = 'block';

    // On prépare le contenu de base
    body.innerHTML = `
        <div style="display: flex; flex-wrap: wrap;">
            <img src="${IMG_URL + (item.poster_path || item.poster)}" class="modal-poster" style="width: 300px; border-radius: 20px 0 0 20px;">
            <div class="modal-details" style="padding: 30px; flex: 1;">
                <h2 style="margin-top:0">${item.title || item.name}</h2>
                <p style="color: var(--text-dim); font-size: 0.9rem;">${item.overview || 'Aucun résumé disponible.'}</p>
                
                <div class="tracking-controls" style="margin-top: 20px;">
                    <label>Statut : </label>
                    <select id="statusSelect" onchange="updateItemStatus(${item.id}, this.value, ${JSON.stringify(item).replace(/"/g, '&quot;')})">
                        <option value="none">-- Choisir --</option>
                        <option value="watchlist">À voir</option>
                        <option value="watching">En cours</option>
                        <option value="finished">Terminé</option>
                    </select>
                </div>
                <div id="episodeSection" style="margin-top: 20px;"></div>
            </div>
        </div>
    `;

    // Si c'est une série, on peut aller chercher les épisodes
    const type = item.media_type === 'tv' || item.type === 'tv';
    if (type) {
        fetchEpisodes(item.id, 1); // Saison 1 par défaut pour le test
    }
}

async function fetchEpisodes(tvId, seasonNum) {
    const epSection = document.getElementById('episodeSection');
    try {
        const resp = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNum}?api_key=${API_KEY}&language=fr-FR`);
        const data = await resp.json();
        
        epSection.innerHTML = `<h4>Épisodes Saison ${seasonNum}</h4><div class="episode-list">`;
        data.episodes.slice(0, 5).forEach(ep => {
            epSection.innerHTML += `
                <div class="episode-card" style="display:flex; gap:10px; margin-bottom:10px; background: rgba(255,255,255,0.05); padding:10px; border-radius:10px;">
                    <img src="${ep.still_path ? IMG_URL + ep.still_path : 'https://via.placeholder.com/80'}" style="width: 80px; border-radius: 5px;">
                    <div>
                        <div style="font-size:0.8rem; font-weight:600;">${ep.episode_number}. ${ep.name}</div>
                        <button onclick="alert('Épisode marqué !')" style="font-size:0.6rem; background: var(--accent); border:none; border-radius:5px; cursor:pointer;">Marquer vu</button>
                    </div>
                </div>
            `;
        });
        epSection.innerHTML += `</div>`;
    } catch (e) {
        epSection.innerHTML = "<p>Détails des épisodes non disponibles.</p>";
    }
}

function updateItemStatus(id, status, fullItem) {
    addToLibrary(fullItem, status);
    renderGrid();
}

function saveAndRender() {
    localStorage.setItem('fast_library', JSON.stringify(myLibrary));
    renderGrid();
}

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelector('.nav-btn.active').classList.remove('active');
        btn.classList.add('active');
        currentFilter = btn.dataset.tab;
        renderGrid();
    });
});

// Fermeture modale
document.querySelector('.close-btn').onclick = () => document.getElementById('detailsModal').style.display = "none";

// Initialisation
renderGrid();