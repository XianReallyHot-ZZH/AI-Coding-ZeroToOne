from app.config import settings

print(f"DATABASE_URL type: {type(settings.DATABASE_URL)}")
print(f"DATABASE_URL length: {len(settings.DATABASE_URL)}")
print(f"DATABASE_URL: {settings.DATABASE_URL}")

try:
    for i, char in enumerate(settings.DATABASE_URL):
        if ord(char) > 127:
            print(f"Non-ASCII character at position {i}: {repr(char)} (U+{ord(char):04X})")
except Exception as e:
    print(f"Error: {e}")
