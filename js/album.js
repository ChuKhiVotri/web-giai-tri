let albumPhotos = [...(window.ALBUM_PHOTOS || [])];
const memoryBook = document.getElementById("memoryBook");
const bookPrev = document.getElementById("bookPrev");
const bookNext = document.getElementById("bookNext");
const openBook = document.getElementById("openBook");
const bookCounter = document.getElementById("bookCounter");
const photoLightbox = document.getElementById("photoLightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");
const albumLoading = document.getElementById("albumLoading");

const pages = [];
let currentPage = 0;

function createPhotoCard(photo, index) {
  const figure = document.createElement("figure");
  figure.className = "album-photo-card";
  figure.innerHTML = `
    <button class="album-photo-button" type="button" aria-label="Phóng to ảnh ${index + 1}">
      <img src="${photo.src}" alt="${photo.caption || `Ảnh kỷ niệm ${index + 1}`}" loading="lazy" />
    </button>
    <figcaption>${photo.caption || `Ảnh kỷ niệm ${index + 1}`}</figcaption>
  `;
  return figure;
}

function clearGeneratedPages() {
  pages.splice(0, pages.length);
  if (!memoryBook) return;
  memoryBook.querySelectorAll(".book-page:not(.book-cover)").forEach((page) => page.remove());
}

function buildBook() {
  if (!memoryBook) return;
  clearGeneratedPages();

  const chunks = [];
  for (let i = 0; i < albumPhotos.length; i += 2) {
    chunks.push(albumPhotos.slice(i, i + 2));
  }

  if (!chunks.length) {
    chunks.push([]);
  }

  chunks.forEach((chunk, pageIndex) => {
    const page = document.createElement("article");
    page.className = "book-page album-spread";
    page.dataset.page = String(pageIndex + 1);

    const inner = document.createElement("div");
    inner.className = "album-spread-inner";

    chunk.forEach((photo, index) => inner.appendChild(createPhotoCard(photo, pageIndex * 2 + index)));

    if (chunk.length === 0) {
      const note = document.createElement("div");
      note.className = "album-empty-note";
      note.textContent = "Chưa có ảnh upload. Vào trang Admin Album để thêm ảnh mới nha.";
      inner.appendChild(note);
    }

    if (chunk.length === 1) {
      const note = document.createElement("div");
      note.className = "album-empty-note";
      note.textContent = "Còn chỗ cho một kỷ niệm mới của tụi mình.";
      inner.appendChild(note);
    }

    page.appendChild(inner);
    memoryBook.appendChild(page);
  });

  const ending = document.createElement("article");
  ending.className = "book-page book-ending";
  ending.dataset.page = String(chunks.length + 1);
  ending.innerHTML = `
    <span>Thank you</span>
    <h2>Hẹn chụp thêm nhiều ảnh nữa nha 💙</h2>
    <p>Mỗi tấm hình là một phần nhỏ của hành trình này.</p>
    <a class="btn secondary" href="/admin-album">Thêm ảnh mới</a>
    <a class="btn secondary" href="/">Quay lại thư mời</a>
  `;
  memoryBook.appendChild(ending);

  pages.push(...Array.from(memoryBook.querySelectorAll(".book-page")));
  currentPage = Math.min(currentPage, pages.length - 1);
  updateBook();
}

function updateBook() {
  pages.forEach((page, index) => {
    page.classList.toggle("active", index === currentPage);
    page.classList.toggle("flipped", index < currentPage);
    page.style.zIndex = String(pages.length - Math.abs(currentPage - index));
  });

  if (bookPrev) bookPrev.disabled = currentPage === 0;
  if (bookNext) bookNext.disabled = currentPage === pages.length - 1;

  if (bookCounter) {
    if (currentPage === 0) bookCounter.textContent = "Bìa album";
    else if (currentPage === pages.length - 1) bookCounter.textContent = "Trang cuối";
    else bookCounter.textContent = `Trang ${currentPage} / ${pages.length - 2}`;
  }
}

async function loadUploadedPhotos() {
  try {
    const res = await fetch('/api/album', { cache: 'no-store' });
    const data = await res.json();
    if (res.ok && data.ok && Array.isArray(data.items)) {
      const remotePhotos = data.items.filter((item) => item.src);
      albumPhotos = [...remotePhotos, ...(window.ALBUM_PHOTOS || [])];
    }
  } catch (error) {
    console.warn('Không tải được ảnh upload từ server:', error);
  } finally {
    if (albumLoading) albumLoading.textContent = `Album hiện có ${albumPhotos.length} ảnh.`;
    buildBook();
  }
}

function nextPage() {
  if (currentPage < pages.length - 1) {
    currentPage += 1;
    updateBook();
  }
}

function prevPage() {
  if (currentPage > 0) {
    currentPage -= 1;
    updateBook();
  }
}

function closeLightbox() {
  photoLightbox?.classList.remove("show");
  photoLightbox?.setAttribute("aria-hidden", "true");
}

bookNext?.addEventListener("click", nextPage);
bookPrev?.addEventListener("click", prevPage);
openBook?.addEventListener("click", nextPage);

memoryBook?.addEventListener("click", (event) => {
  const photoButton = event.target.closest(".album-photo-button");
  if (photoButton) {
    const img = photoButton.querySelector("img");
    if (img && lightboxImage && photoLightbox) {
      lightboxImage.src = img.src;
      lightboxImage.alt = img.alt;
      photoLightbox.classList.add("show");
      photoLightbox.setAttribute("aria-hidden", "false");
    }
    return;
  }

  const rect = memoryBook.getBoundingClientRect();
  const x = event.clientX - rect.left;
  if (x > rect.width * 0.58) nextPage();
  if (x < rect.width * 0.42) prevPage();
});

lightboxClose?.addEventListener("click", closeLightbox);
photoLightbox?.addEventListener("click", (event) => {
  if (event.target === photoLightbox) closeLightbox();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") nextPage();
  if (event.key === "ArrowLeft") prevPage();
  if (event.key === "Escape") closeLightbox();
});

loadUploadedPhotos();
