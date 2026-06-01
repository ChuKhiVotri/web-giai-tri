const CONFIG = {
  graduateName: "Lê Hiệp Thuận",
  eventDate: "Thứ tư, 10/06/2026",
  eventTime: "13:00",
  eventPlace: "Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM",
  mapUrl: "https://maps.app.goo.gl/RsnFmjYdMDpXbG2G6",
  mapEmbedUrl: "https://www.google.com/maps?q=Tr%C6%B0%E1%BB%9Dng%20%C4%90%E1%BA%A1i%20h%E1%BB%8Dc%20C%C3%B4ng%20ngh%E1%BB%87%20Th%C3%B4ng%20tin%20-%20%C4%90HQG%20TP.HCM&output=embed"
};

const INVITEES = window.INVITEES || {};
const params = new URLSearchParams(window.location.search);
const slug = (params.get("to") || "").trim().toLowerCase();
const selectedFriend = slug ? INVITEES[slug] : null;
const hasPrivateMemory = Boolean(slug && selectedFriend);
const guest = selectedFriend?.name || params.get("name") || params.get("guest") || "bạn";
const MUSIC_SOURCE = "assets/audio/background.mp3";
const CHORUS_START = 60; // đổi số giây bắt đầu điệp khúc tại đây nếu cần
const CHORUS_END = 105;  // đổi số giây kết thúc điệp khúc tại đây nếu cần

const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
};

setText("guestName", guest);
setText("graduateName", CONFIG.graduateName);
setText("eventDate", CONFIG.eventDate);
setText("eventTime", CONFIG.eventTime);
setText("eventPlace", CONFIG.eventPlace);
setText("friendTitle", `Vài tấm hình giữ lại cho ${guest}`);
setText("friendMessage", selectedFriend?.message || "");

const friendPanel = document.querySelector(".friend-panel");
if (friendPanel && !hasPrivateMemory) {
  friendPanel.remove();
}


const friendPhoto = document.getElementById("friendPhoto");
const sliderDots = document.getElementById("sliderDots");

const allPhotos = hasPrivateMemory ? [
  ...(selectedFriend?.photo ? [selectedFriend.photo] : []),
  ...((selectedFriend?.sharedPhotos) || [])
] : [];

let currentSlide = 0;
let sliderTimer;

if (friendPhoto && allPhotos.length > 0) {
  friendPhoto.src = allPhotos[0];
  friendPhoto.alt = `Ảnh kỷ niệm với ${guest}`;

  if (sliderDots) {
    sliderDots.innerHTML = allPhotos.map((_, index) => `
      <button class="dot ${index === 0 ? "active" : ""}" data-index="${index}" aria-label="Xem ảnh ${index + 1}"></button>
    `).join("");
  }

  const dots = document.querySelectorAll(".dot");

  const updateSlide = (index) => {
    friendPhoto.classList.remove("active");

    setTimeout(() => {
      friendPhoto.src = allPhotos[index];
      friendPhoto.classList.add("active");

      dots.forEach(dot => dot.classList.remove("active"));
      dots[index]?.classList.add("active");
    }, 250);
  };

  const startSlider = () => {
    clearInterval(sliderTimer);
    sliderTimer = setInterval(() => {
      currentSlide++;
      if (currentSlide >= allPhotos.length) currentSlide = 0;
      updateSlide(currentSlide);
    }, 4800);
  };

  dots.forEach(dot => {
    dot.addEventListener("click", () => {
      currentSlide = Number(dot.dataset.index);
      updateSlide(currentSlide);
      startSlider();
    });
  });

  startSlider();
}


const photoLightbox = document.getElementById("photoLightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");

const closeLightbox = () => {
  if (!photoLightbox) return;
  photoLightbox.classList.remove("show");
  photoLightbox.setAttribute("aria-hidden", "true");
};

if (friendPhoto && photoLightbox && lightboxImage) {
  friendPhoto.addEventListener("click", () => {
    lightboxImage.src = friendPhoto.src;
    lightboxImage.alt = friendPhoto.alt || "Ảnh kỷ niệm";
    photoLightbox.classList.add("show");
    photoLightbox.setAttribute("aria-hidden", "false");
  });
}

lightboxClose?.addEventListener("click", closeLightbox);
photoLightbox?.addEventListener("click", (event) => {
  if (event.target === photoLightbox) closeLightbox();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLightbox();
});


const mapLink = document.getElementById("mapLink");
const mapPreviewLink = document.getElementById("mapPreviewLink");
const mapEmbed = document.getElementById("mapEmbed");
if (mapLink) mapLink.href = CONFIG.mapUrl;
if (mapPreviewLink) mapPreviewLink.href = CONFIG.mapUrl;
if (mapEmbed) mapEmbed.src = CONFIG.mapEmbedUrl;

window.addEventListener("load", () => {
  setTimeout(() => document.getElementById("loader")?.classList.add("hide"), 450);
  setTimeout(() => fireConfetti(170), 650);
  setTimeout(() => startMusic(true), 900);
});

const toast = document.getElementById("toast");
const showToast = (text = "Đã copy link mời!") => {
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
};

const copyButton = document.getElementById("copyInvite");
copyButton?.addEventListener("click", async () => {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set("to", slug);
  else url.searchParams.set("name", guest);
  try {
    await navigator.clipboard.writeText(url.toString());
    showToast("Đã copy link mời riêng!");
    fireConfetti(90);
  } catch {
    alert("Không thể copy tự động. Bạn hãy copy link trên thanh địa chỉ nhé.");
  }
});

const copyAllLinks = document.getElementById("copyAllLinks");
copyAllLinks?.addEventListener("click", async () => {
  const base = `${window.location.origin}${window.location.pathname}`;
  const links = Object.entries(INVITEES).map(([key, item]) => `${item.name}: ${base}?to=${encodeURIComponent(key)}`).join("\n");
  if (!links) return showToast("Chưa có danh sách bạn bè trong data/friends.js");
  try {
    await navigator.clipboard.writeText(links);
    showToast("Đã copy danh sách link bạn bè!");
    fireConfetti(120);
  } catch {
    alert(links);
  }
});

const musicToggle = document.getElementById("musicToggle");
const bgMusic = document.getElementById("bgMusic");
let musicPlaying = false;

async function startMusic(isAuto = false) {
  if (!bgMusic) return;
  try {
    bgMusic.volume = 0.35;
    if (bgMusic.currentTime < CHORUS_START || bgMusic.currentTime >= CHORUS_END) {
      bgMusic.currentTime = CHORUS_START;
    }
    await bgMusic.play();
    musicPlaying = true;
    musicToggle?.classList.add("playing");
    musicToggle?.classList.remove("blocked");
    musicToggle?.setAttribute("aria-label", "Tắt nhạc nền");
  } catch {
    musicToggle?.classList.add("blocked");
    if (!isAuto) showToast("Trình duyệt cần bạn bấm lại để phát nhạc");
  }
}

function stopMusic() {
  if (!bgMusic) return;
  bgMusic.pause();
  musicPlaying = false;
  musicToggle?.classList.remove("playing");
  musicToggle?.setAttribute("aria-label", "Bật nhạc nền");
}

musicToggle?.addEventListener("click", async () => {
  if (!musicPlaying) await startMusic(false);
  else stopMusic();
});

document.addEventListener("pointerdown", () => {
  if (!musicPlaying) startMusic(true);
}, { once: true });

bgMusic?.addEventListener("timeupdate", () => {
  if (bgMusic.currentTime >= CHORUS_END) {
    bgMusic.currentTime = CHORUS_START;
    bgMusic.play().catch(() => {});
  }
});

function fireConfetti(total = 100) {
  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  const pieces = Array.from({ length: total }, () => ({
    x: Math.random() * window.innerWidth,
    y: -20 - Math.random() * 120,
    size: 6 + Math.random() * 8,
    speed: 2 + Math.random() * 5,
    drift: -1.5 + Math.random() * 3,
    rotation: Math.random() * Math.PI,
    spin: -0.18 + Math.random() * 0.36,
    alpha: 0.85 + Math.random() * 0.15
  }));

  const colors = ["#ffffff", "#87dcff", "#00a7ee", "#2f7cff", "#c6f4ff"];
  let frame = 0;
  const animate = () => {
    frame += 1;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    pieces.forEach((p, i) => {
      p.y += p.speed;
      p.x += p.drift + Math.sin(frame / 16 + i) * 0.7;
      p.rotation += p.spin;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.58);
      ctx.restore();
    });
    if (pieces.some(p => p.y < window.innerHeight + 40) && frame < 260) requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  };
  animate();
}

// RSVP submit: lưu xác nhận tham gia vào Vercel API + PostgreSQL
const rsvpForm = document.getElementById("rsvpForm");
const rsvpName = document.getElementById("rsvpName");
const rsvpNote = document.getElementById("rsvpNote");
const rsvpStatus = document.getElementById("rsvpStatus");

const setRsvpStatus = (message, type = "") => {
  if (!rsvpStatus) return;
  rsvpStatus.textContent = message;
  rsvpStatus.className = `rsvp-status ${type}`.trim();
};

rsvpForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = rsvpForm.querySelector("button[type='submit']");
  const name = rsvpName?.value.trim();
  const note = rsvpNote?.value.trim();

  if (!name || name.length < 2) {
    setRsvpStatus("Bạn nhập tên ít nhất 2 ký tự nha.", "error");
    rsvpName?.focus();
    return;
  }

  submitButton.disabled = true;
  setRsvpStatus("Đang lưu xác nhận của bạn...", "loading");

  try {
    const response = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        note,
        guest,
        slug,
        attending: true
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Không thể lưu xác nhận.");
    }

    setRsvpStatus("Đã lưu xác nhận tham gia. Cảm ơn bạn nhiều nha 💙", "success");
    showToast("Đã xác nhận tham gia!");
    fireConfetti(140);
    rsvpForm.reset();
  } catch (error) {
    setRsvpStatus(error.message || "Có lỗi xảy ra, bạn thử lại giúp mình nha.", "error");
  } finally {
    submitButton.disabled = false;
  }
});
