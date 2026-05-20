import express from 'express';
import axios from 'axios';
import FormData from 'form-data';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

async function uploadToTop4Top(buffer, originalFilename) {
  const form = new FormData();
  const cleanFilename = (originalFilename || 'audio.mp3').replace(/(\.mp3)?$/i, '.mp3');
  
  form.append('file_0_', buffer, { filename: cleanFilename });
  form.append('submitr', '[ رفع الملفات ]');

  const { data } = await axios.post('https://top4top.io/index.php', form, {
    headers: {
      ...form.getHeaders(),
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
      'Origin': 'https://top4top.io',
      'Referer': 'https://top4top.io/index.php'
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity
  });

  return data.match(/value="(https?:\/\/[^"]+)"/i)?.[1]?.replace(/^https:/, 'http:') || '-';
}

// Endpoint Utama Serverless
app.post('/api/upload-leech', async (req, res) => {
  try {
    const { link } = req.body;
    if (!link) return res.status(400).json({ error: 'URL link harus diisi!' });

    let audioBuffer;
    let filename = `pcrp_${Date.now()}.mp3`;

    if (link.includes('youtube.com') || link.includes('youtu.be')) {
      const ytApiUrl = `https://api.anyas.biz.id/api/downloader/youtube-mp3?url=${encodeURIComponent(link)}`;
      const apiRes = await axios.get(ytApiUrl);
      const directAudioUrl = apiRes.data?.result?.download?.url || apiRes.data?.url;
      if (!directAudioUrl) throw new Error('API gagal mengonversi video YouTube ini.');

      const audioDownload = await axios.get(directAudioUrl, { responseType: 'arraybuffer' });
      audioBuffer = audioDownload.data;
      filename = `${apiRes.data?.result?.title || 'yt_audio'}.mp3`;
    } 
    else if (link.includes('tiktok.com')) {
      const tikwmRes = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(link)}`);
      const directAudioUrl = tikwmRes.data?.data?.music_info?.play || tikwmRes.data?.data?.music;
      if (!directAudioUrl) throw new Error('Gagal mengambil audio dari TikTok.');
      
      const audioDownload = await axios.get(directAudioUrl, { responseType: 'arraybuffer' });
      audioBuffer = audioDownload.data;
      filename = `${tikwmRes.data?.data?.music_info?.title || 'tiktok_audio'}.mp3`;
    } 
    else {
      const audioDownload = await axios.get(link, { responseType: 'arraybuffer' });
      const contentType = audioDownload.headers['content-type'] || '';
      if (contentType.includes('text/html')) {
        throw new Error('Link bukan file musik asli, melainkan halaman web.');
      }
      audioBuffer = audioDownload.data;
      filename = link.split('/').pop() || 'audio.mp3';
    }

    const top4topLink = await uploadToTop4Top(audioBuffer, filename);
    if (top4topLink === '-') throw new Error('Top4Top menolak file.');

    return res.json({ success: true, result: top4topLink });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// WAJIB DI-EXPORT UNTUK VERCEL SERVERLESS
export default app;
