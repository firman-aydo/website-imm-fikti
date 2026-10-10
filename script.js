// ==========================================
// 1. LOGIKA UNTUK SLIDER FOTO (BERANDA)
// ==========================================
let slideIndex = 1;

if (document.getElementsByClassName("slide").length > 0) {
    showSlides(slideIndex);
}

function changeSlide(n) { showSlides(slideIndex += n); }
function currentSlide(n) { showSlides(slideIndex = n); }

function showSlides(n) {
    let i;
    let slides = document.getElementsByClassName("slide");
    let dots = document.getElementsByClassName("dot");
    
    if (slides.length === 0) return; 

    if (n > slides.length) {slideIndex = 1}    
    if (n < 1) {slideIndex = slides.length}
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";  
    }
    for (i = 0; i < dots.length; i++) {
        dots[i].className = dots[i].className.replace(" active", "");
    }
    slides[slideIndex-1].style.display = "block";  
    if(dots.length > 0){
        dots[slideIndex-1].className += " active";
    }
}

// ==========================================
// 2. LOGIKA MENGAMBIL DAFTAR DATA (DENGAN PENCARIAN)
// ==========================================
const urlAPI = '/ambil-berita';

async function muatDataDinamis(kategoriFilter, batasJumlah, elementId, kataKunci = "") {
    const wadah = document.getElementById(elementId);
    if (!wadah) return; 

    try {
        const respon = await fetch(urlAPI);
        const hasil = await respon.json();
        
        wadah.innerHTML = ''; 

        if (hasil.status === 'sukses') {
            let daftarData = hasil.data;

            // 1. Saring berdasarkan kategori
            if (kategoriFilter !== 'semua') {
                daftarData = daftarData.filter(item => item.kategori === kategoriFilter);
            }

            // 2. FITUR PENCARIAN LIVE SEARCH (Mencari di Judul & Isi Teks)
            if (kataKunci.trim() !== "") {
                const k = kataKunci.toLowerCase();
                daftarData = daftarData.filter(item => 
                    item.judul.toLowerCase().includes(k) || 
                    item.isi_konten.toLowerCase().includes(k)
                );
            }

            if (batasJumlah > 0) {
                daftarData = daftarData.slice(0, batasJumlah);
            }

            // Jika berita yang dicari tidak ada
            if (daftarData.length === 0) {
                let pesan = kataKunci.trim() !== "" 
                    ? `Tidak ada hasil pencarian untuk "<b>${kataKunci}</b>".` 
                    : `Belum ada informasi ${kategoriFilter} terbaru.`;
                wadah.innerHTML = `<p style="text-align: center; color: #64748b; font-size: 1.1rem; width: 100%; grid-column: 1 / -1; margin-top: 2rem;">${pesan}</p>`;
                return;
            }

            if (elementId.includes('semua')) {
                wadah.classList.remove('grid', 'grid-proker');
            }

            daftarData.forEach(item => {
                const tanggalRapi = new Date(item.tanggal_dibuat).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric'
                }).toUpperCase();

                let htmlTambahan = "";

                if (elementId.includes('semua')) {
                    htmlTambahan = `
                        <div class="proker-list-item" onclick="window.location.href='/detail/${item._id}'" style="cursor: pointer; transition: 0.3s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                            <div class="proker-list-img">
                                <span class="proker-badge badge-absolute">${item.kategori.toUpperCase()}</span>
                                <img src="${item.foto_url}" alt="${item.judul}" style="height: 100%; object-fit: cover;">
                            </div>
                            <div class="proker-list-content">
                                <h3 style="color: #0f172a;">${item.judul}</h3>
                                <div class="proker-meta" style="color: #64748b;">
                                    By PK IMM FIKTI UMSU <span class="meta-divider"></span> 
                                    <span style="color: #d97706;">🕒</span> ${tanggalRapi}
                                </div>
                                <p style="color: #334155;">${item.isi_konten.substring(0, 150)}...</p>
                                <a href="/detail/${item._id}" class="btn-read-more" style="color: #b91c1c; font-weight: 600; text-decoration: none;">READ MORE</a>
                            </div>
                        </div>
                        <hr class="proker-divider">
                    `;
                } 
                else {
                    // --- REVISI: Hanya menampilkan judul saja di kartu beranda ---
                    const deskripsiSingkat = `<strong style="color: #ffffff; line-height: 1.4; display: block;">${item.judul}</strong>`;
                    
                    htmlTambahan = `
                        <div class="proker-card" onclick="window.location.href='/detail/${item._id}'" style="cursor: pointer; transition: 0.3s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            <img src="${item.foto_url}" alt="${item.judul}" style="width: 100%; height: 200px; object-fit: cover;">
                            <div class="proker-info">
                                <p class="proker-desc">${deskripsiSingkat}</p>
                                <p class="proker-date" style="color: #fcd34d; font-size: 0.85rem; margin-top: 10px; font-weight: 600;">🕒 ${tanggalRapi}</p>
                            </div>
                        </div>
                    `;
                }
                
                wadah.innerHTML += htmlTambahan;
            });
        }
    } catch (error) {
        console.error("Kesalahan:", error);
        wadah.innerHTML = '<p style="text-align: center; color: red;">Gagal terhubung ke server.</p>';
    }
}

// ==========================================
// 3. LOGIKA MENGISI HALAMAN BACA SELENGKAPNYA
// ==========================================
async function muatDetailData() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) return;

    const wadahJudul = document.getElementById('detail-judul');
    const wadahKategori = document.getElementById('detail-kategori');
    const wadahTanggal = document.getElementById('detail-tanggal');
    const wadahFoto = document.getElementById('detail-foto');
    const wadahIsi = document.getElementById('detail-isi');

    if (!wadahJudul) return;

    try {
        const respon = await fetch(`/detail-berita/${id}`);
        const hasil = await respon.json();

        if (hasil.status === 'sukses') {
            const item = hasil.data;
            const tanggalRapi = new Date(item.tanggal_dibuat).toLocaleDateString('id-ID', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });

            wadahJudul.innerText = item.judul;
            wadahKategori.innerText = item.kategori.toUpperCase();
            wadahTanggal.innerText = "Dipublikasikan pada: " + tanggalRapi;
            wadahFoto.src = item.foto_url;
            wadahIsi.innerHTML = item.isi_konten.replace(/\n/g, "<br><br>");
        } else {
            wadahJudul.innerText = "Data tidak ditemukan.";
        }
    } catch (error) {
        console.error("Kesalahan:", error);
    }
}

// ==========================================
// 4. LOGIKA UNTUK HIGHLIGHT HERO GRID (HEADLINE)
// ==========================================
async function muatHeroGrid(kategoriFilter, elementId) {
    const wadah = document.getElementById(elementId);
    if (!wadah) return; 

    try {
        const respon = await fetch('/ambil-berita');
        const hasil = await respon.json();

        if (hasil.status === 'sukses') {
            let daftarData = hasil.data;

            if (kategoriFilter !== 'semua') {
                daftarData = daftarData.filter(item => item.kategori === kategoriFilter);
            }

            daftarData = daftarData.slice(0, 4);

            if (daftarData.length === 0) {
                wadah.innerHTML = ''; 
                return;
            }

            const itemUtama = daftarData[0];
            const itemKecil = daftarData.slice(1);

            let htmlUtama = `
                <!-- REVISI PENTING -->
                <div class="hero-item-proker large" onclick="window.location.href='/detail/${itemUtama._id}'" style="cursor: pointer;">
                    <img src="${itemUtama.foto_url}" alt="${itemUtama.judul}">
                    <div class="hero-overlay">
                        <span class="proker-badge">${itemUtama.kategori.toUpperCase()}</span>
                        <h2 class="hero-title">${itemUtama.judul}</h2>
                    </div>
                </div>
            `;

            let htmlKecil = '<div class="hero-right-grid">';
            const daftarClassPosisi = ['top-right', 'bottom-left', 'bottom-right'];
            
            itemKecil.forEach((item, index) => {
                const classPosisi = daftarClassPosisi[index];
                const classBadge = index > 0 ? 'small-badge' : '';
                const classJudul = index === 0 ? 'small' : 'extra-small';

                htmlKecil += `
                    <!-- REVISI PENTING -->
                    <div class="hero-item-proker ${classPosisi}" onclick="window.location.href='/detail/${item._id}'" style="cursor: pointer;">
                        <img src="${item.foto_url}" alt="${item.judul}">
                        <div class="hero-overlay">
                            <span class="proker-badge ${classBadge}">${item.kategori.toUpperCase()}</span>
                            <h2 class="hero-title ${classJudul}">${item.judul}</h2>
                        </div>
                    </div>
                `;
            });
            htmlKecil += '</div>'; 

            wadah.innerHTML = htmlUtama + htmlKecil;
        }
    } catch (error) {
        console.error("Gagal memuat Hero Grid:", error);
    }
}

// ==========================================
// 5. LOGIKA UNTUK MENGAMBIL DATA PENGURUS BERDASARKAN BIDANG & PERIODE
// ==========================================
async function muatDataPengurus() {
    const wadah = document.getElementById('wadah-semua-pengurus');
    if (!wadah) return;

    const urlParams = new URLSearchParams(window.location.search);
    const periodeAktif = urlParams.get('periode') || '2025-2026';

    const subtitle = document.querySelector('.page-subtitle');
    if (subtitle) {
        subtitle.innerText = `Pimpinan Komisariat IMM FIKTI UMSU Periode ${periodeAktif.replace('-', '/')}`;
    }

    try {
        const respon = await fetch('/ambil-pengurus');
        const hasil = await respon.json();

        if (hasil.status === 'sukses' && hasil.data.length > 0) {
            
            const dataPeriodeIni = hasil.data.filter(item => item.periode === periodeAktif);

            if (dataPeriodeIni.length === 0) {
                wadah.innerHTML = `<p class="text-center" style="width: 100%; color: #64748b; margin-top: 2rem;">Belum ada data kepengurusan yang dipublikasikan untuk periode ${periodeAktif}.</p>`;
                return;
            }

            const urutanBidang = []; 
            const dataDikelompokkan = new Map(); 
            
            dataPeriodeIni.forEach(item => {
                const bidang = item.bidang || 'Lainnya'; 
                if (!dataDikelompokkan.has(bidang)) {
                    dataDikelompokkan.set(bidang, []);
                    urutanBidang.push(bidang);
                }
                dataDikelompokkan.get(bidang).push(item);
            });

            let kerangkaHTML = '';

            // --- PERBAIKAN: Menambahkan Flexbox Centering pada Pimpinan Umum ---
            if (dataDikelompokkan.has('Pimpinan Umum')) {
                kerangkaHTML += `
                    <h2 class="text-center" style="color: #111827; margin-bottom: 2rem; font-size: 1.6rem;">Pimpinan Umum</h2>
                    <div class="grid grid-bph" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 2rem;">
                `;
                dataDikelompokkan.get('Pimpinan Umum').forEach(item => {
                    // Menambahkan batas ukuran agar card tidak melar
                    kerangkaHTML += `
                        <div class="pengurus-card" style="flex: 1; min-width: 250px; max-width: 260px;">
                            <img src="${item.foto_url}" alt="${item.jabatan}" class="pengurus-img">
                            <div class="pengurus-info">
                                <div class="pengurus-nama">${item.nama}</div>
                                <div class="pengurus-jabatan">${item.jabatan}</div>
                            </div>
                        </div>
                    `;
                });
                kerangkaHTML += `</div>`;
                dataDikelompokkan.delete('Pimpinan Umum'); 
                
                const indexHapus = urutanBidang.indexOf('Pimpinan Umum');
                if (indexHapus > -1) urutanBidang.splice(indexHapus, 1);
            }
            // -------------------------------------------------------------------

            if (urutanBidang.length > 0) {
                kerangkaHTML += `<h2 class="text-center" style="color: #111827; margin-top: 5rem; margin-bottom: 1rem; font-size: 1.6rem; font-weight: 800;">BPH/BPO PK IMM FIKTI UMSU</h2>`;
            }

            urutanBidang.forEach(namaBidang => {
                const anggota = dataDikelompokkan.get(namaBidang);
                kerangkaHTML += `
                    <div class="bidang-group">
                        <h3 class="bidang-title">${namaBidang}</h3>
                        <div class="grid grid-bidang-members" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 2rem;">
                `;
                anggota.forEach(item => {
                    kerangkaHTML += `
                            <div class="pengurus-card" style="flex: 1; min-width: 250px; max-width: 260px;">
                                <img src="${item.foto_url}" alt="${item.jabatan}" class="pengurus-img">
                                <div class="pengurus-info">
                                    <div class="pengurus-nama">${item.nama}</div>
                                    <div class="pengurus-jabatan">${item.jabatan}</div>
                                </div>
                            </div>
                    `;
                });
                kerangkaHTML += `</div></div>`;
            });

            wadah.innerHTML = kerangkaHTML;

            const wadahArsip = document.getElementById('wadah-arsip-periode');
            if (wadahArsip) {
                const daftarPeriode = [
                    { id: '2025-2026', judul: 'PERIODE PA 2025/2026', desc: 'Berikut adalah anggota PK IMM<br>FIKTI tahun PA 2025/2026' },
                    { id: '2024-2025', judul: 'PERIODE PA 2024/2025', desc: 'Berikut adalah anggota PK IMM<br>FIKTI tahun PA 2024/2025' },
                    { id: '2023-2024', judul: 'PERIODE PA 2023/2024', desc: 'Berikut adalah anggota PK IMM<br>FIKTI tahun PA 2023/2024' }
                ];

                let htmlArsip = '';
                daftarPeriode.forEach(p => {
                    if (p.id !== periodeAktif) {
                        let urlLink = p.id === '2025-2026' ? 'pengurus.html' : `pengurus.html?periode=${p.id}`;
                        
                        htmlArsip += `
                            <div class="periode-card">
                                <div class="periode-title">${p.judul}</div>
                                <div class="periode-desc">${p.desc}</div>
                                <a href="${urlLink}" class="periode-link">klik link berikut</a>
                            </div>
                        `;
                    }
                });
                wadahArsip.innerHTML = htmlArsip;
            }

        } else {
            wadah.innerHTML = '<p class="text-center" style="width: 100%; color: #64748b;">Database masih kosong.</p>';
        }
    } catch (error) {
        console.error("Kesalahan sistem:", error);
        wadah.innerHTML = '<p class="text-center" style="color: red; width: 100%;">Gagal terhubung ke server.</p>';
    }
}

// ==========================================
// 5. LOGIKA HAMBURGER MENU (MOBILE VIEW)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const tombolHamburger = document.getElementById('hamburger-menu');
    const menuNavigasi = document.querySelector('.nav-menu');

    if (tombolHamburger && menuNavigasi) {
        tombolHamburger.addEventListener('click', () => {
            menuNavigasi.classList.toggle('aktif');
            
            if (menuNavigasi.classList.contains('aktif')) {
                tombolHamburger.innerHTML = '&#10006;'; 
            } else {
                tombolHamburger.innerHTML = '&#9776;';
            }
        });
    }
});

// ==========================================
// 9. LOGIKA HERO SLIDER (CAROUSEL)
// ==========================================
let indeksSlideSaatIni = 0;
let totalSlideTersedia = 0;
let timerOtomatis;

async function muatSliderBeranda() {
    const wadahSlider = document.getElementById('wadah-slider');
    const wadahDots = document.getElementById('wadah-dots');
    if (!wadahSlider) return; 

    try {
        const respon = await fetch('/ambil-slider');
        const hasil = await respon.json();

        if (hasil.status === 'sukses' && hasil.data.length > 0) {
            wadahSlider.innerHTML = '';
            if (wadahDots) wadahDots.innerHTML = '';
            totalSlideTersedia = hasil.data.length;

            hasil.data.forEach((item, index) => {
                const statusAktif = index === 0 ? 'aktif' : '';
                
                let overlayHTML = '';
                if(item.judul !== "") {
                    let targetLink = item.link;

                    overlayHTML = `
                        <div class="slide-overlay">
                            <span class="slide-badge" style="background: #dc2626; color: white; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold;">
                                ${item.jenis}
                            </span>
                            <h2 style="cursor:pointer; margin-top: 8px; line-height: 1.4;" onclick="window.location.href='${targetLink}'">
                                ${item.judul}
                            </h2>
                        </div>
                    `;
                }

                wadahSlider.innerHTML += `
                    <div class="slide-item ${statusAktif}">
                        <img src="${item.foto_url}" alt="${item.jenis}">
                        ${overlayHTML}
                    </div>
                `;

                if (wadahDots) {
                    wadahDots.innerHTML += `<div class="dot ${statusAktif}" onclick="lompatKeSlide(${index})"></div>`;
                }
            });

            putarSliderOtomatis();
        }
    } catch (error) {
        console.error("Gagal memuat slider beranda", error);
    }
}

function geserSlide(arah) {
    indeksSlideSaatIni += arah;
    if (indeksSlideSaatIni >= totalSlideTersedia) indeksSlideSaatIni = 0; 
    if (indeksSlideSaatIni < 0) indeksSlideSaatIni = totalSlideTersedia - 1; 
    perbaruiTampilanSlider();
    resetTimerSlider();
}

function lompatKeSlide(index) {
    indeksSlideSaatIni = index;
    perbaruiTampilanSlider();
    resetTimerSlider();
}

function perbaruiTampilanSlider() {
    const semuaSlide = document.querySelectorAll('.slide-item');
    const semuaTitik = document.querySelectorAll('.dot');
    
    semuaSlide.forEach(slide => slide.classList.remove('aktif'));
    semuaTitik.forEach(titik => titik.classList.remove('aktif'));

    if (semuaSlide[indeksSlideSaatIni]) semuaSlide[indeksSlideSaatIni].classList.add('aktif');
    if (semuaTitik[indeksSlideSaatIni]) semuaTitik[indeksSlideSaatIni].classList.add('aktif');
}

function putarSliderOtomatis() {
    timerOtomatis = setInterval(() => {
        geserSlide(1);
    }, 5000);
}

function resetTimerSlider() {
    clearInterval(timerOtomatis);
    putarSliderOtomatis();
}

// ==========================================
// 6. PEMANGGILAN OTOMATIS SAAT HALAMAN DIBUKA
// ==========================================
window.onload = () => {
    muatDataDinamis('proker', 4, 'wadah-proker');
    muatDataDinamis('berita', 4, 'wadah-berita');
    muatDataDinamis('berita', 0, 'wadah-semua-berita');
    muatDataDinamis('proker', 0, 'wadah-semua-proker');
    muatDetailData();
    muatDataPengurus();
    muatSliderBeranda(); 

    muatHeroGrid('berita', 'wadah-hero-berita');
    muatHeroGrid('proker', 'wadah-hero-proker');

    // --- MENGAKTIFKAN KOLOM PENCARIAN (LIVE SEARCH) ---
    const kotakCari = document.querySelector('.search-box input');
    if (kotakCari) {
        kotakCari.addEventListener('input', (e) => {
            const teksPencarian = e.target.value;
            
            if (document.getElementById('wadah-semua-berita')) {
                muatDataDinamis('berita', 0, 'wadah-semua-berita', teksPencarian);
            } 
            else if (document.getElementById('wadah-semua-proker')) {
                muatDataDinamis('proker', 0, 'wadah-semua-proker', teksPencarian);
            }
        });
    }
};