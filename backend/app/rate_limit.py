from slowapi import Limiter
from slowapi.util import get_remote_address

# Keys on the direct TCP peer address, not X-Forwarded-For: this app has no
# notion of a trusted reverse proxy, so trusting that header would let a
# client spoof it to evade or trigger rate limits for other users. Anyone
# running this behind a reverse proxy should be aware all proxied traffic
# shares one rate-limit bucket.
limiter = Limiter(key_func=get_remote_address)
