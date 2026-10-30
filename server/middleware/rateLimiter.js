/**
 * Enterprise In-Memory Sliding-Window Rate Limiter
 * Provides DDoS and brute-force mitigation without external Redis dependencies.
 */

class SlidingWindowRateLimiter {
  constructor({ windowMs = 60 * 1000, max = 60, message = 'Too many requests. Please try again later.' } = {}) {
    this.windowMs = windowMs;
    this.max = max;
    this.message = message;
    this.hits = new Map(); // ip -> Array of timestamps

    // Garbage collect expired entries every 2 minutes
    this.gcTimer = setInterval(() => {
      const now = Date.now();
      for (const [ip, timestamps] of this.hits.entries()) {
        const valid = timestamps.filter(t => now - t < this.windowMs);
        if (valid.length === 0) {
          this.hits.delete(ip);
        } else {
          this.hits.set(ip, valid);
        }
      }
    }, 2 * 60 * 1000);

    if (this.gcTimer.unref) {
      this.gcTimer.unref();
    }
  }

  middleware() {
    return (req, res, next) => {
      // Bypass rate limiting in test suite or loopback health checks
      if (process.env.NODE_ENV === 'test' && !req.headers['x-test-ratelimit']) {
        return next();
      }

      const clientIp = (
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        'unknown'
      );

      const now = Date.now();
      const timestamps = this.hits.get(clientIp) || [];
      const windowStart = now - this.windowMs;
      const recent = timestamps.filter(t => t > windowStart);

      if (recent.length >= this.max) {
        const oldest = recent[0];
        const retryAfterSeconds = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));
        res.setHeader('Retry-After', retryAfterSeconds);
        return res.status(429).json({
          error: this.message,
          retryAfter: retryAfterSeconds
        });
      }

      recent.push(now);
      this.hits.set(clientIp, recent);
      next();
    };
  }
}

// 1. Auth Rate Limiter: max 20 login/register attempts per minute per IP
export const authRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please wait 60 seconds before trying again.'
}).middleware();

// 2. Code Execution Rate Limiter: max 30 code executions per minute per IP
export const codeExecutionRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Code execution limit exceeded. Please wait a moment before running more code.'
}).middleware();

// 3. General API Rate Limiter: max 200 requests per minute per IP
export const apiRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 1000,
  max: 200,
  message: 'API rate limit exceeded. Please slow down your requests.'
}).middleware();
