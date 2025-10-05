import rateLimit from'express-rate-limit';


// Create rate limiter middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1,                 // Limit each IP to 100 requests per `window` (15 min)
  message: {
    status: 429,
    message: "Too many requests, please try again later."
    //! this is for fun 
    // message: "https://indianmemetemplates.com/wp-content/uploads/chala-ja-bhsdk.jpg."
  },
  standardHeaders: true,   // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false     // Disable the `X-RateLimit-*` headers
});

export {limiter}