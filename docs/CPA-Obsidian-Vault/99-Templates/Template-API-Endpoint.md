---
tags: [api, backend, {{date}}]
status: Draft
method: GET
endpoint: /api/
---
# API: {{title}}

## 📍 Deskripsi
(Tuliskan kegunaan utama dari endpoint ini)

## 🔗 Route
`{{method}} {{endpoint}}`

## 📥 Request Parameters
| Parameter | Tipe | Wajib | Keterangan |
| :--- | :--- | :--- | :--- |
| `param_name` | `string` | Ya | - |

## 📤 Response (Success 200 OK)
```json
{
  "status": "success",
  "data": []
}
```

## 🛡️ Autorisasi / RLS (Row-Level Security)
- Role yang diizinkan: (misal: Finance, Sales Rep)
- Batasan data: (misal: Hanya bisa melihat omzet sendiri)

## 🔗 Relasi
- Dipanggil oleh komponen frontend: [[NamaKomponen.tsx]]
- Terhubung ke tabel database: `nama_tabel`
