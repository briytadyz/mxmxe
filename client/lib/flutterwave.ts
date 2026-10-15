export interface FlutterwaveHostedSession {
  paymentUrl: string;
  txRef: string;
  orderId: string;
}

export interface MenuCheckoutCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roomNumber: string;
  deliveryAddress: string;
  specialRequests: string;
}

export interface PendingCheckoutContext {
  organizationId: string;
  orderId: string;
  orderNumber: string;
  cart: Record<string, number>;
  orderType: "delivery" | "take-away" | "dine-in" | "room-service";
  paymentMethod: "card" | "room-charge" | "cash" | "mobile-money";
  tipAmount: number;
  tipPercentage: number;
  usePoints: boolean;
  customer: MenuCheckoutCustomer;
}

export interface ResumableMenuOrder {
  orderId: string;
  orderNumber: string;
  cart: Record<string, number>;
  orderType: PendingCheckoutContext["orderType"];
  paymentMethod: Extract<PendingCheckoutContext["paymentMethod"], "card" | "mobile-money">;
  tipAmount: number;
  tipPercentage: number;
  usePoints: boolean;
  customer: MenuCheckoutCustomer;
}

const pendingCheckoutKey = "sheraton.pending-checkout";

export const savePendingCheckout = (context: PendingCheckoutContext) => {
  sessionStorage.setItem(pendingCheckoutKey, JSON.stringify(context));
};

export const getPendingCheckout = (): PendingCheckoutContext | null => {
  const storedContext = sessionStorage.getItem(pendingCheckoutKey);
  if (!storedContext) return null;

  try {
    const context = JSON.parse(storedContext) as Partial<PendingCheckoutContext>;
    if (
      typeof context.organizationId !== "string" ||
      typeof context.orderId !== "string" ||
      typeof context.orderNumber !== "string" ||
      !context.cart ||
      typeof context.cart !== "object" ||
      !context.orderType ||
      !context.paymentMethod ||
      typeof context.tipAmount !== "number" ||
      typeof context.tipPercentage !== "number" ||
      typeof context.usePoints !== "boolean" ||
      !context.customer ||
      typeof context.customer.firstName !== "string" ||
      typeof context.customer.lastName !== "string" ||
      typeof context.customer.email !== "string" ||
      typeof context.customer.phone !== "string" ||
      typeof context.customer.roomNumber !== "string" ||
      typeof context.customer.deliveryAddress !== "string" ||
      typeof context.customer.specialRequests !== "string"
    ) {
      return null;
    }
    return context as PendingCheckoutContext;
  } catch {
    return null;
  }
};

export const clearPendingCheckout = () => {
  sessionStorage.removeItem(pendingCheckoutKey);
};
