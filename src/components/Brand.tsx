import Link from "next/link";

export function BrandMark({ href = "/" }: { href?: string }) {
  return (
    <Link className="site-logo" href={href}>
      info<span className="brand-cs">cs</span>
    </Link>
  );
}

export function BrandText() {
  return (
    <>
      info<span className="brand-cs">cs</span>
    </>
  );
}
