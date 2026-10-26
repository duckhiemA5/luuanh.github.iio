
const fileInput = document.getElementById('files');
const gallery = document.getElementById('gallery');
const empty = document.getElementById('empty');
const viewer = document.getElementById('viewer');

let db;
let photos = [];
let currentId = null;

// Khởi tạo kho lưu ảnh trong trình duyệt
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MemorySpace', 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore('photos', {
        keyPath: 'id',
        autoIncrement: true
      });
    };

    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onerror = () => reject(request.error);
  });
}

// Lấy tất cả ảnh đã lưu
function getPhotos() {
  return new Promise((resolve, reject) => {
    const request = db.transaction('photos', 'readonly')
      .objectStore('photos').getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Lưu ảnh vào trình duyệt
function savePhoto(photo) {
  return new Promise((resolve, reject) => {
    const request = db.transaction('photos', 'readwrite')
      .objectStore('photos').add(photo);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Định dạng ngày
function formatDate(date) {
  return new Date(date).toLocaleDateString('vi-VN');
}

// Hiển thị các ảnh trên dây
function render() {
  gallery.querySelectorAll('.photo')
    .forEach(el => el.remove());

  empty.style.display = photos.length ? 'none' : 'block';

  photos.forEach((photo, index) => {
    const card = document.createElement('div');
    card.className = 'photo';

    card.style.setProperty(
      '--tilt',
      `${[-3, 2, -1, 3, -2][index % 5]}deg`
    );

    card.style.setProperty('--delay', `${index * -0.7}s`);

    const clip = document.createElement('div');
    clip.className = 'clip';

    const img = document.createElement('img');
    img.src = URL.createObjectURL(photo.blob);
    img.alt = photo.title;

    const caption = document.createElement('div');
    caption.className = 'caption';
    caption.textContent = photo.title;

    const date = document.createElement('div');
    date.className = 'date';
    date.textContent = formatDate(photo.date);

    card.append(clip, img, caption, date);
    card.onclick = () => openViewer(photo.id);

    gallery.appendChild(card);
  });
}

// Chọn ảnh từ máy tính
fileInput.addEventListener('change', async function () {
  const files = Array.from(this.files || [])
    .filter(file => file.type.startsWith('image/'));

  for (const file of files) {
    const title = prompt(
      'Đặt tên cho kỷ niệm này:',
      file.name.replace(/\.[^.]+$/, '')
    );

    if (title === null) continue;

    try {
      await savePhoto({
        title: title.trim() || 'Một khoảnh khắc',
        date: new Date().toISOString(),
        blob: file
      });
    } catch (error) {
      alert('Không lưu được ảnh. Bộ nhớ trình duyệt có thể đã đầy.');
    }
  }

  photos = await getPhotos();
  render();
  this.value = '';
});

// Mở ảnh lớn
function openViewer(id) {
  const photo = photos.find(item => item.id === id);
  if (!photo) return;

  currentId = id;

  document.getElementById('bigImage').src =
    URL.createObjectURL(photo.blob);

  document.getElementById('bigCaption').textContent =
    photo.title;

  document.getElementById('bigDate').textContent =
    formatDate(photo.date);

  viewer.classList.add('open');
}

// Đóng ảnh lớn
function closeViewer() {
  viewer.classList.remove('open');
  document.getElementById('bigImage').src = '';
}

// Xóa ảnh
async function deleteCurrent() {
  if (!confirm('Bạn có chắc muốn xóa ảnh này không?')) {
    return;
  }

  await new Promise((resolve, reject) => {
    const request = db.transaction('photos', 'readwrite')
      .objectStore('photos').delete(currentId);

    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });

  photos = await getPhotos();
  closeViewer();
  render();
}

// Tạo hiệu ứng sao chuyển động
const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');

let stars = [];

function resizeStars() {
  const dpr = window.devicePixelRatio || 1;

  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  stars = Array.from({ length: 150 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 1.5 + 0.3,
    a: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.008 + 0.002
  }));
}

function animateStars() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  stars.forEach(star => {
    star.a += star.speed;

    const opacity =
      0.25 + (Math.sin(star.a) + 1) * 0.35;

    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);

    ctx.fillStyle = `rgba(235,220,255,${opacity})`;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#bda5ff';
    ctx.fill();
  });

  requestAnimationFrame(animateStars);
}

// Khởi chạy website
window.addEventListener('resize', resizeStars);

async function init() {
  resizeStars();
  animateStars();

  try {
    await openDB();
    photos = await getPhotos();
    render();
  } catch (error) {
    alert('Không thể khởi tạo kho ảnh. Hãy thử Chrome hoặc Edge.');
    console.error(error);
  }
}

init();
