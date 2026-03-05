import random
import string
import base64
import io
import time
import logging
import uuid
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorCollection

logger = logging.getLogger(__name__)

class CaptchaService:
    def __init__(self, db_collection: AsyncIOMotorCollection):
        self.collection = db_collection
        self.width = 180
        self.height = 60
        self.font_size = 36
        
    async def ensure_indexes(self):
        """Create TTL index for automatic expiration."""
        try:
            # TTL Index: expire after 0 seconds when expires_at reached
            await self.collection.create_index("expires_at", expireAfterSeconds=0)
            logger.info("✅ Captcha TTL index ensured")
        except Exception as e:
            logger.error(f"Failed to create Captcha indexes: {e}")
        
    def _generate_text(self, length=6):
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

    def _generate_image(self, text):
        # Create image with light background
        image = Image.new('RGB', (self.width, self.height), color=(243, 244, 246))
        draw = ImageDraw.Draw(image)
        
        # Try to load a font, fallback to default
        try:
            # Common paths for fonts on macOS/Linux
            font_paths = [
                "/System/Library/Fonts/Supplemental/Arial.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "Arial.ttf"
            ]
            font = None
            for path in font_paths:
                try:
                    font = ImageFont.truetype(path, self.font_size)
                    break
                except:
                    continue
            if not font:
                font = ImageFont.load_default()
        except:
            font = ImageFont.load_default()

        # Add some noise (lines)
        for _ in range(8):
            x1 = random.randint(0, self.width)
            y1 = random.randint(0, self.height)
            x2 = random.randint(0, self.width)
            y2 = random.randint(0, self.height)
            draw.line((x1, y1, x2, y2), fill=(209, 213, 219), width=2)

        # Draw text with random distortion
        total_text_width = len(text) * (self.font_size * 0.7)
        start_x = (self.width - total_text_width) / 2
        
        for i, char in enumerate(text):
            # Each character is slightly rotated and shifted
            char_image = Image.new('RGBA', (self.font_size, self.font_size + 10), (255, 255, 255, 0))
            char_draw = ImageDraw.Draw(char_image)
            
            # Random color for each character (dark shades)
            color = (random.randint(31, 100), random.randint(31, 100), random.randint(31, 100))
            char_draw.text((0, 0), char, font=font, fill=color)
            
            # Rotate
            char_image = char_image.rotate(random.randint(-30, 30), expand=1)
            
            # Paste onto main image
            image.paste(char_image, (int(start_x + i * (self.font_size * 0.75)), random.randint(5, 15)), char_image)

        # Add random dots noise
        for _ in range(100):
            xy = (random.randrange(0, self.width), random.randrange(0, self.height))
            draw.point(xy, fill=(156, 163, 175))

        # Apply slight blur/distortion
        image = image.filter(ImageFilter.SMOOTH)
        
        # Save to buffer
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode('utf-8')

    async def create_captcha(self):
        captcha_id = str(uuid.uuid4())
        solution = self._generate_text()
        image_b64 = self._generate_image(solution)
        
        # Store in DB with expiration (5 mins)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        await self.collection.insert_one({
            "captcha_id": captcha_id,
            "solution": solution,
            "expires_at": expires_at,
            "used": False
        })
        
        return {
            "captcha_id": captcha_id,
            "image": image_b64
        }

    async def verify_captcha(self, captcha_id: str, answer: str) -> bool:
        if not captcha_id or not answer:
            return False
            
        captcha = await self.collection.find_one({
            "captcha_id": captcha_id,
            "expires_at": {"$gt": datetime.now(timezone.utc)},
            "used": False
        })
        
        if not captcha:
            return False
            
        # Mark as used immediately to prevent replay attacks
        await self.collection.update_one(
            {"captcha_id": captcha_id},
            {"$set": {"used": True}}
        )
        
        # Case-insensitive comparison
        return captcha["solution"].upper() == answer.strip().upper()

    async def cleanup_expired(self):
        """Cleanup task to remove old sessions from DB."""
        await self.collection.delete_many({"expires_at": {"$lt": datetime.now(timezone.utc)}})
