import prisma from "./prisma.js";

/**
 * Releases expired unpaid stock reservations atomically.
 * Ensures stock is restored exactly once, even under concurrent executions.
 */
export async function releaseExpiredStockReservations(): Promise<{
  releasedCount: number;
  orderIds: number[];
}> {
  const now = new Date();

  const expiredOrders = await prisma.order.findMany({
    where: {
      status: "PENDING",
      paymentStatus: "PENDING",
      stockReserved: true,
      reservationExpiresAt: {
        lte: now,
      },
    },
    include: {
      items: true,
    },
    take: 50,
  });

  const releasedOrderIds: number[] = [];

  for (const order of expiredOrders) {
    try {
      await prisma.$transaction(async (tx) => {
        // Atomically claim the expired reservation release.
        // Only one concurrent execution can succeed in updating the order.
        const claimed = await tx.order.updateMany({
          where: {
            id: order.id,
            status: "PENDING",
            paymentStatus: "PENDING",
            stockReserved: true,
            reservationExpiresAt: {
              lte: now,
            },
          },
          data: {
            stockReserved: false,
            status: "CANCELLED",
          },
        });

        if (claimed.count === 1) {
          // Restore inventory for each item exactly once
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });
          }

          releasedOrderIds.push(order.id);
        }
      });
    } catch (err) {
      console.error(
        `Failed to release expired reservation for order ${order.id}:`,
        err
      );
    }
  }

  return {
    releasedCount: releasedOrderIds.length,
    orderIds: releasedOrderIds,
  };
}

