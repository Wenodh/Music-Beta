// Import createApi and fetchBaseQuery
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { album, songs, playlistSearch, searchArtist } from '../../constants';

// Define the API slice
export const apiSlice = createApi({
  reducerPath: 'api', // Choose a reducerPath
  baseQuery: fetchBaseQuery({ baseUrl: '/' }), // Base URL can be minimal as constants provide full URLs
  endpoints: (builder) => ({
    getDetails: builder.query({
      query: (apiUrl) => ({ url: apiUrl }), // Query needs to return an object with url property
      transformResponse: (res) => {
        return res.data
      }, // Transform the response
    }),
    getHomeAlbums: builder.query({
      query: ({ language, page = 0, limit = 10 }) => ({ // Default values for page and limit
        url: `${album}?query=${language}&page=${page}&limit=${limit}`,
      }),
      transformResponse: (res) => {
        return res.data.results
      },
    }),
    getHomeTrendingSongs: builder.query({
      query: ({ language, page = 0, limit = 25 }) => ({ // Default values for page and limit
        url: `${songs}?query=${language}&page=${page}&limit=${limit}`,
      }),
      transformResponse: (res) => {
        return res.data?.results
      },
    }),
    getHomeTopPlaylists: builder.query({
      query: (language) => ({
        url: `${playlistSearch}${language}`,
      }),
      transformResponse: (res) => res.data?.data?.results,
    }),
    getHomeArtists: builder.query({
      query: (language) => ({
        url: `${searchArtist}${language} singer`,
      }),
      transformResponse: (res) => res?.data?.results,
    }),
  }),
});

// Export the auto-generated hooks
export const {
  useGetDetailsQuery,
  useGetHomeAlbumsQuery,
  useGetHomeTrendingSongsQuery,
  useGetHomeTopPlaylistsQuery,
  useGetHomeArtistsQuery,
} = apiSlice;

// Export the API slice itself
export default apiSlice;
