// api/upload-leech.js
import formidable from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

export const config = {
    api: {
        bodyParser: false, // Wajib false agar serverless bisa membaca file binary multipart
    },
};

export default async function handler(req, res) {
    // Set Header CORS biar front-end lu gak mogok saat manggil api ini
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const form = formidable({ multiples: false });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Gagal membaca file di server backend.' });
        }

        const fileData = files.file;
        if (!fileData) {
            return res.status(400).json({ success: false, error: 'Tidak ada file yang dipilih.' });
        }

        try {
            // Bungkus filebinary mentah menggunakan FormData Node.js asli sesuai gambar docs lu
            const formPayload = new FormData();
            formPayload.append('file', fs.createReadStream(fileData.filepath), {
                filename: fileData.originalFilename,
                contentType: fileData.mimetype
            });

            // Tembak langsung dari server Vercel ke Stenly API (Aman dari cekkal CORS Browser!)
            const targetResponse = await fetch('https://stenly.org/api/uploader/top4top', {
                method: 'POST',
                headers: formPayload.getHeaders(),
                body: formPayload
            });

            const rawResult = await targetResponse.json();

            if (rawResult.Status === true && rawResult.Result_url) {
                // Kirim response JSON bersih dan valid kembali ke halaman index.html utama
                return res.status(200).json({ success: true, Result_url: rawResult.Result_url });
            } else {
                return res.status(400).json({ success: false, error: rawResult.message || 'Gagal dapet url dari Stenly.' });
            }

        } catch (postErr) {
            return res.status(500).json({ success: false, error: 'Koneksi backend ke Stenly API terputus atau limit file terlampaui.' });
        }
    });
}
