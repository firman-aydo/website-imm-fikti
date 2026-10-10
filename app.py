from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from datetime import datetime
from bson.objectid import ObjectId
from functools import wraps
import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv

# Buka brankas .env
load_dotenv()

# FLASK: Menjadikan folder saat ini sebagai folder statis 
# agar style.css dan folder assets tetap terbaca dengan aman
app = Flask(__name__, static_folder='.', static_url_path='/')
CORS(app) 

# Kunci untuk mengaktifkan fitur Login (Session)
app.secret_key = os.getenv("FLASK_SECRET_KEY")

# ==========================================
# 1. PENGATURAN CLOUDINARY & FUNGSI PENGHANCUR FOTO
# ==========================================
cloudinary.config(
  cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"),
  api_key = os.getenv("CLOUDINARY_API_KEY"),
  api_secret = os.getenv("CLOUDINARY_API_SECRET")
)

def ekstrak_public_id(url):
    """Fungsi untuk memotong URL dan mengambil ID unik foto di Cloudinary"""
    if not url: return None
    try:
        # Contoh URL: https://res.cloudinary.com/.../upload/v123/imm_fikti/foto.webp
        bagian = url.split('/upload/')
        if len(bagian) > 1:
            path_lengkap = bagian[1].split('/', 1)[1] # Melewati teks versi (v123..)
            public_id = path_lengkap.rsplit('.', 1)[0] # Membuang akhiran .webp/.jpg
            return public_id
    except:
        return None
    return None

# ==========================================
# 2. KONEKSI KE DATABASE MONGODB
# ==========================================
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
db = client['imm_fikti_db']

koleksi_berita = db['berita_proker']
koleksi_pengurus = db["pengurus"]
koleksi_banner = db["banner"]
# Kita tetap pakai 1 tabel berita_proker, tapi nanti filternya diperbaiki di bawah
koleksi_proker = db['berita_proker'] 
koleksi_admin = db['admin']

# Buat akun admin default otomatis jika tabel masih kosong
if koleksi_admin.count_documents({}) == 0:
    koleksi_admin.insert_one({
        "username": "pkimmfikti-umsu5650",
        "password": generate_password_hash("pkimmfiktiumsuprogresif5650") 
    })

# ==========================================
# 3. SISTEM LOGIN & AUTENTIKASI ADMIN
# ==========================================
@app.route('/dapur-rahasia-immfikti5650', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username_input = request.form.get('username')
        password_input = request.form.get('password')

        admin = koleksi_admin.find_one({"username": username_input})

        if admin and check_password_hash(admin['password'], password_input):
            session['admin_logged_in'] = True  
            return redirect(url_for('halaman_admin')) 
        else:
            return "Username atau Password salah! Silakan kembali dan coba lagi.", 401

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('admin_logged_in', None) 
    return redirect(url_for('login'))

# ==========================================
# SATPAM API (DECORATOR KEAMANAN)
# ==========================================
def wajib_login(f):
    @wraps(f)
    def fungsi_terlindungi(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return jsonify({"status": "gagal", "pesan": "Akses Ditolak! Anda bukan admin."}), 403
        return f(*args, **kwargs)
    return fungsi_terlindungi

# ==========================================
# RUTE HALAMAN UTAMA & NAVIGASI (FRONTEND)
# ==========================================
@app.route('/')
@app.route('/index.html')
def halaman_utama():
    return app.send_static_file('index.html')

@app.route('/tentang')
@app.route('/tentang.html')
def halaman_tentang():
    return app.send_static_file('tentang.html')

@app.route('/pengurus')
@app.route('/pengurus.html')
def halaman_pengurus():
    return app.send_static_file('pengurus.html')

@app.route('/proker')
@app.route('/proker.html')
def halaman_proker():
    return app.send_static_file('proker.html')

@app.route('/berita')
@app.route('/berita.html')
def halaman_berita():
    return app.send_static_file('berita.html')

@app.route('/ruang-dapuradmin-immfikti')
def halaman_admin():
    # Cek apakah dia punya kunci sesi (sudah login)
    if 'admin_logged_in' not in session:
        return redirect(url_for('login')) 
    
    # Jika aman, tampilkan halaman admin
    return render_template('admin.html') 

@app.route('/kepengurusan')
def halaman_kepengurusan():
    # Pasang gembok ini agar penyusup tidak bisa masuk langsung via URL
    if 'admin_logged_in' not in session:
        return redirect(url_for('login'))
        
    return render_template('admin_pengurus.html')

# ==========================================
# 4. LOGIKA CRUD BERITA & PROKER (API)
# ==========================================

# --- RUTE BARU: UNTUK MENAMPILKAN HALAMAN DETAIL ARTIKEL (SEO & OPEN GRAPH) ---
@app.route('/detail/<id_berita>')
def halaman_detail(id_berita):
    try:
        # Cari berita di database berdasarkan ID
        berita = koleksi_berita.find_one({"_id": ObjectId(id_berita)})
        
        if not berita:
            return "Waduh, artikel ini tidak ditemukan atau sudah dihapus.", 404
            
        # Kirim data ke file detail.html di dalam folder templates
        return render_template('detail.html', berita=berita)
    except Exception as e:
        return f"Terjadi kesalahan peladen: {str(e)}", 500
# ------------------------------------------------------------------------------

@app.route('/tambah-berita', methods=['POST'])
@wajib_login
def tambah_berita():
    try:
        judul = request.form.get('judul')
        kategori = request.form.get('kategori')
        penulis = request.form.get('penulis', 'Tim Redaksi IMM FIKTI') 
        isi = request.form.get('isi')
        foto = request.files.get('foto')
        
        foto_url = "" 

        if foto:
            hasil_upload = cloudinary.uploader.upload(
                foto, 
                folder="imm_fikti",
                quality="auto",  
                format="webp",   
                width=1200,      
                crop="limit"     
            )
            foto_url = hasil_upload.get('secure_url')

        data_baru = {
            "judul": judul,
            "kategori": kategori,
            "penulis": penulis,
            "isi_konten": isi,
            "foto_url": foto_url,
            "tanggal_dibuat": datetime.now()
        }
        
        koleksi_berita.insert_one(data_baru)
        return jsonify({"status": "sukses", "pesan": "Berita/Proker berhasil disimpan!"}), 200

    except Exception as e:
        return jsonify({"status": "gagal", "pesan": str(e)}), 500

@app.route('/ambil-berita', methods=['GET'])
def ambil_berita():
    try:
        semua_berita = list(koleksi_berita.find().sort("tanggal_dibuat", -1))
        for berita in semua_berita:
            berita['_id'] = str(berita['_id'])
        return jsonify({"status": "sukses", "data": semua_berita}), 200
    except Exception as e:
        return jsonify({"status": "gagal", "pesan": str(e)}), 500

@app.route('/detail-berita/<id>', methods=['GET'])
def detail_berita(id):
    try:
        berita = koleksi_berita.find_one({"_id": ObjectId(id)})
        if berita:
            berita['_id'] = str(berita['_id'])
            return jsonify({"status": "sukses", "data": berita}), 200
        else:
            return jsonify({"status": "gagal", "pesan": "Data tidak ditemukan"}), 404
    except Exception as e:
        return jsonify({"status": "gagal", "pesan": str(e)}), 500

@app.route('/hapus-berita/<id>', methods=['DELETE'])
@wajib_login
def hapus_berita(id):
    try:
        # 1. Cari data beritanya dulu untuk mengambil URL foto
        berita = koleksi_berita.find_one({"_id": ObjectId(id)})
        
        # 2. Hapus foto dari Cloudinary secara otomatis jika ada
        if berita and "foto_url" in berita:
            public_id = ekstrak_public_id(berita["foto_url"])
            if public_id:
                cloudinary.uploader.destroy(public_id)

        # 3. Hapus data dari database MongoDB
        hasil = koleksi_berita.delete_one({"_id": ObjectId(id)})
        if hasil.deleted_count > 0:
            return jsonify({"status": "sukses", "pesan": "Data & foto berhasil dihapus!"}), 200
        else:
            return jsonify({"status": "gagal", "pesan": "Data tidak ditemukan."}), 404
    except Exception as e:
        return jsonify({"status": "gagal", "pesan": str(e)}), 500

@app.route('/edit-berita/<id>', methods=['POST'])
@wajib_login
def edit_berita(id):
    try:
        judul = request.form.get('judul')
        kategori = request.form.get('kategori')
        penulis = request.form.get('penulis', 'Tim Redaksi IMM FIKTI') 
        isi = request.form.get('isi')
        foto = request.files.get('foto')
        
        data_update = {
            "judul": judul,
            "kategori": kategori,
            "penulis": penulis, 
            "isi_konten": isi
        }
        
        if foto:
            # Ambil foto lama untuk dihapus dari Cloudinary agar tidak jadi sampah
            berita_lama = koleksi_berita.find_one({"_id": ObjectId(id)})
            if berita_lama and "foto_url" in berita_lama:
                old_public_id = ekstrak_public_id(berita_lama["foto_url"])
                if old_public_id:
                    cloudinary.uploader.destroy(old_public_id)

            # Upload foto baru dengan kompresi otomatis
            hasil_upload = cloudinary.uploader.upload(
                foto,
                folder="imm_fikti",
                quality="auto",  
                format="webp",   
                width=1200,      
                crop="limit" 
            )
            data_update["foto_url"] = hasil_upload.get('secure_url')
            
        koleksi_berita.update_one({"_id": ObjectId(id)}, {"$set": data_update})
        return jsonify({"status": "sukses", "pesan": "Data berhasil diperbarui!"}), 200
        
    except Exception as e:
        return jsonify({"status": "gagal", "pesan": str(e)}), 500

# ==========================================
# 5. API KEPENGURUSAN (CRUD PENGURUS)
# ==========================================
@app.route('/tambah-pengurus', methods=['POST'])
@wajib_login
def tambah_pengurus():
    try:
        nama = request.form.get('nama')
        bidang = request.form.get('bidang')
        jabatan = request.form.get('jabatan')
        periode = request.form.get('periode')
        foto = request.files.get('foto_pengurus')

        if not foto:
            return jsonify({"status": "gagal", "pesan": "Foto pengurus wajib diunggah."}), 400

        hasil_upload = cloudinary.uploader.upload(
            foto,
            folder="imm_fikti",
            quality="auto",  
            format="webp",   
            width=1200,      
            crop="limit"
        )
        
        data_baru = {
            "nama": nama,
            "bidang": bidang,
            "jabatan": jabatan,
            "periode": periode,
            "foto_url": hasil_upload.get('secure_url')
        }
        koleksi_pengurus.insert_one(data_baru)
        return jsonify({"status": "sukses", "pesan": "Data pengurus berhasil ditambahkan!"}), 201

    except Exception as e:
        return jsonify({"status": "gagal", "pesan": str(e)}), 500

@app.route('/ambil-pengurus', methods=['GET'])
def ambil_pengurus():
    try:
        data = list(koleksi_pengurus.find())
        for item in data:
            item["_id"] = str(item["_id"])
            
        # --- PERBAIKAN: LOGIKA PENYORTIRAN HIERARKI ---
        urutan_resmi = [
            "Pimpinan Umum",
            "Bidang Organisasi",
            "Bidang Kadernisasi",
            "Bidang Hikmah",
            "Bidang KPK",
            "Bidang SPM",
            "Bidang Ekowir",
            "Bidang Medkom",
            "Bidang Immawati",
            "Bidang TKK",
            "Bidang OKA"
        ]
        
        # Berikan nomor urut (Pimpinan Umum = 0, Bidang Organisasi = 1, dst)
        urutan_map = {bidang: index for index, bidang in enumerate(urutan_resmi)}
        
        # Urutkan array data berdasarkan nomor urut di atas
        # Jika ada bidang yang typo/tidak ada di daftar, taruh di urutan paling bawah (99)
        data.sort(key=lambda x: urutan_map.get(x.get('bidang'), 99))
        # -----------------------------------------------

        return jsonify({"status": "sukses", "data": data}), 200
    except Exception as e:
        return jsonify({"status": "gagal", "pesan": str(e)}), 500

@app.route('/edit-pengurus/<id>', methods=['POST'])
@wajib_login
def edit_pengurus(id):
    try:
        nama = request.form.get('nama')
        bidang = request.form.get('bidang')
        jabatan = request.form.get('jabatan')
        periode = request.form.get('periode')
        foto = request.files.get('foto_pengurus')

        data_update = {"nama": nama, "bidang": bidang, "jabatan": jabatan, "periode": periode}

        if foto:
            # Hapus foto lama pengurus dari Cloudinary
            pengurus_lama = koleksi_pengurus.find_one({"_id": ObjectId(id)})
            if pengurus_lama and "foto_url" in pengurus_lama:
                old_public_id = ekstrak_public_id(pengurus_lama["foto_url"])
                if old_public_id:
                    cloudinary.uploader.destroy(old_public_id)

            hasil_upload = cloudinary.uploader.upload(
                foto,
                folder="imm_fikti",
                quality="auto",  
                format="webp",   
                width=1200,      
                crop="limit"
            )
            data_update["foto_url"] = hasil_upload.get('secure_url')

        koleksi_pengurus.update_one({"_id": ObjectId(id)}, {"$set": data_update})
        return jsonify({"status": "sukses", "pesan": "Data berhasil diperbarui!"}), 200
    except Exception as e:
        return jsonify({"status": "gagal", "pesan": str(e)}), 500

@app.route('/hapus-pengurus/<id>', methods=['DELETE'])
@wajib_login
def hapus_pengurus(id):
    try:
        # 1. Cari data pengurus untuk mengambil URL foto
        pengurus = koleksi_pengurus.find_one({"_id": ObjectId(id)})
        
        # 2. Hapus foto dari Cloudinary secara otomatis
        if pengurus and "foto_url" in pengurus:
            public_id = ekstrak_public_id(pengurus["foto_url"])
            if public_id:
                cloudinary.uploader.destroy(public_id)

        # 3. Hapus data dari database MongoDB
        hasil = koleksi_pengurus.delete_one({"_id": ObjectId(id)})
        if hasil.deleted_count > 0:
            return jsonify({"status": "sukses", "pesan": "Pengurus & foto berhasil dihapus!"}), 200
        else:
            return jsonify({"status": "gagal", "pesan": "Data tidak ditemukan."}), 404
    except Exception as e:
        return jsonify({"status": "gagal", "pesan": str(e)}), 500

# ==========================================
# 6. API SLIDER BERANDA (CAROUSEL)
# ==========================================
@app.route('/upload-banner', methods=['POST'])
@wajib_login
def upload_banner():
    try:
        foto = request.files.get('foto_banner')
        if not foto:
            return jsonify({"status": "gagal", "pesan": "Foto banner wajib diunggah."}), 400

        banner_lama = koleksi_banner.find_one()
        if banner_lama and "public_id" in banner_lama:
            cloudinary.uploader.destroy(banner_lama["public_id"])

        hasil_upload = cloudinary.uploader.upload(
            foto,
            folder="imm_fikti",
            quality="auto",  
            format="webp",   
            width=1200,      
            crop="limit"
        )
        
        koleksi_banner.delete_many({})
        
        koleksi_banner.insert_one({
            "foto_url": hasil_upload.get('secure_url'),
            "public_id": hasil_upload.get('public_id')
        })
        
        return jsonify({"status": "sukses", "pesan": "Banner utama berhasil diperbarui!"}), 200
    except Exception as e:
        return jsonify({"status": "gagal", "pesan": str(e)}), 500

@app.route('/ambil-slider', methods=['GET'])
def ambil_slider():
    try:
        slider_data = []

        # 1. Sedot Banner Utama
        banner = koleksi_banner.find_one()
        if banner:
            slider_data.append({
                "jenis": "PIMPINAN KOMISARIAT",
                "foto_url": banner["foto_url"],
                "judul": "", 
                "link": "#"
            })

        # 2. Sedot Program Kerja Terbaru (Hanya yang kategorinya mengandung kata "Proker" atau "Program")
        proker_terbaru = list(koleksi_proker.find({"kategori": {"$regex": "Proker|Program", "$options": "i"}}).sort("tanggal_dibuat", -1).limit(1))
        if proker_terbaru:
            slider_data.append({
                "jenis": "PROGRAM KERJA TERBARU",
                "foto_url": proker_terbaru[0]["foto_url"],
                "judul": proker_terbaru[0]["judul"],
                "link": f"/detail/{proker_terbaru[0]['_id']}"
            })

        # 3. Sedot Berita Terbaru (Hanya yang kategorinya mengandung kata "Berita")
        berita_terbaru = list(koleksi_berita.find({"kategori": {"$regex": "Berita", "$options": "i"}}).sort("tanggal_dibuat", -1).limit(1))
        if berita_terbaru:
            slider_data.append({
                "jenis": "BERITA TERBARU",
                "foto_url": berita_terbaru[0]["foto_url"],
                "judul": berita_terbaru[0]["judul"],
                "link": f"/detail/{berita_terbaru[0]['_id']}"
            })

        return jsonify({"status": "sukses", "data": slider_data}), 200
    except Exception as e:
        return jsonify({"status": "gagal", "pesan": str(e)}), 500

# ==========================================
# MENYALAKAN SERVER
# ==========================================
if __name__ == '__main__':
    print("Server Python menyala di port 5000...")
    app.run(debug=False, port=5000)