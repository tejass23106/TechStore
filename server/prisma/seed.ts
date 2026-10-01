import prisma from "../src/lib/prisma.js";

const products = [
  {
    name: "ASUS ROG Strix G16 (2025) G614",
    price: 149999,
    category: "Laptops",
    stock: 10,
    image: "/products/rog-strix-g16.jpg",
    description:
      "ASUS ROG Strix G16 gaming laptop designed for high-performance gaming, programming, and demanding creative workloads.",
  },
  {
    name: "Lenovo Legion 5i",
    price: 99999,
    category: "Laptops",
    stock: 10,
    image: "/products/legion-5i.jpg",
    description:
      "Lenovo Legion 5i gaming laptop built for gaming, programming, multitasking, and content creation.",
  },
  {
    name: "Apple iPhone 16 Pro",
    price: 119900,
    category: "Phones",
    stock: 15,
    image: "/products/iphone-16-pro.jpg",
    description:
      "Apple iPhone 16 Pro featuring the A18 Pro chip, titanium design, advanced Pro camera system, and ProMotion display.",
  },
  {
    name: "Samsung Galaxy S25 Ultra",
    price: 129999,
    category: "Phones",
    stock: 15,
    image: "/products/galaxy-s25-ultra.png",
    description:
      "Samsung Galaxy S25 Ultra flagship smartphone featuring an advanced camera system, S Pen, premium display, and high-end performance.",
  },
  {
    name: "OnePlus 13",
    price: 69999,
    category: "Phones",
    stock: 20,
    image: "/products/oneplus-13.jpg",
    description:
      "OnePlus 13 flagship smartphone with a high-resolution AMOLED display, powerful performance, and advanced camera system.",
  },
  {
    name: "Logitech MX Mechanical",
    price: 12999,
    category: "Accessories",
    stock: 25,
    image: "/products/mx-mechanical.webp",
    description:
      "Logitech MX Mechanical wireless mechanical keyboard with low-profile switches, smart illumination, and multi-device connectivity.",
  },
  {
    name: "Logitech MX Master 3S",
    price: 9999,
    category: "Accessories",
    stock: 25,
    image: "/products/mx-master-3s.jpg",
    description:
      "Logitech MX Master 3S wireless mouse with ergonomic design, precision tracking, and programmable controls.",
  },
  {
    name: "Sony WH-1000XM5",
    price: 29999,
    category: "Audio",
    stock: 18,
    image: "/products/wh-1000xm5.jpg",
    description:
      "Sony WH-1000XM5 wireless noise-cancelling headphones with high-quality audio and adaptive noise control.",
  },
  {
    name: "Apple AirPods Pro 2",
    price: 24900,
    category: "Audio",
    stock: 25,
    image: "/products/airpods-pro-2.png",
    description:
      "Apple AirPods Pro 2 with Active Noise Cancellation, Adaptive Audio, Spatial Audio, and a USB-C charging case.",
  },
  {
    name: "PlayStation DualSense Wireless Controller",
    price: 6999,
    category: "Gaming",
    stock: 30,
    image: "/products/dualsense.jpg",
    description:
      "PlayStation DualSense wireless controller featuring haptic feedback, adaptive triggers, and a built-in microphone.",
  },
  {
    name: "Samsung 990 PRO 1TB",
    price: 10999,
    category: "Storage",
    stock: 20,
    image: "/products/samsung-990-pro-1tb.webp",
    description:
      "Samsung 990 PRO 1TB PCIe 4.0 NVMe SSD designed for high-performance gaming, editing, and demanding workloads.",
  },
];

async function main() {
  // Archive the original demo products.
  // They remain in the database so existing orders are preserved.
  await prisma.product.updateMany({
    where: {
      name: {
        in: [
          "Pro Gaming Laptop",
          "Wireless Mechanical Keyboard",
          "Ultra HD Monitor",
        ],
      },
    },
    data: {
      active: false,
    },
  });

  // Archive the other unwanted demo products.
  await prisma.product.updateMany({
    where: {
      name: {
        in: [
          "Creator Pro Laptop",
          "Flagship Smartphone",
          "Premium ANC Headphones",
          "Ergonomic Wireless Mouse",
          "RGB Gaming Mouse",
          "27-inch QHD Monitor",
          "USB-C Docking Station",
          "4K Pro Webcam",
          "Portable Bluetooth Speaker",
          "Wireless Gaming Controller",
          "Wi-Fi 6 Router",
          "1TB NVMe SSD",
        ],
      },
    },
    data: {
      active: false,
    },
  });

  // Add or update the real products.
  for (const product of products) {
    const existingProduct = await prisma.product.findFirst({
      where: {
        name: product.name,
      },
    });

    if (existingProduct) {
      await prisma.product.update({
        where: {
          id: existingProduct.id,
        },
        data: {
          price: product.price,
          category: product.category,
          stock: product.stock,
          image: product.image,
          description: product.description,
          active: true,
        },
      });

      console.log(`Updated: ${product.name}`);
    } else {
      await prisma.product.create({
        data: {
          ...product,
          rating: 0,
          reviews: 0,
          active: true,
        },
      });

      console.log(`Added: ${product.name}`);
    }
  }

  console.log("Real product catalog updated successfully.");
}

main()
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });