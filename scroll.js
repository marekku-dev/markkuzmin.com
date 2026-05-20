let ticking = false;
let lastScrollY = window.scrollY;

function updateItemsOnScroll() {
    const scrollY = window.scrollY;
    const viewport = window.innerHeight;
    const viewportCenter = viewport / 2 + scrollY;
    const links = document.querySelectorAll('.portfolio a');
    
    // Only process visible items for better performance
    links.forEach((link, index) => {
        const rect = link.getBoundingClientRect();
        
        // Skip items that are far off screen
        if (rect.bottom < -200 || rect.top > viewport + 200) {
            return;
        }
        
        const itemTop = rect.top + scrollY;
        const itemCenter = itemTop + rect.height / 2;
        const distanceFromCenter = Math.abs(itemCenter - viewportCenter);
        const maxDistance = viewport;
        const normalizedDistance = Math.min(distanceFromCenter / maxDistance, 1);
        
        // Calculate scale and opacity using smooth functions
        let scale = 1.2 - (normalizedDistance * 2); // 1.2 to 0.7
        scale = Math.max(0.7, Math.min(1.2, scale));
        
        let opacity = 1 - (normalizedDistance * 2); // 1 to 0.3
        opacity = Math.max(0.1, Math.min(1, opacity));
        
        // Calculate spacing multiplier based on scale
        const spacingMultiplier = Math.max(1, scale);
        const translateY = (spacingMultiplier - 1) * 15; // Adjust spacing amount
        
        // Apply transforms directly for better performance - combine scale and translate
        link.style.transform = `scale(${scale}) translateY(${translateY}px)`;
        link.style.opacity = opacity;
    });
    
    ticking = false;
}

function requestTick() {
    if (!ticking) {
        requestAnimationFrame(updateItemsOnScroll);
        ticking = true;
    }
}

// Throttle scroll events more aggressively
let scrollTimeout;
function handleScroll() {
    // Clear existing timeout
    clearTimeout(scrollTimeout);
    
    // Only update if scroll direction changed or significant movement
    const currentScrollY = window.scrollY;
    const scrollDelta = Math.abs(currentScrollY - lastScrollY);
    
    if (scrollDelta > 5) { // Only update for meaningful scroll
        requestTick();
        lastScrollY = currentScrollY;
    }
    
    // Fallback update after scroll stops
    scrollTimeout = setTimeout(requestTick, 16);
}

// Initialize on load
window.addEventListener('load', updateItemsOnScroll);

// Optimized scroll handling
window.addEventListener('scroll', handleScroll, { passive: true });

// Simpler resize handler
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateItemsOnScroll, 100);
});