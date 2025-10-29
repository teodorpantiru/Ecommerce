import { getMyCart } from "@/lib/actions/cart.actions";
import CartTable from "./cart-table";

export const metadata = {
  title: "Shopping Cart",
};

const CartPage = async () => {
  const cart = await getMyCart();
  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/*@ts-expect-error */}
      <CartTable cart={cart} />
    </>
  );
};

export default CartPage;
