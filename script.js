const TMDB_KEY = 'a41dc0592a165a6fda7e056496a917ee';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let state = {
    library: JSON.parse(localStorage.getItem('watchnest_lib')) || [],
    currentFilter: 'all'
};

// --- RECHERCHE ---
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    if (query.length > 2) {
        fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=fr-FR`)
            .then(r => r.json())
            .then(data => displayFloatingResults(data.results));
    } else {
        const resDiv = document.getElementById('searchResults');
        if (resDiv) resDiv.style.display = 'none';
    }
});

function displayFloatingResults(results) {
    const resDiv = document.getElementById('searchResults') || createSearchDiv();
    resDiv.innerHTML = '';
    
    const filtered = results.filter(i => i.poster_path).slice(0, 6);
    
    if (filtered.length > 0) {
        resDiv.style.display = 'block';
        filtered.forEach(item => {
            const div = document.createElement('div');
            div.className = 'search-item';
            const originalTitle = item.original_title || item.original_name || "";
            
            div.innerHTML = `
                <img src="${IMG_URL + item.poster_path}" style="width:45px; height:65px; object-fit:cover; border-radius:5px;">
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:700; font-size:0.85rem; color:white; text-transform:uppercase;">${item.title || item.name}</span>
                    <span style="font-size:0.7rem; color:#888; font-style:italic;">${originalTitle}</span>
                </div>
            `;
            div.onclick = () => { openDetails(item); resDiv.style.display = 'none'; searchInput.value = ''; };
            resDiv.appendChild(div);
        });
    } else {
        resDiv.style.display = 'none';
    }
}

function createSearchDiv() {
    const d = document.createElement('div');
    d.id = 'searchResults';
    d.className = 'search-results-floating';
    document.querySelector('.search-wrapper').appendChild(d);
    return d;
}

// --- MODALE ET RÉSUMÉS ---
async function openDetails(item) {
    const modal = document.getElementById('detailsModal');
    const body = document.getElementById('modalBody');
    modal.style.display = 'block';
    
    const isTV = item.media_type === 'tv' || item.type === 'tv';
    const banner = item.backdrop_path ? 'https://image.tmdb.org/t/p/original' + item.backdrop_path : IMG_URL + item.poster_path;

    body.innerHTML = `
        <img src="${banner}" class="modal-header-img">
        <div class="modal-info">
            <h2>${item.title || item.name}</h2>
            <p class="description">${item.overview || 'Aucun résumé disponible pour ce contenu.'}</p>
            
            <select onchange='updateStatus(${JSON.stringify(item).replace(/'/g, "&apos;")}, this.value)' style="width:100%; padding:12px; border-radius:12px; background:#000; color:white; border:1px solid var(--accent); margin-bottom:30px; cursor:pointer;">
                <option value="none">-- Modifier le statut --</option>
                <option value="watchlist">À voir</option>
                <option value="watching">En cours</option>
                <option value="finished">Terminé</option>
                <option value="delete" style="color:red;">Supprimer</option>
            </select>
            
            <div id="episodesArea"></div>
        </div>
    `;

    if (isTV) fetchEpisodes(item.id);
}

async function fetchEpisodes(tvId) {
    const area = document.getElementById('episodesArea');
    area.innerHTML = '<h3>Épisodes</h3><p>Chargement des résumés...</p>';
    
    try {
        const r = await fetch(`https://api.themoviedb.org/3/tv/${tvId}/season/1?api_key=${TMDB_KEY}&language=fr-FR`);
        const data = await r.json();
        
        area.innerHTML = `<h3>Saison 1 (${data.episodes.length} épisodes)</h3><br>` + data.episodes.map(ep => `
            <div class="episode-card">
                <img src="${ep.still_path ? IMG_URL + ep.still_path : 'https://via.placeholder.com/150x85'}">
                <div class="ep-text">
                    <h4>${ep.episode_number}. ${ep.name}</h4>
                    <p>${ep.overview || "Résumé non disponible."}</p>
                </div>
            </div>
        `).join('');
    } catch (e) { area.innerHTML = '<p>Impossible de charger les épisodes.</p>'; }
}

function updateStatus(item, status) {
    if (status === 'delete') {
        state.library = state.library.filter(m => m.id !== item.id);
    } else {
        const exists = state.library.find(m => m.id === item.id);
        if (exists) exists.status = status;
        else state.library.push({ id: item.id, title: item.title || item.name, poster: item.poster_path || item.poster, status: status });
    }
    localStorage.setItem('watchnest_lib', JSON.stringify(state.library));
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('mainGrid');
    grid.innerHTML = '';
    const filtered = state.currentFilter === 'all' ? state.library : state.library.filter(m => m.status === state.currentFilter);
    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<img src="${IMG_URL + item.poster}">`;
        card.onclick = () => openDetails(item);
        grid.appendChild(card);
    });
}

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelector('.nav-btn.active').classList.remove('active');
        btn.classList.add('active');
        state.currentFilter = btn.dataset.tab;
        renderGrid();
    };
});

document.querySelector('.close-btn').onclick = () => document.getElementById('detailsModal').style.display = 'none';

renderGrid();