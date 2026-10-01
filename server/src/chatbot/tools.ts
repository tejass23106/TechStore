import prisma from "../lib/prisma.js";

export interface ProductSearchArgs {
query?: string;
category?: string;
maxPrice?: number;
minPrice?: number;
minRating?: number;
}

export async function searchProducts(args: ProductSearchArgs) {
const where: {
active: boolean;
name?: { contains: string; mode: "insensitive" };
category?: { contains: string; mode: "insensitive" };
price?: { gte?: number; lte?: number };
rating?: { gte: number };
} = {
active: true,
};

const query = args.query?.trim();
const category = args.category?.trim();

if (query) {
where.name = {
contains: query,
mode: "insensitive",
};
}

if (category) {
where.category = {
contains: category,
mode: "insensitive",
};
}

if (
typeof args.minPrice === "number" ||
typeof args.maxPrice === "number"
) {
where.price = {};


if (typeof args.minPrice === "number") {
  where.price.gte = Math.max(0, args.minPrice);
}

if (typeof args.maxPrice === "number") {
  where.price.lte = Math.max(0, args.maxPrice);
}


}

if (typeof args.minRating === "number") {
where.rating = {
gte: Math.min(5, Math.max(0, args.minRating)),
};
}

const products = await prisma.product.findMany({
where,
orderBy: [
{ rating: "desc" },
{ reviews: "desc" },
],
take: 10,
select: {
id: true,
name: true,
price: true,
category: true,
rating: true,
reviews: true,
stock: true,
description: true,
},
});

// Keep descriptions useful but small.
// This reduces Gemini input tokens without losing the important information.
return products.map((product) => ({
id: product.id,
name: product.name,
price: product.price,
category: product.category,
rating: product.rating,
reviews: product.reviews,
stock: product.stock,
description:
product.description.length > 220
? `${product.description.slice(0, 220).trim()}...`
: product.description,
}));
}

export async function getCart(userId: number) {
const cart = await prisma.cart.findUnique({
where: {
userId,
},
include: {
items: {
include: {
product: {
select: {
id: true,
name: true,
price: true,
stock: true,
active: true,
},
},
},
orderBy: {
id: "asc",
},
},
},
});

if (!cart) {
return {
items: [],
totalItems: 0,
subtotal: 0,
};
}

const items = cart.items.map((item) => ({
productId: item.product.id,
name: item.product.name,
price: item.product.price,
quantity: item.quantity,
stock: item.product.stock,
active: item.product.active,
itemTotal: item.product.price * item.quantity,
}));

return {
items,
totalItems: items.reduce(
(total, item) => total + item.quantity,
0
),
subtotal: items.reduce(
(total, item) => total + item.itemTotal,
0
),
};
}

export interface AddToCartArgs {
productName: string;
quantity?: number;
}

export async function addToCart(
userId: number,
args: AddToCartArgs
) {
const productName = args.productName?.trim();

if (!productName) {
return {
success: false,
message: "Please specify the product name.",
};
}

const quantity = args.quantity ?? 1;

if (
!Number.isInteger(quantity) ||
quantity < 1 ||
quantity > 99
) {
return {
success: false,
message: "Quantity must be between 1 and 99.",
};
}

const products = await prisma.product.findMany({
where: {
active: true,
name: {
contains: productName,
mode: "insensitive",
},
},
take: 5,
select: {
id: true,
name: true,
price: true,
stock: true,
},
});

if (products.length === 0) {
return {
success: false,
message: `No active product matching "${productName}" was found.`,
};
}

if (products.length > 1) {
return {
success: false,
message:
"Multiple products matched. Ask the user to specify the exact product.",
matches: products.map((product) => ({
id: product.id,
name: product.name,
price: product.price,
})),
};
}

const product = products[0];

if (product.stock < quantity) {
return {
success: false,
message: `Only ${product.stock} item(s) of ${product.name} are available.`,
};
}

const cart = await prisma.cart.upsert({
where: {
userId,
},
create: {
userId,
},
update: {},
});

const existingItem = await prisma.cartItem.findUnique({
where: {
cartId_productId: {
cartId: cart.id,
productId: product.id,
},
},
});

const newQuantity = existingItem
? existingItem.quantity + quantity
: quantity;

if (newQuantity > 99) {
return {
success: false,
message:
"A maximum of 99 units of a product can be kept in the cart.",
};
}

if (newQuantity > product.stock) {
return {
success: false,
message:
`Only ${product.stock} item(s) of ${product.name} are available. ` +
`Your cart already contains ${existingItem?.quantity ?? 0}.`,
};
}

await prisma.cartItem.upsert({
where: {
cartId_productId: {
cartId: cart.id,
productId: product.id,
},
},
create: {
cartId: cart.id,
productId: product.id,
quantity,
},
update: {
quantity: newQuantity,
},
});

return {
success: true,
message: `${product.name} was added to your cart.`,
product: {
id: product.id,
name: product.name,
price: product.price,
quantity: newQuantity,
},
};
}

export interface RemoveFromCartArgs {
productName: string;
}

export async function removeFromCart(
userId: number,
args: RemoveFromCartArgs
) {
const productName = args.productName?.trim();

if (!productName) {
return {
success: false,
message: "Please specify the product name.",
};
}

const cart = await prisma.cart.findUnique({
where: {
userId,
},
});

if (!cart) {
return {
success: false,
message: "Your cart is already empty.",
};
}

const items = await prisma.cartItem.findMany({
where: {
cartId: cart.id,
},
include: {
product: {
select: {
id: true,
name: true,
},
},
},
});

const normalizedName = productName.toLowerCase();

const matches = items.filter((item) =>
item.product.name.toLowerCase().includes(normalizedName)
);

if (matches.length === 0) {
return {
success: false,
message: `No cart item matching "${productName}" was found.`,
};
}

if (matches.length > 1) {
return {
success: false,
message:
"Multiple cart items matched. Ask the user to specify the exact product.",
matches: matches.map((item) => ({
id: item.product.id,
name: item.product.name,
})),
};
}

await prisma.cartItem.delete({
where: {
id: matches[0].id,
},
});

return {
success: true,
message: `${matches[0].product.name} was removed from your cart.`,
};
}

export async function clearCart(userId: number) {
const cart = await prisma.cart.findUnique({
where: {
userId,
},
});

if (!cart) {
return {
success: true,
message: "Your cart is already empty.",
};
}

await prisma.cartItem.deleteMany({
where: {
cartId: cart.id,
},
});

return {
success: true,
message: "Your cart has been cleared.",
};
}
