import React, { useRef, useState, useEffect } from 'react'
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi'
import CarouselCard from '../Cards/CarouselCard'

const HorizontalScrollSection = () => {
    const scrollContainerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    // Mock Data
    const trendingPosts = [
        { id: 1, title: "The new React update looks promising!", community: "reactjs" },
        { id: 2, title: "Best places to travel in the Mediterranean", community: "travel" },
        { id: 3, title: "My first time baking a sourdough bread, tips needed!", community: "baking" },
        { id: 4, title: "Ask me anything about TypeScript!", community: "typescript" },
        { id: 5, title: "Top 5 fantasy books of the decade", community: "books" },
        { id: 6, title: "New trailer drop for the highly anticipated game", community: "gaming" },
        { id: 7, title: "A question on linear algebra concepts", community: "math" },
        { id: 8, title: "A detailed guide to CSS Scroll Snap", community: "webdev" },
    ];

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
            {/* Left Arrow Button */}
            {canScrollLeft && (
                <button
                    onClick={scrollLeft}
                    className="absolute left-8 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black border border-gray-700 rounded-full p-2 text-white transition-all duration-200 shadow-lg"
                    aria-label="Scroll left"
                >
                    <HiOutlineChevronLeft className='cursor-pointer' size={24} />
                </button>
            )}

            {/* The core scrolling wrapper - scrollbar hidden */}
            <div 
                ref={scrollContainerRef}
                className="flex overflow-x-scroll pb-6 space-x-4 scrollbar-hide w-full max-w-full"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {/*
          Inner Card Container:
          - flex: Uses Flexbox to line items up horizontally.
          - space-x-4: Adds horizontal spacing between cards.
        */}
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

            {/* Right Arrow Button */}
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