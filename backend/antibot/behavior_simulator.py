"""
Behavior Simulator - Human-like interaction patterns.

Provides realistic human behavior simulation:
- Mouse movement with Bezier curves
- Natural scrolling patterns
- Variable typing speeds
- Random delays and idle times
- Click timing variation
- Tab switching simulation
- Window focus/blur events

This service makes bot behavior indistinguishable from real users
by simulating natural human interaction patterns.
"""

import asyncio
import random
import logging
from typing import List, Tuple, Optional
from playwright.async_api import Page

logger = logging.getLogger(__name__)


class BehaviorSimulator:
    """
    Comprehensive human behavior simulation service.
    
    Simulates natural human interactions to evade behavioral analysis
    systems used by anti-bot protection.
    """
    
    def __init__(self):
        self.patterns = {
            'scroll': ['smooth', 'stepwise', 'reading'],
            'mouse': ['linear', 'curved', 'random'],
            'typing': ['slow', 'normal', 'fast']
        }
    
    def get_available_patterns(self) -> List[str]:
        """Get list of available behavior patterns."""
        return [f"{k}_{v}" for k, patterns in self.patterns.items() for v in patterns]
    
    async def random_delay(self, min_delay: float = 0.5, max_delay: float = 3.0) -> None:
        """
        Add a random delay to simulate human thinking time.
        
        Args:
            min_delay: Minimum delay in seconds
            max_delay: Maximum delay in seconds
        """
        delay = random.uniform(min_delay, max_delay)
        await asyncio.sleep(delay)
        logger.debug(f"⏱️ Random delay: {delay:.2f}s")
    
    async def simulate_mouse_movement(self, page: Page, 
                                     start: Optional[Tuple[int, int]] = None,
                                     end: Optional[Tuple[int, int]] = None,
                                     steps: int = 20) -> None:
        """
        Simulate realistic mouse movement using Bezier curves.
        
        Args:
            page: Playwright page
            start: Starting position (x, y), random if None
            end: Ending position (x, y), random if None
            steps: Number of steps for smooth movement
        """
        viewport = await page.viewport_size()
        
        if not start:
            start = (random.randint(100, viewport['width'] - 100),
                    random.randint(100, viewport['height'] - 100))
        
        if not end:
            end = (random.randint(100, viewport['width'] - 100),
                  random.randint(100, viewport['height'] - 100))
        
        # Generate control points for Bezier curve
        control1 = (
            (start[0] + end[0]) // 2 + random.randint(-100, 100),
            (start[1] + end[1]) // 2 + random.randint(-100, 100)
        )
        control2 = (
            (start[0] + end[0]) // 2 + random.randint(-100, 100),
            (start[1] + end[1]) // 2 + random.randint(-100, 100)
        )
        
        # Move mouse along Bezier curve
        for i in range(steps + 1):
            t = i / steps
            
            # Cubic Bezier formula
            x = (1 - t)**3 * start[0] + \
                3 * (1 - t)**2 * t * control1[0] + \
                3 * (1 - t) * t**2 * control2[0] + \
                t**3 * end[0]
            
            y = (1 - t)**3 * start[1] + \
                3 * (1 - t)**2 * t * control1[1] + \
                3 * (1 - t) * t**2 * control2[1] + \
                t**3 * end[1]
            
            await page.mouse.move(int(x), int(y))
            await asyncio.sleep(random.uniform(0.01, 0.03))
        
        logger.debug(f"🖱️ Mouse movement: {start} → {end}")
    
    async def random_scroll(self, page: Page, 
                           scroll_count: int = 3,
                           pattern: str = 'reading') -> None:
        """
        Simulate human-like scrolling behavior.
        
        Args:
            page: Playwright page
            scroll_count: Number of scroll actions
            pattern: Scroll pattern ('smooth', 'stepwise', 'reading')
        """
        if pattern == 'smooth':
            # Smooth continuous scrolling
            for _ in range(scroll_count):
                scroll_amount = random.randint(300, 800)
                await page.evaluate(f"window.scrollBy({{top: {scroll_amount}, behavior: 'smooth'}})")
                await asyncio.sleep(random.uniform(1.0, 2.5))
        
        elif pattern == 'stepwise':
            # Step-by-step scrolling with pauses
            for _ in range(scroll_count):
                scroll_amount = random.randint(150, 400)
                await page.evaluate(f"window.scrollBy({{top: {scroll_amount}, behavior: 'auto'}})")
                await asyncio.sleep(random.uniform(0.5, 1.5))
        
        else:  # 'reading' pattern
            # Reading pattern: scroll, pause, scroll back, scroll forward
            for _ in range(scroll_count):
                # Scroll down
                scroll_down = random.randint(400, 1000)
                await page.evaluate(f"window.scrollBy({{top: {scroll_down}, behavior: 'smooth'}})")
                await asyncio.sleep(random.uniform(2.0, 4.0))  # Reading time
                
                # Sometimes scroll back a bit (re-reading)
                if random.random() < 0.3:
                    scroll_up = random.randint(100, 300)
                    await page.evaluate(f"window.scrollBy({{top: -{scroll_up}, behavior: 'smooth'}})")
                    await asyncio.sleep(random.uniform(1.0, 2.0))
        
        logger.debug(f"📜 Scrolled {scroll_count} times with '{pattern}' pattern")
    
    async def simulate_typing(self, page: Page, 
                             text: str,
                             selector: str,
                             speed: str = 'normal') -> None:
        """
        Simulate human-like typing with variable speed.
        
        Args:
            page: Playwright page
            text: Text to type
            selector: Input field selector
            speed: Typing speed ('slow', 'normal', 'fast')
        """
        # Define typing speeds (delay between keystrokes in ms)
        speeds = {
            'slow': (80, 200),    # 80-200ms between keys
            'normal': (40, 120),  # 40-120ms between keys
            'fast': (20, 80)      # 20-80ms between keys
        }
        
        min_delay, max_delay = speeds.get(speed, speeds['normal'])
        
        # Click on the input field first
        await page.click(selector)
        await asyncio.sleep(random.uniform(0.1, 0.3))
        
        # Type each character with variable delay
        for char in text:
            await page.keyboard.type(char)
            
            # Add variable delay
            delay = random.uniform(min_delay, max_delay) / 1000
            await asyncio.sleep(delay)
            
            # Occasionally pause (thinking)
            if random.random() < 0.1:
                await asyncio.sleep(random.uniform(0.3, 0.8))
        
        logger.debug(f"⌨️ Typed '{text[:20]}...' at '{speed}' speed")
    
    async def simulate_reading(self, page: Page, duration: float = 5.0) -> None:
        """
        Simulate reading behavior with idle time and micro-scrolls.
        
        Args:
            page: Playwright page
            duration: Reading duration in seconds
        """
        end_time = asyncio.get_event_loop().time() + duration
        
        while asyncio.get_event_loop().time() < end_time:
            # Random micro-scroll (as if following text)
            if random.random() < 0.3:
                micro_scroll = random.randint(20, 100)
                await page.evaluate(f"window.scrollBy({{top: {micro_scroll}, behavior: 'smooth'}})")
            
            # Small random pause
            await asyncio.sleep(random.uniform(0.5, 2.0))
        
        logger.debug(f"📖 Simulated reading for {duration}s")
    
    async def simulate_click_with_movement(self, page: Page, 
                                          selector: str,
                                          human_like: bool = True) -> None:
        """
        Simulate a click with natural mouse movement.
        
        Args:
            page: Playwright page
            selector: Element selector to click
            human_like: Whether to add human-like delays and movements
        """
        if human_like:
            # Get element bounding box
            element = await page.query_selector(selector)
            if not element:
                logger.warning(f"Element '{selector}' not found for click simulation")
                return
            
            bbox = await element.bounding_box()
            if bbox:
                # Calculate click position (slightly randomized within element)
                click_x = bbox['x'] + bbox['width'] / 2 + random.uniform(-10, 10)
                click_y = bbox['y'] + bbox['height'] / 2 + random.uniform(-5, 5)
                
                # Move mouse to element
                await self.simulate_mouse_movement(
                    page,
                    end=(int(click_x), int(click_y))
                )
                
                # Small pause before click
                await asyncio.sleep(random.uniform(0.1, 0.3))
        
        # Perform the click
        await page.click(selector)
        
        # Small pause after click
        if human_like:
            await asyncio.sleep(random.uniform(0.2, 0.5))
        
        logger.debug(f"🖱️ Clicked '{selector}' with movement")
    
    async def simulate_form_interaction(self, page: Page,
                                       form_data: dict,
                                       submit_selector: Optional[str] = None) -> None:
        """
        Simulate realistic form filling behavior.
        
        Args:
            page: Playwright page
            form_data: Dictionary of {selector: value} pairs
            submit_selector: Optional submit button selector
        """
        for selector, value in form_data.items():
            # Move to field
            await self.simulate_click_with_movement(page, selector)
            
            # Type the value
            await self.simulate_typing(page, str(value), selector, 
                                      speed=random.choice(['normal', 'fast']))
            
            # Random pause between fields
            await self.random_delay(0.5, 2.0)
        
        # Submit if selector provided
        if submit_selector:
            await self.random_delay(1.0, 2.0)  # Think before submitting
            await self.simulate_click_with_movement(page, submit_selector)
        
        logger.debug(f"📝 Filled form with {len(form_data)} fields")
    
    async def simulate_idle_time(self, min_seconds: float = 2.0, 
                                max_seconds: float = 5.0) -> None:
        """
        Simulate user idle time.
        
        Args:
            min_seconds: Minimum idle time
            max_seconds: Maximum idle time
        """
        idle_time = random.uniform(min_seconds, max_seconds)
        await asyncio.sleep(idle_time)
        logger.debug(f"💤 Idle time: {idle_time:.2f}s")
    
    async def simulate_tab_switching(self, page: Page) -> None:
        """
        Simulate tab switching behavior by triggering blur/focus events.
        
        Args:
            page: Playwright page
        """
        # Trigger blur event (tab loses focus)
        await page.evaluate("window.dispatchEvent(new Event('blur'))")
        await asyncio.sleep(random.uniform(2.0, 5.0))
        
        # Trigger focus event (tab regains focus)
        await page.evaluate("window.dispatchEvent(new Event('focus'))")
        
        logger.debug("🔄 Simulated tab switching")
    
    async def simulate_natural_browsing(self, page: Page) -> None:
        """
        Simulate a complete natural browsing session.
        
        Combines multiple behaviors for realistic interaction.
        
        Args:
            page: Playwright page
        """
        # Initial page load delay (user looking at page)
        await self.random_delay(1.0, 3.0)
        
        # Scroll and read
        await self.random_scroll(page, scroll_count=2, pattern='reading')
        
        # More reading
        await self.simulate_reading(page, duration=random.uniform(3.0, 6.0))
        
        # Random mouse movement
        if random.random() < 0.5:
            await self.simulate_mouse_movement(page)
        
        # Final scroll
        await self.random_scroll(page, scroll_count=1, pattern='smooth')
        
        logger.debug("🎭 Completed natural browsing simulation")
