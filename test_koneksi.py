from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

# Ganti dengan connection string milikmu dari Notepad
MONGO_URI = "mongodb+srv://dapur-immfiktiumsu5650:immfiktiumsu5650@cluster-imm-fikti.cq7giwc.mongodb.net/?appName=Cluster-IMM-FIKTI"

try:
    # Membangun koneksi ke database
    client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
    
    # Mengirimkan perintah 'ping' untuk mengecek sambungan
    client.admin.command('ping')
    print(" MANTAP! Laptopmu sudah berhasil terhubung ke database MongoDB Atlas!")
    
    # Menyiapkan kerangka database dan koleksi (tabel) untuk IMM FIKTI
    db = client['imm_fikti_db']
    koleksi_berita = db['berita_proker']
    
    print(" Database 'imm_fikti_db' siap digunakan!")

except Exception as e:
    print(" Gagal terhubung. Coba cek lagi password atau koneksi internetmu.")
    print("Detail Error:", e)