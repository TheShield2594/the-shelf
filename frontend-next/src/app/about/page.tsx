import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4 font-serif">
            About The Shelf
          </h1>
          <p className="text-xl text-gray-600">
            A privacy-first book platform with multi-dimensional ratings
          </p>
        </div>

        {/* Mission */}
        <section className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 font-serif">
            Our Mission
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            Create a modern, clean, privacy-respecting, algorithmically intelligent,
            and genuinely enjoyable platform for tracking, discovering, and discussing
            books.
          </p>
        </section>

        {/* Why we exist */}
        <section className="bg-gradient-to-br from-shelf-50 to-white rounded-xl p-8 mb-8 border border-shelf-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 font-serif">
            Why We Built This
          </h2>

          <div className="space-y-6 text-gray-700">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-shelf-800">
                Goodreads is stuck in 2009
              </h3>
              <p className="leading-relaxed">
                Cluttered UI, slow pages, and an interface that hasn't evolved with
                modern web standards. Readers deserve better.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-shelf-800">
                5-star ratings are broken
              </h3>
              <p className="leading-relaxed">
                A single number can't capture the complexity of a reading experience.
                Was it fast-paced but shallow? Slow but emotionally devastating? 5
                stars can't tell you.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-shelf-800">
                Your reading data is intimate
              </h3>
              <p className="leading-relaxed">
                Goodreads is owned by Amazon. Your reading history is valuable data
                that's used for advertising and recommendations on other books to buy.
                We believe your data should be yours.
              </p>
            </div>
          </div>
        </section>

        {/* Core principles */}
        <section className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 font-serif">
            Our Principles
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🛡️</span>
                  <h3 className="font-bold text-lg">Privacy First</h3>
                </div>
                <p className="text-gray-700 text-sm">
                  No data selling, no tracking, easy export. Your reading history is
                  yours alone.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📊</span>
                  <h3 className="font-bold text-lg">Nuanced Expression</h3>
                </div>
                <p className="text-gray-700 text-sm">
                  7-dimensional ratings capture the complexity of reading experiences.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🎯</span>
                  <h3 className="font-bold text-lg">Smart Discovery</h3>
                </div>
                <p className="text-gray-700 text-sm">
                  Find books by feel, not just genre. Our algorithm understands
                  context.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🚀</span>
                  <h3 className="font-bold text-lg">Modern & Fast</h3>
                </div>
                <p className="text-gray-700 text-sm">
                  Built with Next.js 14, designed for 2026, not 2009.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🎨</span>
                  <h3 className="font-bold text-lg">Clean Design</h3>
                </div>
                <p className="text-gray-700 text-sm">
                  No clutter, no overwhelming UI, just what you need.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">💎</span>
                  <h3 className="font-bold text-lg">Quality Over Quantity</h3>
                </div>
                <p className="text-gray-700 text-sm">
                  No reading challenges or vanity metrics. We care about meaningful
                  experiences.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Technology */}
        <section className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 mb-8 border border-blue-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 font-serif">
            Built with Modern Tech
          </h2>

          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded-lg p-4 border border-blue-300">
              <h3 className="font-bold mb-2">Frontend</h3>
              <ul className="space-y-1 text-gray-700">
                <li>• Next.js 14</li>
                <li>• TypeScript</li>
                <li>• Tailwind CSS</li>
                <li>• Recharts</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-300">
              <h3 className="font-bold mb-2">Backend</h3>
              <ul className="space-y-1 text-gray-700">
                <li>• FastAPI (Python)</li>
                <li>• PostgreSQL</li>
                <li>• SQLAlchemy</li>
                <li>• pgvector</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-300">
              <h3 className="font-bold mb-2">AI/ML</h3>
              <ul className="space-y-1 text-gray-700">
                <li>• Sentence Transformers</li>
                <li>• scikit-learn</li>
                <li>• Vector similarity</li>
                <li>• Smart recommendations</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Open Source */}
        <section className="bg-white rounded-xl shadow-md p-8 mb-8 border border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 font-serif">
            Open Source & Transparent
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-4">
            The Shelf is built in the open. Our code, architecture decisions, and
            product roadmap are all documented and available.
          </p>
          <p className="text-gray-600">
            We believe in transparency and user empowerment. You can even self-host
            your own instance if you prefer complete control.
          </p>
        </section>

        {/* CTA */}
        <div className="text-center bg-gradient-to-br from-shelf-600 to-shelf-800 rounded-xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4 font-serif">
            Ready to Try It?
          </h2>
          <p className="text-xl mb-8 text-shelf-100">
            Experience the future of book tracking with multi-dimensional ratings.
          </p>
          <Link
            href="/demo"
            className="inline-block bg-white text-shelf-700 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-shelf-50 transition-all hover:scale-105 shadow-lg"
          >
            Try the Demo →
          </Link>
        </div>
      </div>
    </div>
  );
}
