import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { getRanges, getFillings } from "@/lib/admin/products";
import { ProductForm } from "@/app/_components/admin/product-form";
import { createProductAction } from "@/app/(admin)/admin/(authenticated)/products/actions";

export default async function NewProductPage() {
  await requireAdminPageUser();
  const [ranges, fillings] = await Promise.all([getRanges(), getFillings()]);

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Add Product</h1>
          <p>SKU/barcode are optional - a product can be created, priced, and sold before a code is assigned.</p>
        </div>
      </div>

      <div className="sd-panel">
        <ProductForm action={createProductAction} ranges={ranges} fillings={fillings} />
      </div>
    </>
  );
}
