import { useState, useEffect } from 'react';

export function useMasonryColumns() {
    const [columns, setColumns] = useState(3);

    useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth;
            if (width >= 1536) setColumns(8);      // 2xl
            else if (width >= 1280) setColumns(6); // xl
            else if (width >= 1024) setColumns(5); // lg
            else if (width >= 768) setColumns(4);  // md
            else setColumns(3);                    // sm & mobile
        };

        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, []);

    return columns;
}
