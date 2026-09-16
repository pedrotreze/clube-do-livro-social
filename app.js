const OPEN_LIBRARY = 'https://openlibrary.org/search.json';
const COVER = 'https://covers.openlibrary.org/b/id/';
const $ = (id) => document.getElementById(id);
const storedName = localStorage.getItem('clube-apelido');
let books = JSON.parse(localStorage.getItem('clube-livros') || '[]');

function updateStats() {
  $('book-count').textContent = books.length;
  $('member-name').textContent = localStorage.getItem('clube-apelido') || '—';
}
function showMessage(text, error = false) { $('message').textContent = text; $('message').className = `message${error ? ' error' : ''}`; }
function renderResults(items) {
  $('results').innerHTML = items.slice(0, 8).map((book) => {
    const cover = book.cover_i ? `${COVER}${book.cover_i}-M.jpg` : '';
    const author = book.author_name?.[0] || 'Autor não informado';
    const year = book.first_publish_year || 'Ano não informado';
    const pages = book.number_of_pages_median ? `${book.number_of_pages_median} páginas` : 'Páginas não informadas';
    return `<article class="book"><img src="${cover}" alt="Capa de ${book.title}" onerror="this.style.visibility='hidden'"><div><h3>${book.title}</h3><p>${author}</p><p>${year} · ${pages}</p><button data-key="${book.key}" data-title="${encodeURIComponent(book.title)}" data-author="${encodeURIComponent(author)}" data-cover="${cover}" type="button">Adicionar à estante</button></div></article>`;
  }).join('');
  $('results').querySelectorAll('button').forEach((button) => button.addEventListener('click', () => {
    books.push({ key: button.dataset.key, title: decodeURIComponent(button.dataset.title), author: decodeURIComponent(button.dataset.author), cover: button.dataset.cover });
    localStorage.setItem('clube-livros', JSON.stringify(books)); updateStats(); button.textContent = 'Adicionado ✓'; button.disabled = true;
  }));
}
$('book-search').addEventListener('submit', async (event) => {
  event.preventDefault(); const query = $('search-input').value.trim(); if (!query) return;
  showMessage('Buscando na Open Library…');
  try { const response = await fetch(`${OPEN_LIBRARY}?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,cover_i,first_publish_year,number_of_pages_median`); if (!response.ok) throw new Error('Não foi possível consultar a Open Library.'); const data = await response.json(); if (!data.docs.length) throw new Error('Nenhum livro encontrado.'); renderResults(data.docs); showMessage(`${data.numFound.toLocaleString('pt-BR')} resultados encontrados.`); } catch (error) { showMessage(error.message, true); }
});
$('name-button').addEventListener('click', () => { const name = prompt('Como o clube deve chamar você?', storedName || ''); if (name?.trim()) { localStorage.setItem('clube-apelido', name.trim()); updateStats(); $('name-button').textContent = name.trim(); } });
if (storedName) $('name-button').textContent = storedName;
updateStats();
