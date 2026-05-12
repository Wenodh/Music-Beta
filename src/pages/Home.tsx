import MainSection from '../components/MainSection';
import { Helmet } from 'react-helmet-async';

const Home: React.FC = () => {
    return (
        <>
            <Helmet>
                <title>VibeOn - Modern Music Streaming</title>
                <meta name="description" content="VibeOn is a modern music streaming app with a stunning Glassmorphism UI. Stream your favorite songs, albums, and playlists for free." />
            </Helmet>
            <MainSection />
        </>
    );
};

export default Home;
