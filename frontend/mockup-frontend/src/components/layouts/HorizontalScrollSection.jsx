import React, { useRef, useState, useEffect } from 'react'
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi'
import CarouselCard from '../Cards/CarouselCard'

const HorizontalScrollSection = () => {
    const scrollContainerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScrollability = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
        }
    };

    useEffect(() => {
        checkScrollability();
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScrollability);
            window.addEventListener('resize', checkScrollability);
            return () => {
                container.removeEventListener('scroll', checkScrollability);
                window.removeEventListener('resize', checkScrollability);
            };
        }
    }, []);

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
        }
    };

    return (
        <div className="bg-transparent p-6 w-full max-w-full relative">
            {canScrollLeft && (
                <button
                    onClick={scrollLeft}
                    className="absolute left-8 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black border border-gray-700 rounded-full p-2 text-white transition-all duration-200 shadow-lg"
                    aria-label="Scroll left"
                >
                    <HiOutlineChevronLeft className='cursor-pointer' size={24} />
                </button>
            )}

            <div 
                ref={scrollContainerRef}
                className="flex overflow-x-scroll pb-6 space-x-4 scrollbar-hide w-full max-w-full"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <div className="flex space-x-4">
                    {trendingPosts.map(post => (
                        <CarouselCard
                            key={post.id}
                            title={post.title}
                            community={post.community}
                        />
                    ))}
                </div>
            </div>

            {canScrollRight && (
                <button
                    onClick={scrollRight}
                    className="absolute right-8 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black border border-gray-700 rounded-full p-2 text-white transition-all duration-200 shadow-lg"
                    aria-label="Scroll right"
                >
                    <HiOutlineChevronRight className='cursor-pointer' size={24} />
                </button>
            )}
        </div>
    );
}

export default HorizontalScrollSection