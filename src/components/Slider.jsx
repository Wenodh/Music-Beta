import {
    MdOutlineKeyboardArrowRight,
    MdOutlineKeyboardArrowLeft,
} from 'react-icons/md';
import AlbumItem from './AlbumItem';
import { useRef, useCallback } from 'react';

const Slider = ({ data, scrollAmount = 800 }) => {
    const scrollRef = useRef(null);

    const scroll = useCallback(
        (direction) => {
            if (scrollRef.current) {
                scrollRef.current.scrollLeft += direction * scrollAmount;
            }
        },
        [scrollAmount]
    );

    return (
        <div className="flex justify-center items-center gap-2 px-2">
            <MdOutlineKeyboardArrowLeft
                className="text-3xl text-gray-600 hover:scale-125 transition-all duration-500 ease-in-out cursor-pointer hidden lg:block"
                onClick={() => scroll(-1)}
                aria-label="Scroll Left"
            />

            <div
                className="grid grid-rows-1 md:grid-rows-2 grid-flow-col-dense justify-between items-center gap-4 overflow-x-scroll w-full lg:w-[78vw] px-5 scroll-hide p-2"
                ref={scrollRef}
            >
                {data?.map((album) => (
                    <AlbumItem key={album.id} {...album} />
                ))}
            </div>

            <MdOutlineKeyboardArrowRight
                className="text-3xl text-gray-600 hover:scale-125 transition-all duration-500 ease-in-out cursor-pointer hidden lg:block"
                onClick={() => scroll(1)}
                aria-label="Scroll Right"
            />
        </div>
    );
};

export default Slider;
