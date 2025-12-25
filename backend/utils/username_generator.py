"""
Username generator that creates Apify-style usernames.
Format: {adjective}_{noun}
Example: righteous_planet, cosmic_dragon, brave_thunder
"""
import random

# List of adjectives
ADJECTIVES = [
    "brave", "bright", "calm", "clever", "cool", "cosmic", "creative", "daring",
    "elegant", "epic", "fierce", "friendly", "gentle", "golden", "graceful", "happy",
    "honest", "humble", "jolly", "kind", "lively", "lucky", "majestic", "mighty",
    "noble", "patient", "peaceful", "playful", "powerful", "proud", "quick", "quiet",
    "radiant", "rapid", "righteous", "royal", "serene", "shining", "silent", "simple",
    "smooth", "solar", "solemn", "stellar", "strong", "sunny", "swift", "tame",
    "tender", "thankful", "true", "trusty", "unique", "upbeat", "valiant", "vibrant",
    "vigorous", "vivid", "warm", "wild", "wise", "witty", "worthy", "youthful",
    "zealous", "ancient", "bold", "celestial", "dancing", "eager", "fearless", "glowing",
    "gracious", "heroic", "luminous", "mystic", "nimble", "pristine", "radiant", "restless",
    "sacred", "savage", "sleek", "steady", "supreme", "tranquil", "ultimate", "wandering"
]

# List of nouns
NOUNS = [
    "albatross", "bear", "butterfly", "comet", "cosmos", "dragon", "eagle", "eclipse",
    "falcon", "flame", "forest", "galaxy", "hawk", "horizon", "island", "jaguar",
    "knight", "leopard", "lion", "moon", "mountain", "nebula", "ocean", "owl",
    "panther", "phoenix", "planet", "raven", "river", "rocket", "shadow", "sky",
    "spirit", "star", "storm", "sun", "thunder", "tiger", "titan", "tornado",
    "valley", "volcano", "warrior", "wave", "whisper", "wind", "wolf", "wonder",
    "aurora", "blizzard", "canyon", "cascade", "crystal", "dune", "ember", "fjord",
    "glacier", "grove", "haven", "lightning", "meadow", "meteor", "oasis", "peak",
    "quest", "ridge", "sage", "summit", "tempest", "tundra", "universe", "vortex",
    "waterfall", "zenith", "anchor", "beacon", "breeze", "cavern", "compass", "crater",
    "desert", "dimension", "echo", "element", "equinox", "fire", "fortress", "frontier",
    "garden", "guardian", "harbor", "ice", "jungle", "kingdom", "legend", "matrix",
    "nexus", "north", "orbit", "paradise", "portal", "prism", "pulse", "realm",
    "sanctuary", "sentinel", "solstice", "soul", "spark", "sphere", "sunrise", "tide",
    "trail", "trident", "twilight", "vapor", "venture", "vertex", "vision", "voyage"
]


def generate_username() -> str:
    """
    Generate a random username in the format: {adjective}_{noun}
    
    Returns:
        str: Generated username (e.g., "righteous_planet")
    """
    adjective = random.choice(ADJECTIVES)
    noun = random.choice(NOUNS)
    return f"{adjective}_{noun}"


def generate_unique_username(existing_usernames: set, max_attempts: int = 100) -> str:
    """
    Generate a unique username that doesn't exist in the provided set.
    
    Args:
        existing_usernames: Set of existing usernames to avoid
        max_attempts: Maximum number of attempts before giving up
    
    Returns:
        str: Unique generated username
        
    Raises:
        ValueError: If unable to generate unique username after max_attempts
    """
    for _ in range(max_attempts):
        username = generate_username()
        if username not in existing_usernames:
            return username
    
    # If we can't find a unique combination, add a random number
    username = generate_username()
    return f"{username}_{random.randint(1, 9999)}"


def generate_username_suggestions(count: int = 5) -> list:
    """
    Generate multiple username suggestions.
    
    Args:
        count: Number of suggestions to generate
    
    Returns:
        list: List of generated usernames
    """
    suggestions = []
    for _ in range(count):
        username = generate_username()
        suggestions.append(username)
    return suggestions
