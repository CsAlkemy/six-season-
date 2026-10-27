"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { deleteProduct, saveProduct } from "@/app/admin/actions";
import type { Product } from "@/lib/types";

const MAX_SIDE = 1200;

/** Shrinks a photo to 1200px WebP in the browser, so uploads are small and the store stays fast. */
async function toWebp(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  return blob ? new File([blob], "photo.webp", { type: "image/webp" }) : file;
}

export function ProductForm({ product }: { product: Product | null }) {
  const [error, action, pending] = useActionState(saveProduct, null);
  const [preview, setPreview] = useState(product?.image ?? "");

  const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const small = await toWebp(file);
    const list = new DataTransfer();
    list.items.add(small);
    input.files = list.files;
    setPreview(URL.createObjectURL(small));
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
      <form action={action} className="card space-y-6 p-6" id="product-form">
        <input type="hidden" name="id" value={product?.id ?? ""} />
        <Pair label="Name" name="name" value={product?.name} required />
        <Pair label="Pack size" name="unit" value={product?.unit} placeholder={{ bn: "৫০০ গ্রাম", en: "500 g" }} />
        <Pair label="Description" name="description" value={product?.description} multiline />

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price (৳)" name="price" type="number" defaultValue={product?.price} required />
          <Field label="Was price (৳, optional)" name="compareAt" type="number" defaultValue={product?.compareAt ?? ""} />
          <Field label="URL slug" name="slug" defaultValue={product?.slug} placeholder="gawa-ghee" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="image" className="label">Photo</label>
            <input id="image" name="image" type="file" accept="image/*" onChange={onPick} className="field py-2" />
            {product?.image && (
              <label className="mt-2 flex items-center gap-2 text-body-sm">
                <input type="checkbox" name="removeImage" /> Remove current photo
              </label>
            )}
          </div>
          <div>
            <label htmlFor="tone" className="label">Placeholder colour (no photo)</label>
            <select id="tone" name="tone" defaultValue={product?.tone ?? "soil"} className="field">
              <option value="butter">Butter</option>
              <option value="mustard">Mustard</option>
              <option value="soil">Soil</option>
              <option value="leaf">Leaf</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" name="inStock" defaultChecked={product?.inStock ?? true} className="size-4 accent-(--bg-brand)" /> In stock
          </label>
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="size-4 accent-(--bg-brand)" /> Show on store
          </label>
        </div>

        {error && <p className="rounded-md bg-error-soft p-3 text-body-sm text-fg-error" role="alert">{error}</p>}
        <div className="flex gap-3">
          <button disabled={pending} className="btn-primary">{pending ? "Saving…" : "Save product"}</button>
          <Link href="/admin/products" className="btn-secondary">Cancel</Link>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="card overflow-hidden">
          {preview ? <img src={preview} alt="" className="aspect-square w-full object-cover" /> : <div className="grid aspect-square place-items-center text-fg-tertiary">No photo yet</div>}
        </div>
        {product && (
          <form action={deleteProduct} onSubmit={(e) => !confirm(`Delete ${product.name.en}?`) && e.preventDefault()}>
            <input type="hidden" name="id" value={product.id} />
            <button className="btn w-full border border-border-strong text-fg-error hover:bg-error-soft">Delete product</button>
          </form>
        )}
      </aside>
    </div>
  );
}

function Field({ label, name, ...input }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} min={input.type === "number" ? 0 : undefined} className="field" {...input} />
    </div>
  );
}

/** A Bangla and an English input side by side. */
function Pair({ label, name, value, placeholder, multiline, required }: {
  label: string;
  name: string;
  value?: { bn: string; en: string };
  placeholder?: { bn: string; en: string };
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(["bn", "en"] as const).map((lang) => {
        const id = `${name}.${lang}`;
        const props = { id, name: id, defaultValue: value?.[lang], placeholder: placeholder?.[lang], required, className: "field" };
        return (
          <div key={lang}>
            <label htmlFor={id} className="label">{label} · {lang === "bn" ? "বাংলা" : "English"}</label>
            {multiline ? <textarea rows={4} {...props} /> : <input {...props} />}
          </div>
        );
      })}
    </div>
  );
}
