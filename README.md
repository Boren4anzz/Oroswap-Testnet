### 🌾 Zigchain Auto-Farming Bot

Bot otomatis untuk melakukan **swap dan penambahan likuiditas (liquidity providing)** di jaringan **Zigchain Testnet** melalui kontrak `Oroswap Router`.

---

## 🚀 Fitur

- 🔁 Loop siklus otomatis: Swap → Simulasi → Add Liquidity
- 🔎 Simulasi jumlah token ORO sebelum LP
- 📉 Toleransi slippage pada swap dan LP
- ⏱ Delay antar proses & antar siklus
- 🛠 Penanganan error dan balance check
- 🧠 Menampilkan hasil transaksi & explorer link

---

## ⚙️ Konfigurasi Default

| Parameter           | Nilai                                      |
| ------------------- | ------------------------------------------ |
| RPC Endpoint        | `https://testnet-rpc.zigchain.com`         |
| Router Contract     | `zig15jqg...`                              |
| Token ZIG Denom     | `uzig`                                     |
| Token ORO Denom     | `coin.zig10r...uoro`                       |
| Swap Amount (ZIG)   | `0.25` ZIG                                 |
| LP ZIG Amount       | `0.15` ZIG                                 |
| Delay Antar Langkah | `15 detik`                                 |
| Delay Antar Siklus  | `45 detik`                                 |
| Retry Jika Error    | `60 detik` (atau 12 jam jika saldo kurang) |

---

## 📦 Cara Menggunakan

### 1. **Instalasi Dependensi**

```bash
npm install
```

### 2. **Tambahkan Mnemonic**

Buat file `mnemonic.txt` dan isi dengan 12/24 kata mnemonic dari wallet Zigchain Anda:

```txt
example mnemonic words here example mnemonic words here
```

### 3. **Jalankan Bot**

```bash
node index.js
```

---

## 📁 Struktur File

| File/Fungsi    | Deskripsi                                           |
| -------------- | --------------------------------------------------- |
| `index.js`     | File utama script bot                               |
| `mnemonic.txt` | File berisi private mnemonic Zig wallet             |
| `package.json` | Dependencies: `@cosmjs/*`, `fs`, `http`, `readline` |

---

## ⚠️ Peringatan

- **Hanya untuk digunakan di TESTNET Zigchain.** Jangan gunakan mnemonic real/mainnet.
- Mnemonic disimpan sebagai **plaintext** di `mnemonic.txt`. Jangan gunakan akun utama.
- Gunakan dengan bijak, pantau hasil dan validasi saldo secara berkala.

---

## ✅ Tips Penggunaan

- Pastikan saldo cukup untuk swap & LP (minimal \~0.4 ZIG dan ORO).
- Periksa hasil swap dan LP di [Zigchain Explorer](https://explorer.testnet.zigchain.com).
- Jangan jalankan multiple instance bersamaan di wallet sama.

---
