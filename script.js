/** * CONFIGURATION : Placez votre clé API TMDB ci-dessous 
 */
const API_KEY = 'a41dc0592a165a6fda7e056496a917ee'; 
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

// État de l'application (Database locale)
let myLibrary = JSON.parse(localStorage.getItem('fast_library')) || [];
let currentFilter = 'all';

// Éléments DOM
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const mainGrid = document.getElementById('mainGrid');
const modal = document.getElementById('detailsModal');
const modalBody = document.getElementById('modalBody');

// --- 1. RECHERCHE ---
searchInput.addEventListener('input', async (e) => {
    const query = e.target.value;
    if (query.length < 3) {
        searchResults.innerHTML = '';
        return;
    }

    // Recherche multi-supports (Films, Séries, Animés)
    const resp = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}&language=fr-FR`);
    const data = await resp.json();
    displaySearchPreview(data.results);
});

function displaySearchPreview(results) {
    searchResults.innerHTML = '';
    results.slice(0, 5).forEach(item => {
        const div = document.createElement('div');
        div.style.padding = '10px';
        div.style.borderBottom = '1px solid #333';
        div.style.cursor = 'pointer';
        div.innerHTML = `<strong>${item.title || item.name}</strong> (${item.media_type})`;
        div.onclick = () => openDetails(item);
        searchResults.appendChild(div);
    });
}

// --- 2. GESTION DE LA BIBLIOTHÈQUE ---
function addToLibrary(item, status = 'watchlist') {
    const exists = myLibrary.find(m => m.id === item.id);
    if (!exists) {
        myLibrary.push({
            id: item.id,
            title: item.title || item.name,
            poster: item.poster_path,
            type: item.media_type || (item.first_air_date ? 'tv' : 'movie'),
            status: status,
            genres: item.genre_ids,
            isFavorite: false,
            tracking: { season: 1, episode: 1, note: '' }
        });
        saveAndRender();
    }
}

function updateStatus(id, newStatus) {
    const item = myLibrary.find(m => m.id === id);
    if (item) item.status = newStatus;
    saveAndRender();
}

function toggleFavorite(id, event) {
    event.stopPropagation();
    const item = myLibrary.find(m => m.id === id);
    if (item) item.isFavorite = !item.isFavorite;
    saveAndRender();
}

// --- 3. AFFICHAGE (RENDER) ---
function renderGrid() {
    mainGrid.innerHTML = '';
    let filtered = myLibrary;

    if (currentFilter === 'ai-rec') {
        renderAIRecommendations();
        return;
    } else if (currentFilter !== 'all') {
        filtered = myLibrary.filter(m => m.status === currentFilter);
    }

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <button class="fav-btn ${item.isFavorite ? 'active' : ''}" onclick="toggleFavorite(${item.id}, event)">❤</button>
            <img src="${IMG_URL + item.poster}" alt="${item.title}">
            <div class="card-info">
                <strong>${item.title}</strong>
                <p>${item.status === 'watching' ? `S${item.tracking.season} E${item.tracking.episode}` : item.status}</p>
            </div>
        `;
        card.onclick = () => openDetails(item, true);
        mainGrid.appendChild(card);
    });
}

// --- 4. MODALE & TRACKING ---
function openDetails(item, isFromLibrary = false) {
    const data = isFromLibrary ? item : item;
    const libItem = myLibrary.find(m => m.id === data.id);
    
    modal.style.display = "block";
    searchResults.innerHTML = '';
    
    modalBody.innerHTML = `
        <div style="display: flex; gap: 20px;">
            <img src="${IMG_URL + data.poster_path || IMG_URL + data.poster}" style="width: 250px; border-radius: 10px;">
            <div>
                <h2>${data.title || data.name}</h2>
                <p>${data.overview || 'Pas de description disponible.'}</p>
                
                <div class="tracking-controls">
                    <label>Statut :</label>
                    <select onchange="updateStatus(${data.id}, this.value); addToLibrary(${JSON.stringify(data).replace(/"/g, '&quot;')}, this.value)">
                        <option value="none">-- Choisir --</option>
                        <option value="watchlist" ${libItem?.status === 'watchlist' ? 'selected' : ''}>À voir</option>
                        <option value="watching" ${libItem?.status === 'watching' ? 'selected' : ''}>En cours</option>
                        <option value="finished" ${libItem?.status === 'finished' ? 'selected' : ''}>Terminé</option>
                    </select>

                    ${libItem?.status === 'watching' ? `
                        <div style="margin-top:15px;">
                            Saison: <input type="number" value="${libItem.tracking.season}" min="1" onchange="updateTracking(${data.id}, 'season', this.value)">
                            Épisode: <input type="number" value="${libItem.tracking.episode}" min="1" onchange="updateTracking(${data.id}, 'episode', this.value)">
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function updateTracking(id, field, value) {
    const item = myLibrary.find(m => m.id === id);
    if (item) item.tracking[field] = parseInt(value);
    saveAndRender();
}

// --- 5. LOGIQUE IA (RECOMMANDATIONS) ---
async function renderAIRecommendations() {
    mainGrid.innerHTML = '<h3>Analyse de vos favoris...</h3>';
    const favorites = myLibrary.filter(m => m.isFavorite);
    
    if (favorites.length === 0) {
        mainGrid.innerHTML = '<p>Marquez des titres en "Favoris" pour activer l\'IA.</p>';
        return;
    }

    // Simple IA Logic: On prend le genre du premier favori pour suggérer
    const topGenre = favorites[0].genres[0];
    const resp = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${topGenre}&language=fr-FR`);
    const data = await resp.json();
    
    mainGrid.innerHTML = '<h3>Parce que vous aimez ' + favorites[0].title + ' :</h3>';
    data.results.slice(0, 5).forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<img src="${IMG_URL + item.poster_path}"><div class="card-info"><strong>${item.title}</strong></div>`;
        card.onclick = () => openDetails(item);
        mainGrid.appendChild(card);
    });
}

// --- UTILITAIRES ---
function saveAndRender() {
    localStorage.setItem('fast_library', JSON.stringify(myLibrary));
    renderGrid();
}

// Navigation par onglets
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelector('.nav-btn.active').classList.remove('active');
        btn.classList.add('active');
        currentFilter = btn.dataset.tab;
        renderGrid();
    });
});

// Fermer modale
document.querySelector('.close-btn').onclick = () => modal.style.display = "none";
window.onclick = (e) => { if(e.target == modal) modal.style.display = "none"; }

// Initialisation
renderGrid();