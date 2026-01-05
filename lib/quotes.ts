export const quotes = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar" },
    { text: "Act as if what you do makes a difference. It does.", author: "William James" },
    { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
    { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
    { text: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson" },
    { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
    { text: "Try not to become a man of success. Rather become a man of value.", author: "Albert Einstein" },
    { text: "Stop chasing the money and start chasing the passion.", author: "Tony Hsieh" },
    { text: "All our dreams can come true if we have the courage to pursue them.", author: "Walt Disney" },
    { text: "If you are working on something that you really care about, you don't have to be pushed. The vision pulls you.", author: "Steve Jobs" },
    { text: "People who are crazy enough to think they can change the world, are the ones who do.", author: "Rob Siltanen" },
    { text: "Failure will never overtake me if my determination to succeed is strong enough.", author: "Og Mandino" },
    { text: "We may encounter many defeats but we must not be defeated.", author: "Maya Angelou" },
    { text: "Knowing is not enough; we must apply. Wishing is not enough; we must do.", author: "Johann Wolfgang Von Goethe" },
    { text: "Imagine your life is perfect in every respect; what would it look like?", author: "Brian Tracy" },
    { text: "We generate fears while we sit. We overcome them by action.", author: "Dr. Henry Link" },
    { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
    { text: "Security is mostly a superstition. Life is either a daring adventure or nothing.", author: "Helen Keller" },
    { text: "The man who has confidence in himself gains the confidence of others.", author: "Hasidic Proverb" },
    { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
    { text: "Creativity is intelligence having fun.", author: "Albert Einstein" },
    { text: "You differ from a great man in only one respect: the great man was once a different man.", author: "Unknown" },
    { text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama" },
    { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" }
];

export function getDailyQuote() {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    return quotes[dayOfYear % quotes.length];
}
