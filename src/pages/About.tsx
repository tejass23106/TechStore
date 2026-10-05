export default function About() {
  const features = [
    {
      title: "Tech, minus the chaos",
      description:
        "Find laptops, phones, monitors, keyboards and more without jumping between a dozen different websites.",
    },
    {
      title: "Shop your way",
      description:
        "Browse by category, check product details, compare options and build your setup at your own pace.",
    },
    {
      title: "AI when you need it",
      description:
        "Not sure what to pick? Ask our AI shopping assistant about products, budgets, comparisons and your cart.",
    },
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 lg:py-28">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-500">
              About TechStore
            </p>

            <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
              Your tech.
              <br />
              Your setup.
              <br />
              <span className="text-gray-500">Your way.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl">
              TechStore is a modern place to discover, compare and shop for
              the tech you actually want. No unnecessary complexity. Just
              good products and a shopping experience that gets out of your
              way.
            </p>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section>
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:px-10 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
              Why we built it
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Tech shopping shouldn't feel like homework.
            </h2>
          </div>

          <div className="space-y-5 text-base leading-7 text-gray-600 sm:text-lg">
            <p>
              We've all been there — opening 20 tabs, comparing random
              specifications and still having no idea which product is
              actually worth buying.
            </p>

            <p>
              TechStore was built to make that process simpler. Browse
              products, check the details, compare your options, add what you
              want to your cart and get on with your day.
            </p>

            <p>
              And when you're stuck between two choices, our AI shopping
              assistant can help you figure things out without the usual
              search-engine rabbit hole.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">
              The TechStore experience
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need.
              <br />
              Nothing you don't.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-200 bg-white p-7 transition duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-sm font-bold text-white">
                  +
                </div>

                <h3 className="text-xl font-semibold text-gray-900">
                  {feature.title}
                </h3>

                <p className="mt-3 leading-7 text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <p className="text-3xl font-bold text-gray-900">100%</p>
              <p className="mt-2 text-sm text-gray-500">
                Built for a smoother shopping experience
              </p>
            </div>

            <div>
              <p className="text-3xl font-bold text-gray-900">24/7</p>
              <p className="mt-2 text-sm text-gray-500">
                AI shopping assistance when you need it
              </p>
            </div>

            <div>
              <p className="text-3xl font-bold text-gray-900">1 place</p>
              <p className="mt-2 text-sm text-gray-500">
                For discovering and managing your tech
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section>
        <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:px-10 lg:py-28">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Ready to upgrade your setup?
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-gray-600">
            Take a look around, find something you like, and make your next
            tech upgrade a little easier.
          </p>

          <p className="mt-8 text-lg font-semibold text-gray-900">
            Find it. Compare it. Add it. TechStore.
          </p>
        </div>
      </section>
    </main>
  );
}

