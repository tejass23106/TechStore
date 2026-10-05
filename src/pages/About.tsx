export default function About() {
  return (
    <main className="min-h-screen px-6 py-12 sm:px-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          About TechStore
        </h1>

        <div className="mt-8 space-y-6 text-base leading-7 text-gray-600 sm:text-lg">
          <p>
            Welcome to TechStore — your spot for all things tech, without the
            unnecessary hassle.
          </p>

          <p>
            Whether you're upgrading your setup, looking for a new laptop,
            hunting for the perfect keyboard, or just browsing because you
            <span className="font-medium text-gray-900"> "might buy something," </span>
            we've got you covered.
          </p>

          <p>
            We built TechStore to keep online tech shopping simple. Browse
            products, compare your options, add your favourites to the cart,
            and check out when you're ready. No endless searching. No
            complicated experience. Just tech that fits your needs and budget.
          </p>

          <p>
            And when you can't decide, our AI shopping assistant is here to
            help. Ask what you need, tell it your budget, or compare products
            and let it help you narrow things down.
          </p>

          <p className="font-semibold text-gray-900">
            Find it. Compare it. Add it. TechStore.
          </p>
        </div>
      </div>
    </main>
  );
}
