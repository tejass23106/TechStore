export type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  description: string;
  image: string;
  rating: number;
  reviews: number;
  stock: number;
};

export const products: Product[] = [
  {
    id: 1,
    name: "Pro Gaming Laptop",
    category: "Laptops",
    price: 74999,
    originalPrice: 84999,
    description:
      "A powerful laptop designed for gaming, development and demanding workloads.",
    image:
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=80",
    rating: 4.8,
    reviews: 124,
    stock: 12,
  },

  {
    id: 2,
    name: "Smartphone Pro",
    category: "Smartphones",
    price: 44999,
    originalPrice: 49999,
    description:
      "A premium smartphone with a high-performance processor and stunning display.",
    image:
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80",
    rating: 4.7,
    reviews: 218,
    stock: 24,
  },

  {
    id: 3,
    name: "Wireless Headphones",
    category: "Accessories",
    price: 8999,
    originalPrice: 10999,
    description:
      "Immersive wireless headphones with rich sound and long-lasting battery life.",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    rating: 4.6,
    reviews: 96,
    stock: 18,
  },

  {
    id: 4,
    name: "Mechanical Keyboard",
    category: "Accessories",
    price: 4999,
    originalPrice: 5999,
    description:
      "A responsive mechanical keyboard designed for gaming and productivity.",
    image:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80",
    rating: 4.5,
    reviews: 73,
    stock: 31,
  },

  {
    id: 5,
    name: "Gaming Mouse",
    category: "Gaming",
    price: 2999,
    originalPrice: 3999,
    description:
      "Lightweight precision gaming mouse with accurate tracking and customizable controls.",
    image:
      "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=80",
    rating: 4.6,
    reviews: 142,
    stock: 40,
  },

  {
    id: 6,
    name: "4K Monitor",
    category: "Gaming",
    price: 29999,
    originalPrice: 34999,
    description:
      "A sharp 4K monitor for gaming, editing, programming and creative work.",
    image:
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80",
    rating: 4.7,
    reviews: 87,
    stock: 9,
  },
];