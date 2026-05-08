export const shareContent = async (title: string, text: string, url: string) => {
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return { success: true, method: 'share' };
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
      return { success: false, error };
    }
  } else {
    try {
      await navigator.clipboard.writeText(url);
      return { success: true, method: 'clipboard' };
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      return { success: false, error };
    }
  }
};

export const getBaseUrl = () => {
  return window.location.origin;
};

export const getSongUrl = (id: string) => `${getBaseUrl()}/song/${id}`;
export const getAlbumUrl = (id: string) => `${getBaseUrl()}/albums/${id}`;
export const getArtistUrl = (id: string) => `${getBaseUrl()}/artists/${id}`;
export const getPlaylistUrl = (id: string) => `${getBaseUrl()}/playlists/${id}`;
