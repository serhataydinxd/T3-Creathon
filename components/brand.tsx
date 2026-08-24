import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="İMKÂN ana sayfa">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>İMKÂN</span>
    </Link>
  );
}
