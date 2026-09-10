"use client";

import { useEffect, useState } from "react";
import { vendorFieldsFromAd } from "@/lib/ad-vendors";
import type { AdVendor } from "@/lib/types";

export type VendorPickFields = {
  vendorId: string;
  vendorName: string;
  vendorPhone: string;
  vendorWebsite: string;
  vendorKakao: string;
  youtubeUrl1: string;
  youtubeUrl2: string;
  vendorBizNo: string;
  vendorAddress: string;
};

export function VendorPicker({
  onPick,
  label = "업체선택",
}: {
  onPick: (fields: VendorPickFields) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [vendors, setVendors] = useState<AdVendor[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/ad-vendors")
      .then((res) => res.json())
      .then((data) => {
        setVendors(Array.isArray(data.vendors) ? data.vendors : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function pick(vendor: AdVendor) {
    onPick(vendorFieldsFromAd(vendor));
    setOpen(false);
  }

  return (
    <div className="vendor-picker">
      <button className="btn btn-ghost" type="button" onClick={() => setOpen((value) => !value)}>
        {label}
      </button>
      {open ? (
        <div className="vendor-picker-menu">
          {!loaded ? (
            <p>불러오는 중…</p>
          ) : vendors.length === 0 ? (
            <p>
              저장된 업체가 없습니다. 왼쪽 메뉴 <b>광고업체정보설정</b>에서 먼저 등록하세요.
            </p>
          ) : (
            vendors.map((vendor) => (
              <button key={vendor.id} type="button" onClick={() => pick(vendor)}>
                {vendor.name}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
