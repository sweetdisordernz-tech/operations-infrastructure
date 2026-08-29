import { notFound } from "next/navigation";
import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { getProduct, getRanges, getFillings } from "@/lib/admin/products";
import { ProductForm } from "@/app/_components/admin/product-form";
import { DeleteButton } from "@/app/_components/admin/delete-button";
import { updateProductAction, deleteProductAction } from "@/app/(admin)/admin/(authenticated)/products/actions";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPageUser();
  const { id } = await params;

  const [product, ranges, fillings] = await Promise.all([getProduct(id), getRanges(), getFillings()]);
  if (!product) notFound();

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">{product.name}</h1>
          <p>{product.sku ?? "No SKU yet"}</p>
        </div>
      </div>

      <div className="sd-panel">
        <ProductForm action={updateProductAction} ranges={ranges} fillings={fillings} product={product} />
      </div>

      <div className="sd-panel">
        <h2 className="sd-section-heading" style={{ marginBottom: "0.75rem" }}>
          Danger zone
        </h2>
        <p className="sd-caption" style={{ marginBottom: "0.75rem" }}>
          Deleting only works if this product has no order history - otherwise mark it inactive instead.
        </p>
        <DeleteButton
          action={deleteProductAction}
          hiddenFields={{ id: product.id }}
          label="Delete product"
          confirmMessage={`Delete "${product.name}"? This can't be undone.`}
        />
      </div>
    </>
  );
}
