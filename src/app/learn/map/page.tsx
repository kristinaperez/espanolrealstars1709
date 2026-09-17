import type { Metadata } from "next";
import { AdaptationMap } from "@/components/learn/adaptation-map";

export const metadata: Metadata = {
  title: "Карта адаптации в Испании",
  description:
    "Уникальная карта адаптации: от заселения в квартиру и заказа кофе до собеседования и ощущения «я дома» в Испании.",
  alternates: { canonical: "/learn/map" },
};

export default function MapPage() {
  return <AdaptationMap />;
}
