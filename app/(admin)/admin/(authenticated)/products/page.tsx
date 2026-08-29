import Link from "next/link";
import { requireAdminPageUser } from "@/lib/admin/require-page-user";
import { getProducts } from "@/lib/admin/products";
import { formatPackagingType } from "@/lib/format";
import { ProductToggle } from "@/app/_components/admin/product-toggle";

export default async function ProductsPage() {
  await requireAdminPageUser();
  const products = await getProducts();

  return (
    <>
      <div className="sd-admin-header">
        <div>
          <h1 className="sd-page-title">Products</h1>
          <p>Range, packaging, filling, SKU/barcode, and wholesale visibility for every SKU.</p>
        </div>
        <Link href="/products/new" className="sd-btn sd-btn-primary">
          Add product
        </Link>
      </div>

      <div className="sd-panel">
        <div className="sd-panel-header">
          <h2 className="sd-section-heading">All products</h2>
          <span className="sd-stat-number">{products.length}</span>
        </div>
        <div className="sd-table-wrap">
          <table className="sd-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Range</th>
                <th>Packaging</th>
                <th>Filling</th>
                <th>Min qty</th>
                <th>Wholesale</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="sd-table-name">{product.name}</div>
                    <div className="sd-table-sub">{product.sku ?? "No SKU yet"}</div>
                  </td>
                  <td>{product.rangeName}</td>
                  <td>{formatPackagingType(product.packagingType)}</td>
                  <td>{product.fillingName ?? "-"}</td>
                  <td>{product.minOrderQty}</td>
                  <td>
                    <ProductToggle productId={product.id} field="wholesaleVisible" checked={product.wholesaleVisible} label="" />
                  </td>
                  <td>
                    <ProductToggle productId={product.id} field="active" checked={product.active} label="" />
                  </td>
                  <td>
                    <Link href={`/products/${product.id}`} className="sd-btn sd-btn-sm">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
