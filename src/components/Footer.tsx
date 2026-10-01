export default function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-4">

        <div>
          <h2 className="text-xl font-bold">TECHSTORE</h2>
          <p className="mt-3 text-sm text-gray-600">
            Technology made simple.
          </p>
        </div>

        <div>
          <h3 className="font-semibold">Shop</h3>
          <div className="mt-3 space-y-2 text-sm text-gray-600">
            <p>Laptops</p>
            <p>Phones</p>
            <p>Accessories</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold">Company</h3>
          <div className="mt-3 space-y-2 text-sm text-gray-600">
            <p>About</p>
            <p>Contact</p>
            <p>Careers</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold">Support</h3>
          <div className="mt-3 space-y-2 text-sm text-gray-600">
            <p>Help Center</p>
            <p>Shipping</p>
            <p>Returns</p>
          </div>
        </div>

      </div>

      <div className="border-t py-6 text-center text-sm text-gray-500">
        © 2026 TechStore. All rights reserved.
      </div>
    </footer>
  );
}