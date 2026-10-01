import { Link } from "react-router-dom";
import { Star } from "lucide-react";

type Product = {
  id: number;
  name: string;
  price: number;
  category: string;
  rating: number;
  reviews: number;
  stock: number;
  image: string;
  description: string;
};

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group overflow-hidden rounded-3xl border border-gray-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />

        <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-sm">
          {product.category}
        </span>
      </div>

      <div className="p-6">

        <div className="flex items-center gap-1 text-sm">
          <Star
            size={15}
            fill="currentColor"
          />

          <span className="font-medium">
            {product.rating}
          </span>

          <span className="text-gray-400">
            ({product.reviews})
          </span>
        </div>

        <h3 className="mt-3 text-lg font-bold">
          {product.name}
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
          {product.description}
        </p>

        <div className="mt-5">
          <span className="text-lg font-bold">
            ₹{product.price.toLocaleString("en-IN")}
          </span>
        </div>

      </div>
    </Link>
  );
}

