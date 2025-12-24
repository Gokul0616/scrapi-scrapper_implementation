"""Random username generator following adjective-noun-number pattern."""
import random

# Curated lists of adjectives and nouns
ADJECTIVES = [
    "happy", "swift", "brave", "clever", "bright", "calm", "eager", "gentle",
    "jolly", "kind", "lively", "merry", "noble", "polite", "quick", "witty",
    "cosmic", "digital", "electric", "golden", "silver", "crystal", "mystic",
    "silent", "mighty", "smart", "wild", "cool", "epic", "super", "mega",
    "ultra", "royal", "divine", "zen", "alpha", "beta", "prime", "ace",
    "agile", "bold", "daring", "fancy", "nimble", "vivid", "sharp", "wise",
    "great", "grand", "radiant", "stellar", "lunar", "solar", "neon", "turbo",
    "quantum", "stellar", "nebula", "astro", "cyber", "techno", "pixel",
    "retro", "vintage", "modern", "future", "ancient", "legendary", "mythic",
    "shadow", "storm", "frost", "flame", "thunder", "lightning", "ocean",
    "forest", "mountain", "river", "desert", "arctic", "tropical", "cosmic"
]

NOUNS = [
    "fox", "panda", "eagle", "wolf", "tiger", "lion", "bear", "hawk",
    "falcon", "raven", "phoenix", "dragon", "unicorn", "griffin", "pegasus",
    "leopard", "cheetah", "jaguar", "lynx", "otter", "badger", "raccoon",
    "squirrel", "rabbit", "deer", "moose", "buffalo", "rhino", "elephant",
    "giraffe", "zebra", "koala", "kangaroo", "dolphin", "whale", "shark",
    "octopus", "squid", "crab", "lobster", "starfish", "seahorse", "penguin",
    "owl", "parrot", "toucan", "hummingbird", "sparrow", "robin", "bluejay",
    "cardinal", "crow", "magpie", "swan", "duck", "goose", "crane", "heron",
    "flamingo", "peacock", "turkey", "rooster", "chicken", "quail", "dove",
    "pigeon", "butterfly", "dragonfly", "beetle", "mantis", "spider", "scorpion",
    "warrior", "wizard", "knight", "ninja", "samurai", "pirate", "viking",
    "ranger", "hunter", "explorer", "voyager", "traveler", "wanderer", "seeker",
    "dreamer", "thinker", "creator", "builder", "maker", "coder", "hacker",
    "gamer", "player", "master", "champion", "hero", "legend", "titan",
    "ghost", "spirit", "phantom", "wraith", "specter", "shadow", "void",
    "nebula", "comet", "meteor", "asteroid", "planet", "star", "galaxy"
]

def generate_random_username(separator=""):
    """
    Generate a random username following the adjective-noun-number pattern.
    
    Args:
        separator (str): Separator between words (empty string, "-", or "_")
    
    Returns:
        str: Generated username in format: AdjectiveNounNumber
    
    Examples:
        - HappyFox42
        - SwiftPanda77
        - BraveEagle19
        - clever-wizard-88
    """
    adjective = random.choice(ADJECTIVES)
    noun = random.choice(NOUNS)
    number = random.randint(1, 99)
    
    # Capitalize first letter of each word for better readability
    if separator:
        # With separator: lowercase words
        username = f"{adjective}{separator}{noun}{separator}{number}"
    else:
        # Without separator: CamelCase
        username = f"{adjective.capitalize()}{noun.capitalize()}{number}"
    
    return username

def generate_unique_username(existing_usernames=None, max_attempts=10, separator=""):
    """
    Generate a unique username that doesn't exist in the provided list.
    
    Args:
        existing_usernames (set): Set of existing usernames to check against
        max_attempts (int): Maximum number of generation attempts
        separator (str): Separator between words
    
    Returns:
        str: Unique generated username
    """
    if existing_usernames is None:
        existing_usernames = set()
    
    for _ in range(max_attempts):
        username = generate_random_username(separator=separator)
        if username.lower() not in {u.lower() for u in existing_usernames}:
            return username
    
    # If all attempts fail, add timestamp to ensure uniqueness
    import time
    timestamp = int(time.time() % 10000)
    adjective = random.choice(ADJECTIVES)
    noun = random.choice(NOUNS)
    
    if separator:
        return f"{adjective}{separator}{noun}{separator}{timestamp}"
    else:
        return f"{adjective.capitalize()}{noun.capitalize()}{timestamp}"

async def generate_unique_username_db(db, separator=""):
    """
    Generate a unique username that doesn't exist in the database.
    
    Args:
        db: Database instance
        separator (str): Separator between words
    
    Returns:
        str: Unique generated username
    """
    max_attempts = 20
    
    for _ in range(max_attempts):
        username = generate_random_username(separator=separator)
        
        # Check if username exists in database
        existing = await db.users.find_one({"username": username})
        if not existing:
            return username
    
    # Fallback with timestamp
    import time
    timestamp = int(time.time() % 10000)
    adjective = random.choice(ADJECTIVES)
    noun = random.choice(NOUNS)
    
    if separator:
        return f"{adjective}{separator}{noun}{separator}{timestamp}"
    else:
        return f"{adjective.capitalize()}{noun.capitalize()}{timestamp}"
