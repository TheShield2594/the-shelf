import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-shelf-50 via-white to-shelf-100 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 font-serif">
            A Better Way to
            <br />
            <span className="text-shelf-700">Track Books</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Replace 5-star ratings with{' '}
            <strong className="text-shelf-700">
              multi-dimensional ratings
            </strong>{' '}
            that capture the complexity of reading experiences.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/demo"
              className="bg-shelf-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-shelf-700 transition-all hover:scale-105 shadow-lg"
            >
              Try the Demo
            </Link>
            <Link
              href="/about"
              className="bg-white text-shelf-700 px-8 py-4 rounded-lg font-semibold text-lg border-2 border-shelf-600 hover:bg-shelf-50 transition-colors"
            >
              Learn More
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="bg-white rounded-xl p-6 shadow-md border border-shelf-200">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">
                7 Dimensions
              </h3>
              <p className="text-gray-600 text-sm">
                Rate pace, emotion, complexity, character, plot, prose, and
                originality
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-shelf-200">
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">
                Smart Discovery
              </h3>
              <p className="text-gray-600 text-sm">
                Find books by feel, not just genre. "High emotion, lower
                complexity"
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md border border-shelf-200">
              <div className="text-4xl mb-3">🛡️</div>
              <h3 className="font-bold text-lg mb-2 text-gray-900">
                Privacy First
              </h3>
              <p className="text-gray-600 text-sm">
                Your data is yours. No selling, no tracking, easy export
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why multi-dimensional section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center font-serif">
            Why Multi-Dimensional Ratings?
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-red-600 mb-3">
                ❌ 5-Star Ratings Fail
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex gap-3">
                  <span className="text-red-500">•</span>
                  <span>
                    <strong>Reductive:</strong> Can't express "great prose,
                    weak plot"
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-500">•</span>
                  <span>
                    <strong>Unstable:</strong> Changes with mood and time
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-500">•</span>
                  <span>
                    <strong>Incomparable:</strong> Your 3-star ≠ my 3-star
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-500">•</span>
                  <span>
                    <strong>Meaningless:</strong> 3.7 vs 3.8 stars?
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-green-600 mb-3">
                ✅ Multi-Dimensional Works
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex gap-3">
                  <span className="text-green-500">•</span>
                  <span>
                    <strong>Nuanced:</strong> Express complexity naturally
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-500">•</span>
                  <span>
                    <strong>Visual:</strong> Radar charts show personality
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-500">•</span>
                  <span>
                    <strong>Smart:</strong> Enables "books like X but
                    faster-paced"
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-green-500">•</span>
                  <span>
                    <strong>Flexible:</strong> Rate only what matters
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/demo"
              className="inline-block bg-shelf-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-shelf-700 transition-all shadow-lg"
            >
              See It In Action →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-shelf-700 to-shelf-900 py-16 px-4 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 font-serif">
            Ready for a Better Book Platform?
          </h2>
          <p className="text-xl mb-8 text-shelf-100">
            Join readers who want nuanced ratings and respect for their privacy.
          </p>
          <Link
            href="/demo"
            className="inline-block bg-white text-shelf-700 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-shelf-50 transition-all hover:scale-105 shadow-lg"
          >
            Try the Demo Now
          </Link>
        </div>
      </section>
    </div>
  );
}
