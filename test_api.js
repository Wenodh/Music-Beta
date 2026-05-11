import axios from 'axios';
const BASE_URL = 'https://jiosaavn-api-cyan-theta.vercel.app/api';
async function test() {
  try {
    const albumSearch = await axios.get(`${BASE_URL}/search/albums?query=Rahman&limit=1`);
    const realAlbumId = albumSearch.data.data.results[0].id;
    const res2 = await axios.get(`${BASE_URL}/albums?id=${realAlbumId}`);
    console.log('Album data keys:', Object.keys(res2.data.data));
    console.log('Album artists:', JSON.stringify(res2.data.data.artists, null, 2));
  } catch (e) {
    console.error(e.message);
  }
}
test();
