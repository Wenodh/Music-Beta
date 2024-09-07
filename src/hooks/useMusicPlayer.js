import { useState, useCallback } from 'react';

const useMusicPlayer = (initialSongs) => {
    const [songs, setSongs] = useState(initialSongs);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSong, setCurrentSong] = useState(null);

    const playMusic = useCallback(
        async (music, name, duration, image, id, primaryArtists, albumId) => {
            if (currentSong && currentSong.id === id) {
                if (isPlaying) {
                    setIsPlaying(false);
                    currentSong.audio.pause();
                } else {
                    setIsPlaying(true);
                    await currentSong.audio.play();
                }
            } else {
                if (currentSong) {
                    currentSong.audio.pause();
                    setIsPlaying(false);
                }
                const newAudio = new Audio(music[music.length - 1].url);
                setCurrentSong({
                    name,
                    duration,
                    image: image[2].url,
                    id,
                    audio: newAudio,
                    primaryArtists,
                    albumId,
                });
                setIsPlaying(true);
                await newAudio.play();
            }
        },
        [currentSong, isPlaying]
    );

    const nextSong = useCallback(() => {
        if (currentSong) {
            const index = songs.findIndex((song) => song.id === currentSong.id);
            const nextIndex = (index + 1) % songs.length;
            const nextSong = songs[nextIndex];
            playMusic(
                nextSong.downloadUrl,
                nextSong.name,
                nextSong.duration,
                nextSong.image,
                nextSong.id,
                nextSong.primaryArtists,
                nextSong?.album?.id
            );
        }
    }, [currentSong, songs, playMusic]);

    const prevSong = useCallback(() => {
        if (currentSong) {
            const index = songs.findIndex((song) => song.id === currentSong.id);
            const prevIndex = (index - 1 + songs.length) % songs.length;
            const prevSong = songs[prevIndex];
            playMusic(
                prevSong.downloadUrl,
                prevSong.name,
                prevSong.duration,
                prevSong.image,
                prevSong.id,
                prevSong.primaryArtists,
                prevSong?.album?.id
            );
        }
    }, [currentSong, songs, playMusic]);

    return {
        songs,
        setSongs,
        playMusic,
        isPlaying,
        currentSong,
        nextSong,
        prevSong,
    };
};

export default useMusicPlayer;
